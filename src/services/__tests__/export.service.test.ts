import { ExportService } from '../export.service';
import { InvoiceExport } from '../../types';
import { query } from '../../models/database';

jest.mock('../../models/database', () => ({
  query: jest.fn(),
}));

describe('ExportService', () => {
  const service = new ExportService();
  const mockQuery = query as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('generateInvoiceExport builds invoice data', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ task_name: 'Design', total_hours: '5', avg_rate: '50', total_amount: '250', notes: 'Work' }] })
      .mockResolvedValueOnce({ rows: [{ task_name: 'Internal', total_hours: '2', total_cost: '100' }] })
      .mockResolvedValueOnce({ rows: [{ has_subscription_coverage: true }] })
      .mockResolvedValueOnce({ rows: [{ client_name: 'Client A', project_name: 'Project X' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.generateInvoiceExport(
      'c1',
      'p1',
      new Date('2023-01-01'),
      new Date('2023-01-31'),
      'user1'
    );

    expect(result.client).toBe('Client A');
    expect(result.billableLines[0]).toEqual({
      task: 'Design',
      hours: 5,
      rate: 50,
      amount: 250,
      notes: 'Work',
    });
    expect(mockQuery).toHaveBeenCalledTimes(5);
  });

  it('exportToCSV includes summary information', async () => {
    const exportData: InvoiceExport = {
      client: 'Client',
      project: 'Project',
      period: '2023-01-01 to 2023-01-31',
      billableLines: [{ task: 'Design', hours: 5, rate: 50, amount: 250, notes: 'Work' }],
      exclusionsSummary: { totalHours: 0, totalCost: 0, coveredBySubscription: false, details: [] },
      totalBillable: 250,
      generatedAt: new Date(),
      generatedBy: 'user',
    };

    const csv = await service.exportToCSV(exportData);
    expect(csv).toContain('Invoice Summary');
    expect(csv).toContain('Client: Client');
  });
});
