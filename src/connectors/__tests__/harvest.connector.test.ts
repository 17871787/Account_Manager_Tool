import axios from 'axios';
import { HarvestConnector } from '../harvest.connector';
import { query } from '../../models/database';

jest.mock('axios');
jest.mock('../../models/database', () => ({
  query: jest.fn(),
}));

describe('HarvestConnector', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      HARVEST_ACCESS_TOKEN: 'token',
      HARVEST_ACCOUNT_ID: 'account',
    };
    (query as jest.MockedFunction<typeof query>).mockReset();
    (query as jest.MockedFunction<typeof query>).mockResolvedValue({ rows: [] } as never);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('testConnection returns true on success', async () => {
    const getMock = jest.fn().mockResolvedValue({ data: {} });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    await expect(connector.testConnection()).resolves.toBe(true);
    expect(getMock).toHaveBeenCalledWith('/company');
  });

  it('getTimeEntries accumulates paginated results', async () => {
    const getMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          time_entries: [
            {
              id: 1,
              spent_date: '2023-01-01',
              client: { name: 'Client 1' },
              project: { name: 'Project 1' },
              task: { name: 'Task 1' },
              notes: 'First entry',
              hours: 1,
              billable: true,
              is_locked: false,
              user: { first_name: 'John', last_name: 'Doe' },
              user_assignment: { role: 'Engineer' },
              billable_rate: 100,
              cost_rate: 50,
              external_reference: { id: 'ext-1' },
            },
          ],
          next_page: 2,
        },
      })
      .mockResolvedValueOnce({
        data: {
          time_entries: [
            {
              id: 2,
              spent_date: '2023-01-02',
              client: { name: 'Client 2' },
              project: { name: 'Project 2' },
              task: { name: 'Task 2' },
              notes: 'Second entry',
              hours: 2,
              billable: false,
              is_locked: true,
              user: { first_name: 'Jane', last_name: 'Smith' },
              user_assignment: { role: 'Designer' },
              billable_rate: 200,
              cost_rate: 75,
              external_reference: { id: 'ext-2' },
            },
          ],
          next_page: null,
        },
      });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    const from = new Date('2023-01-01');
    const to = new Date('2023-01-31');

    (query as jest.MockedFunction<typeof query>).mockResolvedValue({ rows: [] } as never);

    const entries = await connector.getTimeEntries(from, to);

    expect(entries).toHaveLength(2);
    expect(entries[0].entryId).toBe('1');
    expect(entries[1].entryId).toBe('2');
    expect(getMock).toHaveBeenNthCalledWith(1, '/time_entries', {
      params: {
        from: '2023-01-01',
        to: '2023-01-31',
        per_page: 100,
        page: 1,
      },
    });
    expect(getMock).toHaveBeenNthCalledWith(2, '/time_entries', {
      params: {
        from: '2023-01-01',
        to: '2023-01-31',
        per_page: 100,
        page: 2,
      },
    });
  });

  it('getProjects accumulates paginated results', async () => {
    const getMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          projects: [{ id: 1, name: 'Project 1', code: 'P1', client: { id: 11 }, is_active: true }],
          next_page: 2,
        },
      })
      .mockResolvedValueOnce({
        data: {
          projects: [{ id: 2, name: 'Project 2', code: 'P2', client_id: 22, is_active: false }],
          next_page: null,
        },
      });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    const projects = await connector.getProjects();

    expect(projects).toEqual([
      { id: 1, name: 'Project 1', code: 'P1', clientId: 11, isActive: true },
      { id: 2, name: 'Project 2', code: 'P2', clientId: 22, isActive: false },
    ]);
    expect(getMock).toHaveBeenNthCalledWith(1, '/projects', {
      params: { is_active: true, per_page: 100, page: 1 },
    });
    expect(getMock).toHaveBeenNthCalledWith(2, '/projects', {
      params: { is_active: true, per_page: 100, page: 2 },
    });
  });

  it('getClients accumulates paginated results', async () => {
    const getMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          clients: [{ id: 1, name: 'Client 1', is_active: true }],
          next_page: 3,
        },
      })
      .mockResolvedValueOnce({
        data: {
          clients: [{ id: 2, name: 'Client 2', is_active: false }],
          next_page: null,
        },
      });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    const clients = await connector.getClients();

    expect(clients).toEqual([
      { id: 1, name: 'Client 1', isActive: true },
      { id: 2, name: 'Client 2', isActive: false },
    ]);
    expect(getMock).toHaveBeenNthCalledWith(1, '/clients', {
      params: { is_active: true, per_page: 100, page: 1 },
    });
    expect(getMock).toHaveBeenNthCalledWith(2, '/clients', {
      params: { is_active: true, per_page: 100, page: 3 },
    });
  });

  it('getTasks accumulates paginated results', async () => {
    const getMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          tasks: [
            {
              id: 1,
              name: 'Task 1',
              billable_by_default: true,
              default_hourly_rate: 100,
              is_active: true,
            },
          ],
          next_page: 2,
        },
      })
      .mockResolvedValueOnce({
        data: {
          tasks: [
            {
              id: 2,
              name: 'Task 2',
              billable_by_default: false,
              default_hourly_rate: 200,
              is_active: false,
            },
          ],
          next_page: null,
        },
      });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    const tasks = await connector.getTasks();

    expect(tasks).toEqual([
      {
        id: 1,
        name: 'Task 1',
        billableByDefault: true,
        defaultHourlyRate: 100,
        isActive: true,
      },
      {
        id: 2,
        name: 'Task 2',
        billableByDefault: false,
        defaultHourlyRate: 200,
        isActive: false,
      },
    ]);
    expect(getMock).toHaveBeenNthCalledWith(1, '/tasks', {
      params: { per_page: 100, page: 1 },
    });
    expect(getMock).toHaveBeenNthCalledWith(2, '/tasks', {
      params: { per_page: 100, page: 2 },
    });
  });

  it('getUsers accumulates paginated results', async () => {
    const getMock = jest
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 1,
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com',
              is_active: true,
            },
          ],
          next_page: 5,
        },
      })
      .mockResolvedValueOnce({
        data: {
          users: [
            {
              id: 2,
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane@example.com',
              is_active: false,
            },
          ],
          next_page: null,
        },
      });
    (axios.create as jest.Mock).mockReturnValue({ get: getMock });

    const connector = new HarvestConnector();
    const users = await connector.getUsers();

    expect(users).toEqual([
      {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        isActive: true,
      },
      {
        id: 2,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        isActive: false,
      },
    ]);
    expect(getMock).toHaveBeenNthCalledWith(1, '/users', {
      params: { is_active: true, per_page: 100, page: 1 },
    });
    expect(getMock).toHaveBeenNthCalledWith(2, '/users', {
      params: { is_active: true, per_page: 100, page: 5 },
    });
  });

  it('throws an error when HARVEST_ACCESS_TOKEN is missing', () => {
    delete process.env.HARVEST_ACCESS_TOKEN;
    expect(() => new HarvestConnector()).toThrow('HARVEST_ACCESS_TOKEN is not set');
  });

  it('throws an error when HARVEST_ACCOUNT_ID is missing', () => {
    delete process.env.HARVEST_ACCOUNT_ID;
    expect(() => new HarvestConnector()).toThrow('HARVEST_ACCOUNT_ID is not set');
  });
});

