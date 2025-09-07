import { ExceptionEngine } from '../exception.engine';
import { query } from '../../models/database';
import { TimeEntryRecord } from '../../types';

jest.mock('../../models/database', () => ({
  query: jest.fn(),
}));

describe('budget_breach rule', () => {
  const entry: TimeEntryRecord = {
    id: '1',
    person_id: 'person1',
    client_id: 'client1',
    project_id: 'project1',
    task_id: 'task1',
    date: new Date('2023-01-01'),
    hours: 1,
    billable_rate: 100,
    cost_rate: 50,
    billable_flag: true,
    task_name: 'Task',
  };

  beforeEach(() => {
    (query as jest.Mock).mockReset();
  });

  it('defaults null total_cost to 0', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ category: 'billable', default_billable: true }] })
      .mockResolvedValueOnce({ rows: [{ budget: 1000, budget_hours: '100', total_hours: '95', total_cost: null }] })
      .mockResolvedValueOnce({ rows: [{ is_active: true, name: 'Task' }] });

    const engine = new ExceptionEngine();
    const exceptions = await engine.detectExceptions([entry]);

    expect(exceptions).toHaveLength(1);
    expect(exceptions[0].metadata).toMatchObject({
      totalCost: 0,
      totalHours: 95,
    });
  });

  it('handles null total_hours gracefully', async () => {
    (query as jest.Mock)
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ category: 'billable', default_billable: true }] })
      .mockResolvedValueOnce({ rows: [{ budget: 1000, budget_hours: '100', total_hours: null, total_cost: '1000' }] })
      .mockResolvedValueOnce({ rows: [{ is_active: true, name: 'Task' }] });

    const engine = new ExceptionEngine();
    const exceptions = await engine.detectExceptions([entry]);

    expect(exceptions).toHaveLength(0);
  });
});
