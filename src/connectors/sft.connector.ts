import axios from 'axios';
import { SFTRevenue } from '../types';

export class SFTConnector {
  private accessToken: string | null = null;

  async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.MS_CLIENT_ID || '',
          client_secret: process.env.MS_CLIENT_SECRET || '',
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
    } catch (error) {
      console.error('SFT authentication failed:', error);
      throw error;
    }
  }

  async getRecognisedRevenue(
    clientName: string,
    projectName: string,
    month: string
  ): Promise<SFTRevenue | null> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      // This would connect to the actual SFT SharePoint list
      // For now, returning mock structure
      const mockRevenue: SFTRevenue = {
        client: clientName,
        project: projectName,
        month: month,
        recognisedRevenue: 0,
      };

      // In production, this would query SharePoint:
      // const response = await axios.get(
      //   `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listId}/items`,
      //   {
      //     headers: {
      //       Authorization: `Bearer ${this.accessToken}`,
      //     },
      //     params: {
      //       $filter: `fields/ClientName eq '${clientName}' and fields/Month eq '${month}'`,
      //     },
      //   }
      // );

      return mockRevenue;
    } catch (error) {
      console.error('Error fetching SFT revenue:', error);
      return null;
    }
  }

  async getMonthlyRevenue(month: string): Promise<SFTRevenue[]> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    try {
      // Mock implementation - would query actual SharePoint list
      return [];
    } catch (error) {
      console.error('Error fetching monthly revenue:', error);
      return [];
    }
  }
}