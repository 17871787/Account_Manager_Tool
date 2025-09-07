import axios, { AxiosInstance } from 'axios';
import { HarvestTimeEntry } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';

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
      const params: Record<string, unknown> = {
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
        const response = await this.client.get('/time_entries', {
          params: { ...params, page },
        });

        const entries = response.data.time_entries.map(this.mapTimeEntry);
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

  async getProjects(isActive = true): Promise<unknown[]> {
    try {
      const response = await this.client.get('/projects', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.projects;
    } catch (error) {
      console.error('Error fetching Harvest projects:', error);
      throw error;
    }
  }

  async getClients(isActive = true): Promise<unknown[]> {
    try {
      const response = await this.client.get('/clients', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.clients;
    } catch (error) {
      console.error('Error fetching Harvest clients:', error);
      throw error;
    }
  }

  async getTasks(): Promise<unknown[]> {
    try {
      const response = await this.client.get('/tasks', {
        params: { per_page: 100 },
      });
      return response.data.tasks;
    } catch (error) {
      console.error('Error fetching Harvest tasks:', error);
      throw error;
    }
  }

  async getUsers(isActive = true): Promise<unknown[]> {
    try {
      const response = await this.client.get('/users', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.users;
    } catch (error) {
      console.error('Error fetching Harvest users:', error);
      throw error;
    }
  }

  async getProjectBudget(projectId: string): Promise<any> {
    try {
      const response = await this.client.get(`/projects/${projectId}`);
      return {
        budget: response.data.project.budget,
        budgetBy: response.data.project.budget_by,
        budgetIsMonthly: response.data.project.budget_is_monthly,
      };
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

  private mapTimeEntry(entry: any): HarvestTimeEntry {
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