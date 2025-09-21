jest.mock('../../models/database', () => ({
  query: jest.fn()
}));

import { ProfitabilityService } from '../profitability.service';
import * as db from '../../models/database';

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;
  const queryMock = db.query as jest.MockedFunction<typeof db.query>;

  beforeEach(() => {
    service = new ProfitabilityService();
  });

  describe('calculateProfitability', () => {
    it('should calculate profitability correctly', async () => {
      queryMock.mockImplementation((sql: string) => {
        if (sql.includes('time_entries')) {
          return Promise.resolve({
            rows: [{
              billable_cost: '50000',
              exclusion_cost: '10000',
              exception_count: '2'
            }]
          });
        }
        if (sql.includes('sft_revenue')) {
          return Promise.resolve({
            rows: [{
              recognised_revenue: 100000
            }]
          });
        }
        if (sql.includes('clients')) {
          return Promise.resolve({
            rows: [{
              client_name: 'Test Client',
              project_name: 'Test Project'
            }]
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const result = await service.calculateProfitability(
        'client-id',
        'project-id',
        new Date('2024-01-01')
      );

      expect(result).toMatchObject({
        month: '2024-01',
        client: 'Test Client',
        project: 'Test Project',
        billableCost: 50000,
        exclusionCost: 10000,
        recognisedRevenue: 100000,
        margin: 40000,
        marginPercentage: 40,
        exceptionsCount: 2
      });
    });

    it('should handle zero revenue gracefully', async () => {
      queryMock.mockImplementation(() => Promise.resolve({
        rows: [{
          billable_cost: '10000',
          exclusion_cost: '5000',
          exception_count: '0',
          recognised_revenue: 0,
          client_name: 'Test Client',
          project_name: 'Test Project'
        }]
      }));

      const result = await service.calculateProfitability(
        'client-id',
        'project-id',
        new Date('2024-01-01')
      );

      expect(result.marginPercentage).toBe(0);
      expect(result.margin).toBe(-15000);
    });

    it('should throw when client or project names are missing', async () => {
      querySpy.mockImplementation((sql: string) => {
        if (sql.includes('time_entries')) {
          return Promise.resolve({
            rows: [{
              billable_cost: '10000',
              exclusion_cost: '2000',
              exception_count: '1'
            }]
          });
        }

        if (sql.includes('sft_revenue')) {
          return Promise.resolve({
            rows: [{ recognised_revenue: '15000' }]
          });
        }

        if (sql.includes('clients')) {
          return Promise.resolve({ rows: [] });
        }

        return Promise.resolve({ rows: [] });
      });

      await expect(
        service.calculateProfitability('client-id', 'project-id', new Date('2024-01-01'))
      ).rejects.toMatchObject({
        message: 'Client or project not found',
        status: 404
      });
    });
  });

  describe('getClientProfitabilityTrend', () => {
    it('should query profitability metrics within the requested interval', async () => {
      const mockRows = [
        {
          month: new Date('2024-03-01'),
          client_name: 'Client A',
          project_name: 'Project A',
          billable_cost: '1000',
          exclusion_cost: '100',
          recognised_revenue: '2000',
          margin: '900',
          margin_percentage: '45',
          exceptions_count: 1
        }
      ];

      queryMock.mockResolvedValue({ rows: mockRows });

      const result = await service.getClientProfitabilityTrend('client-id', 3);

      expect(queryMock).toHaveBeenCalledTimes(1);
      const [sql, params] = queryMock.mock.calls[0];
      expect(sql).toContain('$2::interval');
      expect(params).toEqual(['client-id', '3 months']);
      expect(result).toEqual([
        {
          month: '2024-03',
          client: 'Client A',
          project: 'Project A',
          billableCost: 1000,
          exclusionCost: 100,
          recognisedRevenue: 2000,
          margin: 900,
          marginPercentage: 45,
          exceptionsCount: 1
        }
      ]);
    });
  });

  describe('backTestAccuracy', () => {
    it('should validate margin within tolerance', async () => {
      queryMock.mockImplementation(() => Promise.resolve({
        rows: [{
          billable_cost: '60000',
          exclusion_cost: '0',
          exception_count: '0',
          recognised_revenue: 100000,
          client_name: 'Test Client',
          project_name: 'Test Project'
        }]
      }));

      const result = await service.backTestAccuracy(
        'client-id',
        'project-id',
        new Date('2024-01-01'),
        40000
      );

      expect(result.variance).toBeLessThanOrEqual(1);
      expect(result.withinTolerance).toBe(true);
    });

    it('should return infinite variance when expected margin is 0', async () => {
      queryMock.mockImplementation(() => Promise.resolve({
        rows: [{
          billable_cost: '0',
          exclusion_cost: '0',
          exception_count: '0',
          recognised_revenue: 100000,
          client_name: 'Test Client',
          project_name: 'Test Project'
        }]
      }));

      const result = await service.backTestAccuracy(
        'client-id',
        'project-id',
        new Date('2024-01-01'),
        0
      );

      expect(result.variance).toBe(Infinity);
      expect(result.withinTolerance).toBe(false);
    });
  });
});
