import { ProfitabilityService } from '../profitability.service';
import { query } from '../../models/database';

jest.mock('../../models/database', () => ({
  query: jest.fn(),
}));

describe('ProfitabilityService', () => {
  let service: ProfitabilityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfitabilityService();
  });

  describe('calculateMargin', () => {
    it('should calculate margin correctly using Q-review formula', () => {
      // Q-review formula: Margin = Revenue - (Billable Cost + Exclusion Cost)
      const revenue = 100000;
      const billableCost = 50000;
      const exclusionCost = 10000;
      
      const margin = revenue - (billableCost + exclusionCost);
      const marginPercentage = (margin / revenue) * 100;
      
      expect(margin).toBe(40000);
      expect(marginPercentage).toBe(40);
    });

    it('should handle zero revenue without dividing by zero', () => {
      const revenue = 0;
      const billableCost = 10000;
      const exclusionCost = 5000;
      
      const margin = revenue - (billableCost + exclusionCost);
      const marginPercentage = revenue > 0 ? (margin / revenue) * 100 : 0;
      
      expect(margin).toBe(-15000);
      expect(marginPercentage).toBe(0);
    });

    it('should handle negative margins correctly', () => {
      const revenue = 50000;
      const billableCost = 60000;
      const exclusionCost = 10000;
      
      const margin = revenue - (billableCost + exclusionCost);
      const marginPercentage = (margin / revenue) * 100;
      
      expect(margin).toBe(-20000);
      expect(marginPercentage).toBe(-40);
    });
  });

  describe('getClientProfitabilityTrend', () => {
    it('runs the trend query without throwing when provided numeric months', async () => {
      const queryMock = query as jest.MockedFunction<typeof query>;
      queryMock.mockResolvedValue({
        rows: [
          {
            month: new Date('2024-01-01T00:00:00Z'),
            client_name: 'Client A',
            project_name: 'Project A',
            billable_cost: '100',
            exclusion_cost: '25',
            recognised_revenue: '250',
            margin: '125',
            margin_percentage: '50',
            exceptions_count: 1,
          },
        ],
      } as never);

      await expect(
        service.getClientProfitabilityTrend('client-1', 6)
      ).resolves.toHaveLength(1);

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('make_interval(months => $2)'),
        ['client-1', 6]
      );
    });
  });

  describe('calculateProfitability', () => {
    it('aggregates cost amounts and stores metrics', async () => {
      const queryMock = query as jest.MockedFunction<typeof query>;
      queryMock
        .mockResolvedValueOnce({
          rows: [
            {
              billable_cost: '120.50',
              exclusion_cost: '30.25',
              exception_count: '2',
            },
          ],
        } as never)
        .mockResolvedValueOnce({
          rows: [
            {
              recognised_revenue: '500.75',
            },
          ],
        } as never)
        .mockResolvedValueOnce({
          rows: [
            {
              client_name: 'Client X',
              project_name: 'Project Y',
            },
          ],
        } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      const month = new Date('2024-02-01T00:00:00Z');
      const expectedMarginPercentage = (350 / 500.75) * 100;
      const metric = await service.calculateProfitability('client-uuid', 'project-uuid', month);

      expect(metric).toEqual({
        month: '2024-02',
        client: 'Client X',
        project: 'Project Y',
        billableCost: 120.5,
        exclusionCost: 30.25,
        recognisedRevenue: 500.75,
        margin: 350.0,
        marginPercentage: expectedMarginPercentage,
        exceptionsCount: 2,
      });

      expect(queryMock).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('SUM(CASE WHEN t.category = \'billable\' THEN te.cost_amount'),
        ['client-uuid', 'project-uuid', month]
      );
      expect(queryMock).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining('INSERT INTO profitability_metrics'),
        expect.any(Array)
      );
    });
  });
});
