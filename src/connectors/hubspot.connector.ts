import axios, { AxiosInstance } from 'axios';
import {
  HubSpotAssociation,
  HubSpotCompany,
  HubSpotDeal,
  RevenueMetrics,
  SyncResult,
} from '../types';

export class HubSpotConnector {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.hubapi.com',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getDeals(limit = 100): Promise<HubSpotDeal[]> {
    try {
      const response = await this.client.get<{ results: HubSpotDeal[] }>('/crm/v3/objects/deals', {
        params: {
          limit,
          properties: 'dealname,amount,closedate,dealstage,pipeline,hs_arr,hs_mrr,hs_tcv,hs_acv',
        },
      });
      return response.data.results;
    } catch (error) {
      console.error('Error fetching HubSpot deals:', error);
      throw error;
    }
  }

  async getCompanies(limit = 100): Promise<HubSpotCompany[]> {
    try {
      const response = await this.client.get<{ results: HubSpotCompany[] }>('/crm/v3/objects/companies', {
        params: {
          limit,
          properties: 'name,domain,industry,annualrevenue,numberofemployees,lifecyclestage',
        },
      });
      return response.data.results;
    } catch (error) {
      console.error('Error fetching HubSpot companies:', error);
      throw error;
    }
  }

  async getDealsByCompany(companyId: string): Promise<HubSpotDeal[]> {
    try {
      const response = await this.client.get<{ results: HubSpotAssociation[] }>(
        `/crm/v3/objects/companies/${companyId}/associations/deals`
      );
      const dealIds = response.data.results.map((r) => r.id);
      
      if (dealIds.length === 0) return [];
      
      const dealsResponse = await this.client.post<{ results: HubSpotDeal[] }>(
        '/crm/v3/objects/deals/batch/read',
        {
          inputs: dealIds.map((id) => ({ id })),
          properties: ['dealname', 'amount', 'closedate', 'dealstage', 'pipeline'],
        }
      );

      return dealsResponse.data.results;
    } catch (error) {
      console.error('Error fetching deals by company:', error);
      throw error;
    }
  }

  async getRevenueMetrics(companyName: string): Promise<RevenueMetrics | null> {
    try {
      const searchResponse = await this.client.post<{ results: HubSpotCompany[] }>(
        '/crm/v3/objects/companies/search',
        {
          filterGroups: [{
            filters: [{
              propertyName: 'name',
              operator: 'EQ',
              value: companyName,
            }],
          }],
          properties: ['name', 'annualrevenue'],
        }
      );

      if (searchResponse.data.results.length === 0) {
        return null;
      }

      const company = searchResponse.data.results[0]!;
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
      console.error('Error fetching revenue metrics:', error);
      return null;
    }
  }

  async syncRevenueData(): Promise<SyncResult> {
    try {
      const companies = await this.getCompanies();
      let processed = 0;

      for (const company of companies) {
        const metrics = await this.getRevenueMetrics(company.properties.name);
        if (metrics) {
          processed++;
        }
      }

      return {
        success: true,
        recordsProcessed: processed,
      };
    } catch (error) {
      console.error('HubSpot sync failed:', error);
      return {
        success: false,
        recordsProcessed: 0,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/crm/v3/objects/companies', {
        params: { limit: 1 },
      });
      return true;
    } catch (error) {
      console.error('HubSpot connection test failed:', error);
      return false;
    }
  }
}