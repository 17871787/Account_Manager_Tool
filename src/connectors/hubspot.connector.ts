import axios, { AxiosInstance } from "axios";

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
    this.client = axios.create({
      baseURL: "https://api.hubapi.com",
      headers: {
        Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
  }

  async getDeals(limit = 100): Promise<HubSpotDeal[]> {
    try {
      const response = await this.client.get("/crm/v3/objects/deals", {
        params: {
          limit,
          properties:
            "dealname,amount,closedate,dealstage,pipeline,hs_arr,hs_mrr,hs_tcv,hs_acv",
        },
      });
      return response.data.results;
    } catch (error) {
      console.error("Error fetching HubSpot deals:", error);
      throw error;
    }
  }

  async getCompanies(limit = 100): Promise<HubSpotCompany[]> {
    try {
      const response = await this.client.get("/crm/v3/objects/companies", {
        params: {
          limit,
          properties:
            "name,domain,industry,annualrevenue,numberofemployees,lifecyclestage",
        },
      });
      return response.data.results;
    } catch (error) {
      console.error("Error fetching HubSpot companies:", error);
      throw error;
    }
  }

  async getDealsByCompany(companyId: string): Promise<HubSpotDeal[]> {
    try {
      const response = await this.client.get(
        `/crm/v3/objects/companies/${companyId}/associations/deals`,
      );
      const dealIds = response.data.results.map((r: any) => r.id);

      if (dealIds.length === 0) return [];

      const dealsResponse = await this.client.post(
        "/crm/v3/objects/deals/batch/read",
        {
          inputs: dealIds.map((id: string) => ({ id })),
          properties: [
            "dealname",
            "amount",
            "closedate",
            "dealstage",
            "pipeline",
          ],
        },
      );

      return dealsResponse.data.results;
    } catch (error) {
      console.error("Error fetching deals by company:", error);
      throw error;
    }
  }

  async getRevenueMetrics(companyName: string): Promise<any> {
    try {
      // Search for company by name
      const searchResponse = await this.client.post(
        "/crm/v3/objects/companies/search",
        {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "name",
                  operator: "EQ",
                  value: companyName,
                },
              ],
            },
          ],
          properties: ["name", "annualrevenue"],
        },
      );

      if (searchResponse.data.results.length === 0) {
        return null;
      }

      const company = searchResponse.data.results[0];
      const deals = await this.getDealsByCompany(company.id);

      // Calculate revenue metrics
      const closedWonDeals = deals.filter(
        (d) => d.properties.dealstage === "closedwon",
      );
      const totalRevenue = closedWonDeals.reduce((sum, deal) => {
        return sum + (parseFloat(deal.properties.amount) || 0);
      }, 0);

      const activeDeals = deals.filter(
        (d) => !["closedwon", "closedlost"].includes(d.properties.dealstage),
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
      console.error("Error fetching revenue metrics:", error);
      return null;
    }
  }

  async syncRevenueData(): Promise<{
    success: boolean;
    recordsProcessed: number;
  }> {
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
      console.error("HubSpot sync failed:", error);
      return {
        success: false,
        recordsProcessed: 0,
      };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.get("/crm/v3/objects/companies", {
        params: { limit: 1 },
      });
      return true;
    } catch (error) {
      console.error("HubSpot connection test failed:", error);
      return false;
    }
  }
}
