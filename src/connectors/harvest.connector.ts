import axios, { AxiosInstance } from 'axios';
import {
  HarvestTimeEntry,
  HarvestProject,
  HarvestClient,
  HarvestTask,
  HarvestUser,
  ProjectBudget,
} from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface TimeEntryQueryParams {
  from: string;
  to: string;
  per_page: number;
  client_id?: string;
  project_id?: string;
}

interface HarvestTimeEntryResponse {
  id: number;
  spent_date: string;
  client?: { name: string };
  project?: { name: string };
  task?: { name: string };
  notes?: string;
  hours: number;
  billable: boolean;
  is_locked: boolean;
  user?: { first_name: string; last_name: string };
  user_assignment?: { role: string };
  billable_rate?: number;
  cost_rate?: number;
  external_reference?: { id: string };
}

export class HarvestConnector {
  private client: AxiosInstance;
  private accountId: string;

  constructor() {
    this.accountId = process.env.HARVEST_ACCOUNT_ID || '';
    
    this.client = axios.create({
      baseURL: 'https://api.harvestapp.com/v2',
      headers: {
        'Harvest-Account-Id': this.accountId,
        'Authorization': `Bearer ${process.env.HARVEST_ACCESS_TOKEN}`,
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
      const params: TimeEntryQueryParams = {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd'),
        per_page: 100,
      };

      if (clientId) params.client_id = clientId;
      if (projectId) params.project_id = projectId;

      let allEntries: HarvestTimeEntry[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await this.client.get<{
          time_entries: HarvestTimeEntryResponse[];
          next_page: number | null;
        }>('/time_entries', {
          params: { ...params, page },
        });

        const entries = response.data.time_entries.map(e => this.mapTimeEntry(e));
        allEntries = [...allEntries, ...entries];

        hasMore = response.data.next_page !== null;
        page++;
      }

      return allEntries;
    } catch (error) {
      console.error('Error fetching Harvest time entries:', error);
      throw error;
    }
  }

  async getProjects(isActive = true): Promise<HarvestProject[]> {
    try {
      const response = await this.client.get<{ projects: HarvestProject[] }>('/projects', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.projects;
    } catch (error) {
      console.error('Error fetching Harvest projects:', error);
      throw error;
    }
  }

  async getClients(isActive = true): Promise<HarvestClient[]> {
    try {
      const response = await this.client.get<{ clients: HarvestClient[] }>('/clients', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.clients;
    } catch (error) {
      console.error('Error fetching Harvest clients:', error);
      throw error;
    }
  }

  async getTasks(): Promise<HarvestTask[]> {
    try {
      const response = await this.client.get<{ tasks: HarvestTask[] }>('/tasks', {
        params: { per_page: 100 },
      });
      return response.data.tasks;
    } catch (error) {
      console.error('Error fetching Harvest tasks:', error);
      throw error;
    }
  }

  async getUsers(isActive = true): Promise<HarvestUser[]> {
    try {
      const response = await this.client.get<{ users: HarvestUser[] }>('/users', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.users;
    } catch (error) {
      console.error('Error fetching Harvest users:', error);
      throw error;
    }
  }

  async getProjectBudget(projectId: string): Promise<ProjectBudget> {
    try {
      const response = await this.client.get<{ project: ProjectBudget }>(`/projects/${projectId}`);
      return response.data.project;
    } catch (error) {
      console.error('Error fetching project budget:', error);
      throw error;
    }
  }

  async getCurrentMonthEntries(clientId?: string): Promise<HarvestTimeEntry[]> {
    const now = new Date();
    const fromDate = startOfMonth(now);
    const toDate = endOfMonth(now);
    return this.getTimeEntries(fromDate, toDate, clientId);
  }

  private mapTimeEntry(entry: HarvestTimeEntryResponse): HarvestTimeEntry {
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
      await this.client.get('/company');
      return true;
    } catch (error) {
      console.error('Harvest connection test failed:', error);
      return false;
    }
  }
}