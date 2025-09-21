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
import { executeWithRetry } from './retry';
import { ThrottlingError } from '../errors/ThrottlingError';

export class HarvestConnector {
  private client: AxiosInstance;
  private accountId: string;

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
        const response = await executeWithRetry(
          () =>
            this.client.get('/time_entries', {
              params: { ...params, page },
            }),
          { context: 'HarvestConnector.getTimeEntries' }
        );

        const entries = response.data.time_entries.map(this.mapTimeEntry);
        allEntries.push(...entries);

        page = response.data.next_page;
      }

      return allEntries;
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.getTimeEntries',
          fromDate,
          toDate,
          clientId,
          projectId,
        });
      }
      throw error;
    }
  }

  async getProjects(isActive = true): Promise<HarvestProject[]> {
    try {
      const projects: HarvestProject[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await executeWithRetry(
          () =>
            this.client.get('/projects', {
              params: { is_active: isActive, per_page: 100, page },
            }),
          { context: 'HarvestConnector.getProjects' }
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
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.getProjects',
          isActive,
        });
      }
      throw error;
    }
  }

  async getClients(isActive = true): Promise<HarvestClient[]> {
    try {
      const clients: HarvestClient[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await executeWithRetry(
          () =>
            this.client.get('/clients', {
              params: { is_active: isActive, per_page: 100, page },
            }),
          { context: 'HarvestConnector.getClients' }
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
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.getClients',
          isActive,
        });
      }
      throw error;
    }
  }

  async getTasks(): Promise<HarvestTask[]> {
    try {
      const tasks: HarvestTask[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await executeWithRetry(
          () =>
            this.client.get('/tasks', {
              params: { per_page: 100, page },
            }),
          { context: 'HarvestConnector.getTasks' }
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
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.getTasks',
        });
      }
      throw error;
    }
  }

  async getUsers(isActive = true): Promise<HarvestUser[]> {
    try {
      const users: HarvestUser[] = [];
      let page: number | null = 1;

      while (page !== null) {
        const response = await executeWithRetry(
          () =>
            this.client.get('/users', {
              params: { is_active: isActive, per_page: 100, page },
            }),
          { context: 'HarvestConnector.getUsers' }
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
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.getUsers',
          isActive,
        });
      }
      throw error;
    }
  }

  async getProjectBudget(projectId: string): Promise<{
    budget: number;
    budgetBy: string;
    budgetIsMonthly: boolean;
  }> {
    try {
      const response = await executeWithRetry(
        () => this.client.get(`/projects/${projectId}`),
        { context: 'HarvestConnector.getProjectBudget' }
      );
      return {
        budget: response.data.project.budget,
        budgetBy: response.data.project.budget_by,
        budgetIsMonthly: response.data.project.budget_is_monthly,
      };
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.getProjectBudget',
          projectId,
        });
      }
      throw error;
    }
  }

  async getCurrentMonthEntries(clientId?: string): Promise<HarvestTimeEntry[]> {
    const now = new Date();
    const fromDate = startOfMonth(now);
    const toDate = endOfMonth(now);
    return this.getTimeEntries(fromDate, toDate, clientId);
  }

  private mapTimeEntry(entry: HarvestTimeEntryApiResponse): HarvestTimeEntry {
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
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await executeWithRetry(
        () => this.client.get('/company'),
        { context: 'HarvestConnector.testConnection' }
      );
      return true;
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HarvestConnector.testConnection',
        });
      }
      return false;
    }
  }
}
