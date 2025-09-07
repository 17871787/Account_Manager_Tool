import { ProfitabilityService } from '../profitability.service';
import { query } from '../../models/database';

// Mock the database module
jest.mock('../../models/database');

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;
  
  beforeEach(() => {
    service = new ProfitabilityService();
    jest.clearAllMocks();
  });

  describe('calculateProfitability', () => {
    it('should calculate profitability correctly', async () => {
      // Mock database responses
      (query as jest.Mock).mockImplementation((sql: string) => {
        if (sql.includes('time_entries')) {
          return {
            rows: [{
              billable_cost: '50000',
              exclusion_cost: '10000',
              exception_count: '2'
            }]
          };
        }
        if (sql.includes('sft_revenue')) {
          return {
            rows: [{
              recognised_revenue: 100000
            }]
          };
        }
        if (sql.includes('clients')) {
          return {
            rows: [{
              client_name: 'Test Client',
              project_name: 'Test Project'
            }]
          };
        }
        return { rows: [] };
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
      (query as jest.Mock).mockImplementation(() => ({
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
  });

  describe('backTestAccuracy', () => {
    it('should validate margin within tolerance', async () => {
      (query as jest.Mock).mockImplementation(() => ({
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
  });
});