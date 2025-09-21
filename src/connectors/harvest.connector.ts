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

export interface HarvestRetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface HarvestRetryMetrics {
  attempts: number;
  maxAttempts: number;
  totalDelayMs: number;
  lastDelayMs: number;
  lastStatusCode?: number;
}

export class HarvestRetryError extends Error {
  constructor(message: string, public readonly retry: HarvestRetryMetrics) {
    super(message);
    this.name = 'HarvestRetryError';
  }
}

const DEFAULT_RETRY_CONFIG: HarvestRetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
};

const parseEnvInt = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed;
};

export class HarvestConnector {
  private client: AxiosInstance;
  private accountId: string;
  private retryConfig: HarvestRetryConfig;

  constructor(config?: Partial<HarvestRetryConfig>) {
    const accessToken = process.env.HARVEST_ACCESS_TOKEN;
    const accountId = process.env.HARVEST_ACCOUNT_ID;

    if (!accessToken) {
      throw new Error('HARVEST_ACCESS_TOKEN is not set');
    }

    if (!accountId) {
      throw new Error('HARVEST_ACCOUNT_ID is not set');
    }

    this.accountId = accountId;

    const envConfigEntries = (
      [
        ['maxAttempts', process.env.HARVEST_RETRY_MAX_ATTEMPTS],
        ['baseDelayMs', process.env.HARVEST_RETRY_BASE_DELAY_MS],
        ['maxDelayMs', process.env.HARVEST_RETRY_MAX_DELAY_MS],
      ] as const
    )
      .map(([key, value]) => {
        const parsed = parseEnvInt(value);
        return parsed ? ([key, parsed] as const) : undefined;
      })
      .filter((entry): entry is readonly [keyof HarvestRetryConfig, number] => Boolean(entry));

    const envConfig = Object.fromEntries(envConfigEntries) as Partial<HarvestRetryConfig>;

    const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...envConfig, ...config };

    // Ensure base delay never exceeds max delay and attempts is at least 1
    this.retryConfig = {
      maxAttempts: Math.max(1, mergedConfig.maxAttempts),
      baseDelayMs: Math.max(1, Math.min(mergedConfig.baseDelayMs, mergedConfig.maxDelayMs)),
      maxDelayMs: Math.max(mergedConfig.baseDelayMs, mergedConfig.maxDelayMs),
    };

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
    projectId?: string,
    retryOverride?: Partial<HarvestRetryConfig>
  ): Promise<{ entries: HarvestTimeEntry[]; retry: HarvestRetryMetrics }> {
    try {
      const sanitizedOverride = retryOverride
        ? Object.fromEntries(
            Object.entries(retryOverride).filter(([, value]) => {
              return typeof value === 'number' && Number.isFinite(value) && value > 0;
            })
          )
        : {};

      const retryConfig: HarvestRetryConfig = {
        ...this.retryConfig,
        ...(sanitizedOverride as Partial<HarvestRetryConfig>),
      };

      const effectiveRetryConfig: HarvestRetryConfig = {
        maxAttempts: Math.max(1, retryConfig.maxAttempts),
        baseDelayMs: Math.max(1, Math.min(retryConfig.baseDelayMs, retryConfig.maxDelayMs)),
        maxDelayMs: Math.max(retryConfig.baseDelayMs, retryConfig.maxDelayMs),
      };

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

      let totalAttempts = 0;
      let totalDelayMs = 0;
      let lastDelayMs = 0;
      let lastStatusCode: number | undefined;

      const executeWithRetry = async () => {
        let attempt = 0;
        let delayMs = effectiveRetryConfig.baseDelayMs;

        // eslint-disable-next-line no-constant-condition
        while (true) {
          try {
            totalAttempts += 1;
            return await this.client.get('/time_entries', {
              params: { ...params, page },
            });
          } catch (error) {
            if (!axios.isAxiosError(error)) {
              throw error;
            }

            const status = error.response?.status;
            if (status !== 429 && status !== 503) {
              throw error;
            }

            lastStatusCode = status;
            attempt += 1;

            if (attempt >= effectiveRetryConfig.maxAttempts) {
              throw new HarvestRetryError('Harvest API retries exhausted', {
                attempts: totalAttempts,
                maxAttempts: effectiveRetryConfig.maxAttempts,
                totalDelayMs,
                lastDelayMs,
                lastStatusCode: status,
              });
            }

            const retryAfterHeader = error.response?.headers?.['retry-after'];
            const retryAfterMs = this.parseRetryAfter(retryAfterHeader);
            const waitMs = Math.min(
              effectiveRetryConfig.maxDelayMs,
              Math.max(delayMs, retryAfterMs ?? 0)
            );

            lastDelayMs = waitMs;
            totalDelayMs += waitMs;

            await this.delay(waitMs);

            delayMs = Math.min(delayMs * 2, effectiveRetryConfig.maxDelayMs);
          }
        }
      };

      while (hasMore) {
        const response = await executeWithRetry();

        const entries = response.data.time_entries.map(this.mapTimeEntry);
        allEntries = [...allEntries, ...entries];

        hasMore = response.data.next_page !== null;
        page++;
      }

      return {
        entries: allEntries,
        retry: {
          attempts: totalAttempts,
          maxAttempts: effectiveRetryConfig.maxAttempts,
          totalDelayMs,
          lastDelayMs,
          lastStatusCode,
        },
      };
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
      const response = await this.client.get('/projects', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        clientId: p.client?.id ?? p.client_id,
        isActive: p.is_active,
      }));
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
      const response = await this.client.get('/clients', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.clients.map((c: any) => ({
        id: c.id,
        name: c.name,
        isActive: c.is_active,
      }));
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
      const response = await this.client.get('/tasks', {
        params: { per_page: 100 },
      });
      return response.data.tasks.map((t: any) => ({
        id: t.id,
        name: t.name,
        billableByDefault: t.billable_by_default,
        defaultHourlyRate: t.default_hourly_rate,
        isActive: t.is_active,
      }));
    } catch (error) {
      captureException(error, {
        operation: 'HarvestConnector.getTasks',
      });
      throw error;
    }
  }

  async getUsers(isActive = true): Promise<HarvestUser[]> {
    try {
      const response = await this.client.get('/users', {
        params: { is_active: isActive, per_page: 100 },
      });
      return response.data.users.map((u: any) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        isActive: u.is_active,
      }));
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
    const result = await this.getTimeEntries(fromDate, toDate, clientId);
    return result.entries;
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
      await this.client.get('/company');
      return true;
    } catch (error) {
      captureException(error, {
        operation: 'HarvestConnector.testConnection',
      });
      return false;
    }
  }

  private async delay(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseRetryAfter(headerValue: unknown): number | undefined {
    if (typeof headerValue === 'number') {
      return headerValue * 1000;
    }

    if (typeof headerValue === 'string') {
      const numeric = Number.parseFloat(headerValue);
      if (!Number.isNaN(numeric)) {
        return numeric * 1000;
      }

      const date = Date.parse(headerValue);
      if (!Number.isNaN(date)) {
        const now = Date.now();
        return Math.max(0, date - now);
      }
    }

    return undefined;
  }
}
