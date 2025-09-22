/**
 * Real API Service to replace mock data
 * This service connects to actual backend endpoints with proper authentication
 */

import { fetchWithSession } from '../utils/fetchWithSession';

interface ApiConfig {
  baseUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

class ApiService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ApiConfig = {}) {
    this.baseUrl = config.baseUrl || process.env.NEXT_PUBLIC_API_URL || '';
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Add API key if provided
    const apiKey = config.apiKey || process.env.NEXT_PUBLIC_API_KEY;
    if (apiKey) {
      this.headers['x-api-key'] = apiKey;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetchWithSession(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`API request error for ${endpoint}:`, error);
      throw error;
    }
  }

  // Dashboard metrics
  async getDashboardMetrics(period?: string) {
    return this.request<any>('/api/metrics/dashboard', {
      method: 'GET',
      headers: period ? { 'x-period': period } : {},
    });
  }

  // Profitability data
  async getProfitabilityData(clientId?: string, month?: string) {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (month) params.append('month', month);

    return this.request<any>(`/api/profitability?${params.toString()}`);
  }

  async getPortfolioProfitability(month: string) {
    return this.request<any>(`/api/profitability/portfolio/${month}`);
  }

  // Time entries
  async getTimeEntries(fromDate: string, toDate: string, clientId?: string) {
    const params = new URLSearchParams({
      fromDate,
      toDate,
      ...(clientId && { clientId }),
    });

    return this.request<any>(`/api/time-entries?${params.toString()}`);
  }

  async getHarvestTimeEntries(fromDate: string, toDate: string, page?: number) {
    const params = new URLSearchParams({ from: fromDate, to: toDate });
    if (page) {
      params.append('page', page.toString());
    }
    return this.request<any>(`/api/harvest/time-entries?${params.toString()}`);
  }

  // Harvest sync
  async syncHarvest(fromDate: string, toDate: string, clientId?: string) {
    return this.request<any>('/api/sync/harvest', {
      method: 'POST',
      body: JSON.stringify({ fromDate, toDate, clientId }),
    });
  }

  // HubSpot sync
  async syncHubSpot() {
    return this.request<any>('/api/sync/hubspot', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  // SFT sync
  async syncSFT(month?: string) {
    return this.request<any>('/api/sync/sft', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  }

  // Clients
  async getClients(isActive = true) {
    return this.request<any>(`/api/clients?isActive=${isActive}`);
  }

  async getClient(id: string) {
    return this.request<any>(`/api/clients/${id}`);
  }

  // Projects
  async getProjects(clientId?: string, isActive = true) {
    const params = new URLSearchParams({
      isActive: isActive.toString(),
      ...(clientId && { clientId }),
    });

    return this.request<any>(`/api/projects?${params.toString()}`);
  }

  async getProject(id: string) {
    return this.request<any>(`/api/projects/${id}`);
  }

  // Exceptions
  async getExceptions(status?: string, clientId?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (clientId) params.append('clientId', clientId);

    return this.request<any>(`/api/exceptions?${params.toString()}`);
  }

  async getPendingExceptions(clientId?: string) {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    const query = params.toString();
    const suffix = query ? `?${query}` : '';
    return this.request<any>(`/api/exceptions/pending${suffix}`);
  }

  async updateException(id: string, data: any) {
    return this.request<any>(`/api/exceptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Budget tracking
  async getBudgetStatus(projectId: string, month?: string) {
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    return this.request<any>(`/api/projects/${projectId}/budget?${params.toString()}`);
  }

  // Revenue data
  async getRevenueData(clientId?: string, startMonth?: string, endMonth?: string) {
    const params = new URLSearchParams();
    if (clientId) params.append('clientId', clientId);
    if (startMonth) params.append('startMonth', startMonth);
    if (endMonth) params.append('endMonth', endMonth);

    return this.request<any>(`/api/revenue?${params.toString()}`);
  }

  // Health check
  async healthCheck() {
    return this.request<any>('/api/health');
  }
}

// Create singleton instance
export const apiService = new ApiService();

// Export class for custom instances
export default ApiService;