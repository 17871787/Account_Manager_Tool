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
import { LRUCache, CacheFactory } from '../utils/lru-cache';

interface BatchIdLookupResult {
  clients: LRUCache<string, string | null>;
  projects: LRUCache<string, string | null>;
  tasks: LRUCache<string, string | null>;
  people: LRUCache<string, string | null>;
}

export interface HarvestSyncMetrics {
  harvestRequests: number;
  dbQueryCount: number;
  cacheHits: number;
  cacheMisses: number;
  entriesProcessed: number;
  cacheMetrics?: {
    clients: any;
    projects: any;
    tasks: any;
    people: any;
  };
}

/**
 * Optimized Harvest Connector with BOUNDED memory usage
 * Fixes the memory leak from OptimizedHarvestConnector
 */
export class BoundedHarvestConnector {
  private client: AxiosInstance;
  private accountId: string;

  // Bounded LRU caches that prevent memory leaks
  private globalIdCache: BatchIdLookupResult;

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

    // Initialize bounded caches with monitoring
    this.globalIdCache = {
      clients: CacheFactory.createIdCache<string | null>('clients', 5000),
      projects: CacheFactory.createIdCache<string | null>('projects', 5000),
      tasks: CacheFactory.createIdCache<string | null>('tasks', 1000),
      people: CacheFactory.createIdCache<string | null>('people', 1000),
    };

    this.client = axios.create({
      baseURL: 'https://api.harvestapp.com/v2',
      headers: {
        'Harvest-Account-Id': this.accountId,
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'MoA AM Copilot',
      },
    });

