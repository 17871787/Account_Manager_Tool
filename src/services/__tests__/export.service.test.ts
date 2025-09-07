import { ExportService } from '../export.service';
import { InvoiceExport } from '../../types';
import { pool } from '../../models/database';

describe('ExportService', () => {
  const service = new ExportService();
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    querySpy = jest.spyOn(pool, 'query');
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  it('generateInvoiceExport builds invoice data', async () => {
    querySpy
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
    expect(querySpy).toHaveBeenCalledTimes(5);
  });

  it('throws on database error', async () => {
    querySpy.mockRejectedValueOnce(new Error('db fail'));

    await expect(
      service.generateInvoiceExport(
        'c1',
        'p1',
        new Date('2023-01-01'),
        new Date('2023-01-31'),
        'user1'
      )
    ).rejects.toThrow('db fail');
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
