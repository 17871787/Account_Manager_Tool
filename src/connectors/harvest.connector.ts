import axios, { AxiosInstance } from 'axios';
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

type HarvestIdCache = Map<string, string | null>;

export class HarvestConnector {
  private client: AxiosInstance;
  private accountId: string;
  private clientIdCache: HarvestIdCache = new Map();
  private projectIdCache: HarvestIdCache = new Map();
  private taskIdCache: HarvestIdCache = new Map();
  private personIdCache: HarvestIdCache = new Map();

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

  async getTimeEntries(
    fromDate: Date,
    toDate: Date,
    clientId?: string,
    projectId?: string
  ): Promise<HarvestTimeEntry[]> {
    try {
      const params: Record<string, unknown> = {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd'),
        per_page: 100,
      };

      if (clientId) params.client_id = clientId;
      if (projectId) params.project_id = projectId;

      const allEntries: HarvestTimeEntry[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await this.client.get('/time_entries', {
          params: { ...params, page },
        });

        const entries = await Promise.all(
          response.data.time_entries.map((entry: HarvestTimeEntryApiResponse) =>
            this.mapTimeEntry(entry)
          )
        );
        allEntries.push(...entries);

        page = response.data.next_page;
      }

      return allEntries;
    } catch (error) {
      captureException(error, {
        operation: 'HarvestConnector.getTimeEntries',
        fromDate,
        toDate,
        clientId,
        projectId,
      });
      throw error;
    }
  }

  async getProjects(isActive = true): Promise<HarvestProject[]> {
    try {
      const projects: HarvestProject[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await this.client.get('/projects', {
          params: { is_active: isActive, per_page: 100, page },
        });

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
        operation: 'HarvestConnector.getProjects',
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
        const response = await this.client.get('/clients', {
          params: { is_active: isActive, per_page: 100, page },
        });

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
        operation: 'HarvestConnector.getClients',
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
        const response = await this.client.get('/tasks', {
          params: { per_page: 100, page },
        });

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
        operation: 'HarvestConnector.getTasks',
      });
      throw error;
    }
  }

  async getUsers(isActive = true): Promise<HarvestUser[]> {
    try {
      const users: HarvestUser[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await this.client.get('/users', {
          params: { is_active: isActive, per_page: 100, page },
        });

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
        operation: 'HarvestConnector.getUsers',
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
      const response = await this.client.get(`/projects/${projectId}`);
      return {
        budget: response.data.project.budget,
        budgetBy: response.data.project.budget_by,
        budgetIsMonthly: response.data.project.budget_is_monthly,
      };
    } catch (error) {
      captureException(error, {
        operation: 'HarvestConnector.getProjectBudget',
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

  private async mapTimeEntry(entry: HarvestTimeEntryApiResponse): Promise<HarvestTimeEntry> {
    const [clientId, projectId, taskId, personId] = await Promise.all([
      this.resolveLocalId(
        'clients',
        entry.client?.id ?? entry.client_id,
        this.clientIdCache,
        'client'
      ),
      this.resolveLocalId(
        'projects',
        entry.project?.id ?? entry.project_id,
        this.projectIdCache,
        'project'
      ),
      this.resolveLocalId(
        'tasks',
        entry.task?.id ?? entry.task_id,
        this.taskIdCache,
        'task'
      ),
      this.resolveLocalId(
        'people',
        entry.user?.id ?? entry.user_id,
        this.personIdCache,
        'person'
      ),
    ]);

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
      clientId,
      projectId,
      taskId,
      personId,
    };
  }

  private async resolveLocalId(
    table: 'clients' | 'projects' | 'tasks' | 'people',
    harvestId: number | undefined,
    cache: HarvestIdCache,
    entity: string
  ): Promise<string | null> {
    if (!harvestId) {
      return null;
    }

    const key = String(harvestId);
    if (cache.has(key)) {
      return cache.get(key) ?? null;
    }

    try {
      const result = await query<{ id: string }>(
        `SELECT id FROM ${table} WHERE harvest_id = $1`,
        [key]
      );
      const localId = result.rows[0]?.id ?? null;
      cache.set(key, localId);
      return localId;
    } catch (error) {
      captureException(error, {
        operation: 'HarvestConnector.resolveLocalId',
        table,
        harvestId: key,
        entity,
      });
      cache.set(key, null);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/company');
      return true;
    } catch (error) {
      captureException(error, {
        operation: 'HarvestConnector.testConnection',
      });
      return false;
    }
  }
}
