import axios, { AxiosInstance } from 'axios';
import { captureException } from '../utils/sentry';
import { executeWithRetry } from './retry';
import { ThrottlingError } from '../errors/ThrottlingError';

export interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    closedate: string;
    dealstage: string;
    pipeline: string;
    hs_arr: string;
    hs_mrr: string;
    hs_tcv: string;
    hs_acv: string;
  };
}

export interface HubSpotCompany {
  id: string;
  properties: {
    name: string;
    domain: string;
    industry: string;
    annualrevenue: string;
    numberofemployees: string;
    lifecyclestage: string;
  };
}

export class HubSpotConnector {
  private client: AxiosInstance;

  constructor() {
    const apiKey = process.env.HUBSPOT_API_KEY;

    if (!apiKey) {
      throw new Error('HUBSPOT_API_KEY is not set');
    }

    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getDeals(limit = 100): Promise<HubSpotDeal[]> {
    try {
      const response = await executeWithRetry(
        () =>
          this.client.get('/crm/v3/objects/deals', {
            params: {
              limit,
              properties:
                'dealname,amount,closedate,dealstage,pipeline,hs_arr,hs_mrr,hs_tcv,hs_acv',
            },
          }),
        { context: 'HubSpotConnector.getDeals' }
      );
      return response.data.results;
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HubSpotConnector.getDeals',
          limit,
        });
      }
      throw error;
    }
  }

  async getCompanies(limit = 100): Promise<HubSpotCompany[]> {
    try {
      const response = await executeWithRetry(
        () =>
          this.client.get('/crm/v3/objects/companies', {
            params: {
              limit,
              properties: 'name,domain,industry,annualrevenue,numberofemployees,lifecyclestage',
            },
          }),
        { context: 'HubSpotConnector.getCompanies' }
      );
      return response.data.results;
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HubSpotConnector.getCompanies',
          limit,
        });
      }
      throw error;
    }
  }

  async getDealsByCompany(companyId: string): Promise<HubSpotDeal[]> {
    try {
      const response = await executeWithRetry(
        () =>
          this.client.get(`/crm/v3/objects/companies/${companyId}/associations/deals`),
        { context: 'HubSpotConnector.getDealsByCompany' }
      );
      const dealIds = response.data.results.map((r: { id: string }) => r.id);
      
      if (dealIds.length === 0) return [];
      
      const dealsResponse = await executeWithRetry(
        () =>
          this.client.post('/crm/v3/objects/deals/batch/read', {
            inputs: dealIds.map((id: string) => ({ id })),
            properties: ['dealname', 'amount', 'closedate', 'dealstage', 'pipeline'],
          }),
        { context: 'HubSpotConnector.getDealsByCompany' }
      );

      return dealsResponse.data.results;
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HubSpotConnector.getDealsByCompany',
          companyId,
        });
      }
      throw error;
    }
  }

  async getRevenueMetrics(companyName: string): Promise<{
    companyName: string;
    annualRevenue: number;
    closedRevenue: number;
    pipelineValue: number;
    dealCount: number;
    closedDealCount: number;
  } | null> {
    try {
      // Search for company by name
      const searchResponse = await executeWithRetry(
        () =>
          this.client.post('/crm/v3/objects/companies/search', {
            filterGroups: [{
              filters: [{
                propertyName: 'name',
                operator: 'EQ',
                value: companyName,
              }],
            }],
            properties: ['name', 'annualrevenue'],
          }),
        { context: 'HubSpotConnector.getRevenueMetrics' }
      );

      if (searchResponse.data.results.length === 0) {
        return null;
      }

      const company = searchResponse.data.results[0];
      const deals = await this.getDealsByCompany(company.id);

      // Calculate revenue metrics
      const closedWonDeals = deals.filter(d => d.properties.dealstage === 'closedwon');
      const totalRevenue = closedWonDeals.reduce((sum, deal) => {
        return sum + (parseFloat(deal.properties.amount) || 0);
      }, 0);

      const activeDeals = deals.filter(d =>
        !['closedwon', 'closedlost'].includes(d.properties.dealstage)
      );
      const pipeline = activeDeals.reduce((sum, deal) => {
        return sum + (parseFloat(deal.properties.amount) || 0);
      }, 0);

      return {
        companyName: company.properties.name,
        annualRevenue: parseFloat(company.properties.annualrevenue) || 0,
        closedRevenue: totalRevenue,
        pipelineValue: pipeline,
        dealCount: deals.length,
        closedDealCount: closedWonDeals.length,
      };
    } catch (error) {
      if (error instanceof ThrottlingError) {
        throw error;
      }
      captureException(error, {
        operation: 'HubSpotConnector.getRevenueMetrics',
        companyName,
      });
      return null;
    }
  }

  async syncRevenueData(): Promise<{ success: boolean; recordsProcessed: number }> {
    try {
      const companies = await this.getCompanies();
      let processed = 0;

      for (const company of companies) {
        const metrics = await this.getRevenueMetrics(company.properties.name);
        if (metrics) {
          // Here you would store the metrics in your database
          // For now, just counting
          processed++;
        }
      }

      return {
        success: true,
        recordsProcessed: processed,
      };
    } catch (error) {
      if (error instanceof ThrottlingError) {
        throw error;
      }
      captureException(error, {
        operation: 'HubSpotConnector.syncRevenueData',
      });
      return {
        success: false,
        recordsProcessed: 0,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await executeWithRetry(
        () =>
          this.client.get('/crm/v3/objects/companies', {
            params: { limit: 1 },
          }),
        { context: 'HubSpotConnector.testConnection' }
      );
      return true;
    } catch (error) {
      if (!(error instanceof ThrottlingError)) {
        captureException(error, {
          operation: 'HubSpotConnector.testConnection',
        });
      }
      return false;
    }
  }
}
