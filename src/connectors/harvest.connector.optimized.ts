import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type { QueryResult, QueryResultRow } from 'pg';
import {
  HarvestTimeEntry,
  HarvestTimeEntryApiResponse,
  HarvestProject,
  HarvestClient,
  HarvestTask,
  HarvestUser,
} from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { captureException } from '../utils/sentry';
import { query } from '../models/database';

const DEFAULT_CACHE_MAX_SIZE = 5000;
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseTtlMilliseconds(value: string | undefined, fallbackMs: number): number | undefined {
  if (value === undefined || value === '') {
    return fallbackMs;
  }

  const parsedSeconds = Number.parseInt(value, 10);
  if (Number.isNaN(parsedSeconds)) {
    return fallbackMs;
  }

  if (parsedSeconds <= 0) {
    return undefined;
  }

  return parsedSeconds * 1000;
}

const HARVEST_CACHE_MAX_SIZE = parsePositiveInteger(
  process.env.HARVEST_CACHE_MAX_SIZE,
  DEFAULT_CACHE_MAX_SIZE
);

const HARVEST_CACHE_TTL_MS = parseTtlMilliseconds(
  process.env.HARVEST_CACHE_TTL_SECONDS,
  DEFAULT_CACHE_TTL_MS
);

export class BoundedLruMap<V> extends Map<string, V | null> {
  private readonly maxSize: number;
  private readonly ttlMs?: number;
  private readonly expiry = new Map<string, number>();

  constructor({ maxSize, ttlMs }: { maxSize: number; ttlMs?: number }) {
    super();
    this.maxSize = Math.max(1, maxSize);
    this.ttlMs = ttlMs && ttlMs > 0 ? ttlMs : undefined;
  }

  override get(key: string): V | null | undefined {
    if (!super.has(key)) {
      return undefined;
    }

    if (this.ttlMs) {
      const expiresAt = this.expiry.get(key);
      if (expiresAt && expiresAt <= Date.now()) {
        this.delete(key);
        return undefined;
      }
    }

    const value = super.get(key);
    if (value === undefined) {
      return undefined;
    }

    const expiresAt = this.ttlMs ? Date.now() + this.ttlMs : undefined;

    // Move key to the end to reflect recent use
    super.delete(key);
    this.expiry.delete(key);
    super.set(key, value);
    if (expiresAt) {
      this.expiry.set(key, expiresAt);
    }

    return value;
  }

  override has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  override set(key: string, value: V | null): this {
    if (super.has(key)) {
      super.delete(key);
      this.expiry.delete(key);
    }

    super.set(key, value);
    if (this.ttlMs) {
      this.expiry.set(key, Date.now() + this.ttlMs);
    }

    this.evict();
    return this;
  }

  override delete(key: string): boolean {
    this.expiry.delete(key);
    return super.delete(key);
  }

  private evict(): void {
    this.evictExpired();

    while (this.size > this.maxSize) {
      const oldestKey = this.keys().next().value;
      if (oldestKey === undefined) {
        break;
      }
      super.delete(oldestKey);
      this.expiry.delete(oldestKey);
    }
  }

  private evictExpired(): void {
    if (!this.ttlMs) {
      return;
    }

    const now = Date.now();
    for (const [key, expiresAt] of this.expiry.entries()) {
      if (expiresAt <= now) {
        super.delete(key);
        this.expiry.delete(key);
      }
    }
  }
}

type IdMapping = Map<string, string | null>;

interface BatchIdLookupResult {
  clients: IdMapping;
  projects: IdMapping;
  tasks: IdMapping;
  people: IdMapping;
}

export interface HarvestSyncMetrics {
  harvestRequests: number;
  dbQueryCount: number;
  cacheHits: number;
  cacheMisses: number;
  entriesProcessed: number;
}

export class OptimizedHarvestConnector {
  private client: AxiosInstance;
  private accountId: string;

  // Global cache that persists across requests
  private globalIdCache: {
    clients: IdMapping;
    projects: IdMapping;
    tasks: IdMapping;
    people: IdMapping;
  } = {
    clients: new BoundedLruMap({ maxSize: HARVEST_CACHE_MAX_SIZE, ttlMs: HARVEST_CACHE_TTL_MS }),
    projects: new BoundedLruMap({ maxSize: HARVEST_CACHE_MAX_SIZE, ttlMs: HARVEST_CACHE_TTL_MS }),
    tasks: new BoundedLruMap({ maxSize: HARVEST_CACHE_MAX_SIZE, ttlMs: HARVEST_CACHE_TTL_MS }),
    people: new BoundedLruMap({ maxSize: HARVEST_CACHE_MAX_SIZE, ttlMs: HARVEST_CACHE_TTL_MS }),
  };