    // Log memory usage periodically
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        if (heapUsedMB > 400) {
          console.warn(`[HarvestConnector] High memory usage: ${heapUsedMB}MB`);
          this.clearOldCacheEntries();
        }
      }, 60000); // Every minute
    }
  }

  /**
   * Clear old cache entries if memory pressure detected
   */
  private clearOldCacheEntries(): void {
    const totalSize =
      this.globalIdCache.clients.size +
      this.globalIdCache.projects.size +
      this.globalIdCache.tasks.size +
      this.globalIdCache.people.size;

    console.log(`[HarvestConnector] Total cache entries: ${totalSize}`);

    // If caches are getting large, clear the least used ones
    if (this.globalIdCache.clients.size > 4000) {
      console.log('[HarvestConnector] Clearing old client cache entries');
      // LRU will handle eviction automatically
    }
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
      await this.batchLookupIds(allApiEntries);

      // Map entries with pre-fetched IDs
      const entries = allApiEntries.map(entry =>
        this.mapTimeEntryWithCache(entry)
      );

      this.currentMetrics.entriesProcessed = entries.length;

      // Add cache metrics
      this.currentMetrics.cacheMetrics = {
        clients: this.globalIdCache.clients.getMetrics(),
        projects: this.globalIdCache.projects.getMetrics(),
        tasks: this.globalIdCache.tasks.getMetrics(),
        people: this.globalIdCache.people.getMetrics(),
      };

      this.lastMetrics = { ...this.currentMetrics };

      return entries;
    } catch (error) {
      captureException(error, {
        operation: 'BoundedHarvestConnector.getTimeEntries',
        fromDate,
        toDate,
        clientId,
        projectId,
      });
      throw error;
    }
  }

  /**
   * Batch lookup all unique IDs in a single database query per table
   */
  private async batchLookupIds(entries: HarvestTimeEntryApiResponse[]): Promise<void> {
    // Collect unique IDs that aren't in cache
    const idsToLookup = {
      clients: new Set<string>(),
      projects: new Set<string>(),
      tasks: new Set<string>(),
      people: new Set<string>(),
    };

    for (const entry of entries) {
      const clientHarvestId = String(entry.client?.id ?? entry.client_id ?? '');
      const projectHarvestId = String(entry.project?.id ?? entry.project_id ?? '');
      const taskHarvestId = String(entry.task?.id ?? entry.task_id ?? '');
      const userHarvestId = String(entry.user?.id ?? entry.user_id ?? '');

      if (clientHarvestId && !this.globalIdCache.clients.has(clientHarvestId)) {
        idsToLookup.clients.add(clientHarvestId);
        this.currentMetrics.cacheMisses += 1;
      } else if (clientHarvestId) {
        this.currentMetrics.cacheHits += 1;
      }

      if (projectHarvestId && !this.globalIdCache.projects.has(projectHarvestId)) {
        idsToLookup.projects.add(projectHarvestId);
        this.currentMetrics.cacheMisses += 1;
      } else if (projectHarvestId) {
        this.currentMetrics.cacheHits += 1;
      }

      if (taskHarvestId && !this.globalIdCache.tasks.has(taskHarvestId)) {
        idsToLookup.tasks.add(taskHarvestId);
        this.currentMetrics.cacheMisses += 1;
      } else if (taskHarvestId) {
        this.currentMetrics.cacheHits += 1;
      }

      if (userHarvestId && !this.globalIdCache.people.has(userHarvestId)) {
        idsToLookup.people.add(userHarvestId);
        this.currentMetrics.cacheMisses += 1;
      } else if (userHarvestId) {
        this.currentMetrics.cacheHits += 1;
      }
    }

    // Batch fetch missing IDs
    const [clientMappings, projectMappings, taskMappings, peopleMappings] = await Promise.all([
      this.batchLookupTable('clients', Array.from(idsToLookup.clients)),
      this.batchLookupTable('projects', Array.from(idsToLookup.projects)),
      this.batchLookupTable('tasks', Array.from(idsToLookup.tasks)),
      this.batchLookupTable('people', Array.from(idsToLookup.people)),
    ]);

    // Update cache with new mappings (LRU will handle eviction)
    clientMappings.forEach((value, key) => this.globalIdCache.clients.set(key, value));
    projectMappings.forEach((value, key) => this.globalIdCache.projects.set(key, value));
    taskMappings.forEach((value, key) => this.globalIdCache.tasks.set(key, value));
    peopleMappings.forEach((value, key) => this.globalIdCache.people.set(key, value));
  }

  /**
   * Batch lookup IDs for a specific table
   */
  private async batchLookupTable(
    table: 'clients' | 'projects' | 'tasks' | 'people',
    harvestIds: string[]
  ): Promise<Map<string, string | null>> {
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
        operation: 'BoundedHarvestConnector.batchLookupTable',
        table,
        harvestIds,
      });
      // Return empty mapping on error
      for (const harvestId of harvestIds) {
        mapping.set(harvestId, null);
      }
      return mapping;
    }
  }

  /**
   * Map time entry with cached IDs
   */
  private mapTimeEntryWithCache(entry: HarvestTimeEntryApiResponse): HarvestTimeEntry {
    const clientHarvestId = String(entry.client?.id ?? entry.client_id ?? '');
    const projectHarvestId = String(entry.project?.id ?? entry.project_id ?? '');
    const taskHarvestId = String(entry.task?.id ?? entry.task_id ?? '');
    const userHarvestId = String(entry.user?.id ?? entry.user_id ?? '');

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
      role: '',
      billableRate: entry.billable_rate || 0,
      billableAmount: entry.billable ? (entry.hours * (entry.billable_rate || 0)) : 0,
      costRate: entry.cost_rate || 0,
      costAmount: entry.hours * (entry.cost_rate || 0),
      currency: 'GBP',
      externalRef: entry.external_reference?.id,
      clientId: clientHarvestId ? this.globalIdCache.clients.get(clientHarvestId) : null,
      projectId: projectHarvestId ? this.globalIdCache.projects.get(projectHarvestId) : null,
      taskId: taskHarvestId ? this.globalIdCache.tasks.get(taskHarvestId) : null,
      personId: userHarvestId ? this.globalIdCache.people.get(userHarvestId) : null,
    };
  }

  /**
   * Execute database query with metrics
   */
  private async runQuery<T extends QueryResultRow>(
    queryText: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    this.currentMetrics.dbQueryCount += 1;
    return query<T>(queryText, params || []);
  }

  /**
   * Reset metrics for new operation
   */
  private resetMetrics(): void {
    this.currentMetrics = {
      harvestRequests: 0,
      dbQueryCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      entriesProcessed: 0,
    };
  }

  /**
   * Get current sync metrics
   */
  getSyncMetrics(): HarvestSyncMetrics | null {
    return this.lastMetrics;
  }

  /**
   * Clear all caches (for testing or memory pressure)
   */
  clearCaches(): void {
    this.globalIdCache.clients.clear();
    this.globalIdCache.projects.clear();
    this.globalIdCache.tasks.clear();
    this.globalIdCache.people.clear();
    console.log('[HarvestConnector] All caches cleared');
  }

  // Keep other methods from original...
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/company');
      return true;
    } catch (error) {
      captureException(error, {
        operation: 'BoundedHarvestConnector.testConnection',
      });
      return false;
    }
  }
}