  private currentMetrics: HarvestSyncMetrics = {
    harvestRequests: 0,
    dbQueryCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    entriesProcessed: 0,
  };

  private lastMetrics: HarvestSyncMetrics | null = null;

  constructor() {
    const accessToken = process.env.HARVEST_ACCESS_TOKEN;
    const accountId = process.env.HARVEST_ACCOUNT_ID;

    if (!accessToken) {
      throw new Error('HARVEST_ACCESS_TOKEN is not set');
    }

    if (!accountId) {
      throw new Error('HARVEST_ACCOUNT_ID is not set');
    }

    this.accountId = accountId;

    this.client = axios.create({
      baseURL: 'https://api.harvestapp.com/v2',
      headers: {
        'Harvest-Account-Id': this.accountId,
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'MoA AM Copilot',
      },
    });
  }

  /**
   * Optimized getTimeEntries that batches all ID lookups into single queries
   */
  async getTimeEntries(
    fromDate: Date,
    toDate: Date,
    clientId?: string,
    projectId?: string
  ): Promise<HarvestTimeEntry[]> {
    try {
      this.resetMetrics();
      const params: Record<string, unknown> = {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd'),
        per_page: 100,
      };

      if (clientId) params.client_id = clientId;
      if (projectId) params.project_id = projectId;

      const allApiEntries: HarvestTimeEntryApiResponse[] = [];
      let page: number | null = 1;

      // First, fetch all entries from Harvest API
      while (page !== null) {
        const response: AxiosResponse<{ time_entries: HarvestTimeEntryApiResponse[]; next_page: number | null }> =
          await this.client.get('/time_entries', {
            params: { ...params, page },
          });
        this.currentMetrics.harvestRequests += 1;

        allApiEntries.push(...response.data.time_entries);
        page = response.data.next_page;
      }

      // Now batch lookup all IDs at once
      const idLookups = await this.batchLookupIds(allApiEntries);

      // Map entries with pre-fetched IDs
      const entries = allApiEntries.map(entry =>
        this.mapTimeEntryWithCache(entry, idLookups)
      );

      this.currentMetrics.entriesProcessed = entries.length;
      this.lastMetrics = { ...this.currentMetrics };

      return entries;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.getTimeEntries',
        fromDate,
        toDate,
        clientId,
        projectId,
      });
      throw error;
    }
  }

  /**
   * Batch lookup all unique IDs in a single query per table
   */
  private async batchLookupIds(
    entries: HarvestTimeEntryApiResponse[]
  ): Promise<BatchIdLookupResult> {
    // Collect all unique Harvest IDs
    const uniqueIds = {
      clients: new Set<string>(),
      projects: new Set<string>(),
      tasks: new Set<string>(),
      people: new Set<string>(),
    };

    for (const entry of entries) {
      if (entry.client?.id ?? entry.client_id) {
        uniqueIds.clients.add(String(entry.client?.id ?? entry.client_id));
      }
      if (entry.project?.id ?? entry.project_id) {
        uniqueIds.projects.add(String(entry.project?.id ?? entry.project_id));
      }
      if (entry.task?.id ?? entry.task_id) {
        uniqueIds.tasks.add(String(entry.task?.id ?? entry.task_id));
      }
      if (entry.user?.id ?? entry.user_id) {
        uniqueIds.people.add(String(entry.user?.id ?? entry.user_id));
      }
    }

    // Filter out IDs we already have in cache
    const allClientIds = Array.from(uniqueIds.clients);
    const allProjectIds = Array.from(uniqueIds.projects);
    const allTaskIds = Array.from(uniqueIds.tasks);
    const allPeopleIds = Array.from(uniqueIds.people);

    const idsToLookup = {
      clients: allClientIds.filter(id => !this.globalIdCache.clients.has(id)),
      projects: allProjectIds.filter(id => !this.globalIdCache.projects.has(id)),
      tasks: allTaskIds.filter(id => !this.globalIdCache.tasks.has(id)),
      people: allPeopleIds.filter(id => !this.globalIdCache.people.has(id)),
    };

    this.currentMetrics.cacheHits +=
      allClientIds.length - idsToLookup.clients.length +
      allProjectIds.length - idsToLookup.projects.length +
      allTaskIds.length - idsToLookup.tasks.length +
      allPeopleIds.length - idsToLookup.people.length;

    this.currentMetrics.cacheMisses +=
      idsToLookup.clients.length +
      idsToLookup.projects.length +
      idsToLookup.tasks.length +
      idsToLookup.people.length;

    // Batch lookup missing IDs
    const [clientMappings, projectMappings, taskMappings, peopleMappings] = await Promise.all([
      this.batchLookupTable('clients', idsToLookup.clients),
      this.batchLookupTable('projects', idsToLookup.projects),
      this.batchLookupTable('tasks', idsToLookup.tasks),
      this.batchLookupTable('people', idsToLookup.people),
    ]);

    // Update global cache with new mappings
    clientMappings.forEach((value, key) => this.globalIdCache.clients.set(key, value));
    projectMappings.forEach((value, key) => this.globalIdCache.projects.set(key, value));
    taskMappings.forEach((value, key) => this.globalIdCache.tasks.set(key, value));
    peopleMappings.forEach((value, key) => this.globalIdCache.people.set(key, value));

    // Return combined cache (existing + new)
    return {
      clients: this.globalIdCache.clients,
      projects: this.globalIdCache.projects,
      tasks: this.globalIdCache.tasks,
      people: this.globalIdCache.people,
    };
  }

  /**
   * Batch lookup IDs for a specific table
   * Fetches all IDs in a single query using IN clause
   */
  private async batchLookupTable(
    table: 'clients' | 'projects' | 'tasks' | 'people',
    harvestIds: string[]
  ): Promise<IdMapping> {
    const mapping = new Map<string, string | null>();

    if (harvestIds.length === 0) {
      return mapping;
    }

    try {
      // Use parameterized query with ANY array for PostgreSQL
      const placeholders = harvestIds.map((_, index) => `$${index + 1}`).join(', ');
      const queryText = `SELECT id, harvest_id FROM ${table} WHERE harvest_id IN (${placeholders})`;

      const result = await this.runQuery<{ id: string; harvest_id: string }>(
        queryText,
        harvestIds
      );

      // Build mapping from results
      for (const row of result.rows) {
        mapping.set(row.harvest_id, row.id);
      }

      // Mark missing IDs as null
      for (const harvestId of harvestIds) {
        if (!mapping.has(harvestId)) {
          mapping.set(harvestId, null);
        }
      }

      return mapping;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.batchLookupTable',
        table,
        harvestIdCount: harvestIds.length,
      });

      // On error, mark all as null
      for (const harvestId of harvestIds) {
        mapping.set(harvestId, null);
      }

      return mapping;
    }
  }

  /**
   * Map time entry using pre-fetched ID cache
   */
  private mapTimeEntryWithCache(
    entry: HarvestTimeEntryApiResponse,
    idCache: BatchIdLookupResult
  ): HarvestTimeEntry {
    const clientHarvestId = String(entry.client?.id ?? entry.client_id ?? '');
    const projectHarvestId = String(entry.project?.id ?? entry.project_id ?? '');
    const taskHarvestId = String(entry.task?.id ?? entry.task_id ?? '');
    const personHarvestId = String(entry.user?.id ?? entry.user_id ?? '');

    return {
      entryId: entry.id.toString(),
      date: new Date(entry.spent_date),
      client: entry.client?.name || '',
      project: entry.project?.name || '',
      task: entry.task?.name || '',
      notes: entry.notes || '',
      hours: entry.hours,
      billableFlag: entry.billable,
      invoicedFlag: entry.is_locked,
      firstName: entry.user?.first_name || '',
      lastName: entry.user?.last_name || '',
      role: entry.user_assignment?.role || '',
      billableRate: entry.billable_rate || 0,
      billableAmount: entry.billable ? (entry.hours * (entry.billable_rate || 0)) : 0,
      costRate: entry.cost_rate || 0,
      costAmount: entry.hours * (entry.cost_rate || 0),
      currency: 'GBP',
      externalRef: entry.external_reference?.id,
      clientId: clientHarvestId ? idCache.clients.get(clientHarvestId) ?? null : null,
      projectId: projectHarvestId ? idCache.projects.get(projectHarvestId) ?? null : null,
      taskId: taskHarvestId ? idCache.tasks.get(taskHarvestId) ?? null : null,
      personId: personHarvestId ? idCache.people.get(personHarvestId) ?? null : null,
    };
  }

  // Preload cache with all known mappings for maximum efficiency
  async preloadCache(): Promise<void> {
    try {
      const [clients, projects, tasks, people] = await Promise.all([
        query<{ id: string; harvest_id: string }>('SELECT id, harvest_id FROM clients WHERE harvest_id IS NOT NULL'),
        query<{ id: string; harvest_id: string }>('SELECT id, harvest_id FROM projects WHERE harvest_id IS NOT NULL'),
        query<{ id: string; harvest_id: string }>('SELECT id, harvest_id FROM tasks WHERE harvest_id IS NOT NULL'),
        query<{ id: string; harvest_id: string }>('SELECT id, harvest_id FROM people WHERE harvest_id IS NOT NULL'),
      ]);

      // Populate global cache
      for (const row of clients.rows) {
        this.globalIdCache.clients.set(row.harvest_id, row.id);
      }
      for (const row of projects.rows) {
        this.globalIdCache.projects.set(row.harvest_id, row.id);
      }
      for (const row of tasks.rows) {
        this.globalIdCache.tasks.set(row.harvest_id, row.id);
      }
      for (const row of people.rows) {
        this.globalIdCache.people.set(row.harvest_id, row.id);
      }

      console.log(`Preloaded cache with ${clients.rows.length} clients, ${projects.rows.length} projects, ${tasks.rows.length} tasks, ${people.rows.length} people`);
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.preloadCache',
      });
      console.error('Failed to preload cache, will lazy-load as needed');
    }
  }

  // Keep existing methods for compatibility
  async getProjects(isActive = true): Promise<HarvestProject[]> {
    try {
      const projects: HarvestProject[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response: AxiosResponse<{ projects: any[]; next_page: number | null }> = await this.client.get(
          '/projects',
          {
            params: { is_active: isActive, per_page: 100, page },
          }
        );

        projects.push(
          ...response.data.projects.map((p: any) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            clientId: p.client?.id ?? p.client_id,
            isActive: p.is_active,
          }))
        );

        page = response.data.next_page;
      }

      return projects;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.getProjects',
        isActive,
      });
      throw error;
    }
  }

  async getClients(isActive = true): Promise<HarvestClient[]> {
    try {
      const clients: HarvestClient[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response: AxiosResponse<{ clients: any[]; next_page: number | null }> = await this.client.get(
          '/clients',
          {
            params: { is_active: isActive, per_page: 100, page },
          }
        );

        clients.push(
          ...response.data.clients.map((c: any) => ({
            id: c.id,
            name: c.name,
            isActive: c.is_active,
          }))
        );

        page = response.data.next_page;
      }

      return clients;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.getClients',
        isActive,
      });
      throw error;
    }
  }

  async getTasks(): Promise<HarvestTask[]> {
    try {
      const tasks: HarvestTask[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response: AxiosResponse<{ tasks: any[]; next_page: number | null }> = await this.client.get(
          '/tasks',
          {
            params: { per_page: 100, page },
          }
        );

        tasks.push(
          ...response.data.tasks.map((t: any) => ({
            id: t.id,
            name: t.name,
            billableByDefault: t.billable_by_default,
            defaultHourlyRate: t.default_hourly_rate,
            isActive: t.is_active,
          }))
        );

        page = response.data.next_page;
      }

      return tasks;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.getTasks',
      });
      throw error;
    }
  }

  async getUsers(isActive = true): Promise<HarvestUser[]> {
    try {
      const users: HarvestUser[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response: AxiosResponse<{ users: any[]; next_page: number | null }> = await this.client.get(
          '/users',
          {
            params: { is_active: isActive, per_page: 100, page },
          }
        );

        users.push(
          ...response.data.users.map((u: any) => ({
            id: u.id,
            firstName: u.first_name,
            lastName: u.last_name,
            email: u.email,
            isActive: u.is_active,
          }))
        );

        page = response.data.next_page;
      }

      return users;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.getUsers',
        isActive,
      });
      throw error;
    }
  }

  async getProjectBudget(projectId: string): Promise<{
    budget: number;
    budgetBy: string;
    budgetIsMonthly: boolean;
  }> {
    try {
      const response: AxiosResponse<{ project: any }> = await this.client.get(`/projects/${projectId}`);
      return {
        budget: response.data.project.budget,
        budgetBy: response.data.project.budget_by,
        budgetIsMonthly: response.data.project.budget_is_monthly,
      };
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.getProjectBudget',
        projectId,
      });
      throw error;
    }
  }

  async getCurrentMonthEntries(clientId?: string): Promise<HarvestTimeEntry[]> {
    const now = new Date();
    const fromDate = startOfMonth(now);
    const toDate = endOfMonth(now);
    return this.getTimeEntries(fromDate, toDate, clientId);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/company');
      return true;
    } catch (error) {
      captureException(error, {
        operation: 'OptimizedHarvestConnector.testConnection',
      });
      return false;
    }
  }

  getLastSyncMetrics(): HarvestSyncMetrics | null {
    return this.lastMetrics ? { ...this.lastMetrics } : null;
  }

  private resetMetrics(): void {
    this.currentMetrics = {
      harvestRequests: 0,
      dbQueryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      entriesProcessed: 0,
    };
  }

  private async runQuery<T extends QueryResultRow>(queryText: string, params: unknown[]): Promise<QueryResult<T>> {
    this.currentMetrics.dbQueryCount += 1;
    return query<T>(queryText, params);
  }
}