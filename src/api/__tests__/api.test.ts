import request from 'supertest';
import express from 'express';
import createApiRouter from '../routes';
import { setPool } from '../../models/database';
import { Pool, PoolClient } from 'pg';

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
} as unknown as PoolClient;

const mockPool = {
  connect: jest.fn(),
} as unknown as Pool;

describe('API endpoints', () => {
  let connectSpy: jest.SpyInstance;
  let app: express.Express;
  let harvestConnector: any;
  let hubspotConnector: any;
  let sftConnector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockReset().mockResolvedValue({ rows: [] });
    mockClient.release.mockReset();
    setPool(mockPool as unknown as Pool);
    connectSpy = jest.spyOn(mockPool, 'connect').mockResolvedValue(mockClient);

    harvestConnector = {
      getTimeEntries: jest.fn().mockResolvedValue([
        { entryId: '1', date: new Date(), hours: 1, billableFlag: true, notes: 'test' }
      ])
    } as any;
    hubspotConnector = {
      syncRevenueData: jest.fn().mockResolvedValue({ success: true, recordsProcessed: 2 })
    } as any;
    sftConnector = {
      getMonthlyRevenue: jest.fn().mockResolvedValue([
        { month: '2024-01', recognisedRevenue: 100 }
      ])
    } as any;

    app = express();
    app.use(express.json());
    app.use(
      '/api',
      createApiRouter({ harvestConnector, hubspotConnector, sftConnector })
    );
  });

  afterEach(() => {
    connectSpy.mockRestore();
  });

  it('responds to health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('syncs Harvest data', async () => {
    const res = await request(app)
      .post('/api/sync/harvest')
      .send({
        fromDate: new Date().toISOString(),
        toDate: new Date().toISOString(),
        clientId: '1',
      });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('harvest');
    expect(res.body.entriesProcessed).toBe(1);
  });

  it('chunks Harvest inserts to avoid parameter limit', async () => {
    const entries = Array.from({ length: 2500 }).map((_, i) => ({
      entryId: `${i}`,
      date: new Date(),
      hours: 1,
      billableFlag: true,
      notes: 'test',
    }));

    harvestConnector.getTimeEntries.mockResolvedValue(entries);

    const res = await request(app)
      .post('/api/sync/harvest')
      .send({
        fromDate: new Date().toISOString(),
        toDate: new Date().toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.entriesProcessed).toBe(entries.length);

    const insertCalls = mockClient.query.mock.calls.filter(
      ([query]) => typeof query === 'string' && query.includes('INSERT INTO time_entries')
    );

    expect(insertCalls).toHaveLength(Math.ceil(entries.length / 1000));

    insertCalls.forEach((call, index) => {
      const params = call[1] as unknown[];
      const expectedLength =
        index < Math.floor(entries.length / 1000)
          ? 1000 * 5
          : (entries.length % 1000) * 5;
      expect(params).toHaveLength(expectedLength);
    });
  });

  it('syncs HubSpot data', async () => {
    const res = await request(app).post('/api/sync/hubspot');
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('hubspot');
    expect(res.body.recordsProcessed).toBe(2);
  });

  it('syncs SFT data', async () => {
    const res = await request(app)
      .post('/api/sync/sft')
      .send({ month: '2024-01' });
    expect(res.status).toBe(200);
    expect(res.body.source).toBe('sft');
    expect(res.body.recordsProcessed).toBe(1);
  });

  it('handles database errors during Harvest sync', async () => {
    mockClient.query.mockRejectedValueOnce(new Error('db fail')).mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post('/api/sync/harvest')
      .send({
        fromDate: new Date().toISOString(),
        toDate: new Date().toISOString(),
        clientId: '1',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to sync Harvest data');
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('returns 500 if Harvest env vars missing', async () => {
    const { HARVEST_ACCESS_TOKEN, HARVEST_ACCOUNT_ID } = process.env;
    delete process.env.HARVEST_ACCESS_TOKEN;
    delete process.env.HARVEST_ACCOUNT_ID;

    const appLocal = express();
    appLocal.use(express.json());
    appLocal.use('/api', createApiRouter());

    const res = await request(appLocal)
      .post('/api/sync/harvest')
      .send({
        fromDate: new Date().toISOString(),
        toDate: new Date().toISOString(),
      });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/HARVEST/);

    if (HARVEST_ACCESS_TOKEN) {
      process.env.HARVEST_ACCESS_TOKEN = HARVEST_ACCESS_TOKEN;
    } else {
      delete process.env.HARVEST_ACCESS_TOKEN;
    }
    if (HARVEST_ACCOUNT_ID) {
      process.env.HARVEST_ACCOUNT_ID = HARVEST_ACCOUNT_ID;
    } else {
      delete process.env.HARVEST_ACCOUNT_ID;
    }
  });

  it('returns 500 if HubSpot env vars missing', async () => {
    const { HUBSPOT_API_KEY } = process.env;
    delete process.env.HUBSPOT_API_KEY;

    const appLocal = express();
    appLocal.use(express.json());
    appLocal.use('/api', createApiRouter());

    const res = await request(appLocal).post('/api/sync/hubspot');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/HUBSPOT_API_KEY/);

    if (HUBSPOT_API_KEY) {
      process.env.HUBSPOT_API_KEY = HUBSPOT_API_KEY;
    } else {
      delete process.env.HUBSPOT_API_KEY;
    }
  });

  it('returns 500 if SFT env vars missing', async () => {
    const { MS_TENANT_ID, MS_CLIENT_ID, MS_CLIENT_SECRET } = process.env;
    delete process.env.MS_TENANT_ID;
    delete process.env.MS_CLIENT_ID;
    delete process.env.MS_CLIENT_SECRET;

    const appLocal = express();
    appLocal.use(express.json());
    appLocal.use('/api', createApiRouter());

    const res = await request(appLocal)
      .post('/api/sync/sft')
      .send({ month: '2024-01' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/MS_TENANT_ID|MS_CLIENT_ID|MS_CLIENT_SECRET/);

    if (MS_TENANT_ID) {
      process.env.MS_TENANT_ID = MS_TENANT_ID;
    } else {
      delete process.env.MS_TENANT_ID;
    }
    if (MS_CLIENT_ID) {
      process.env.MS_CLIENT_ID = MS_CLIENT_ID;
    } else {
      delete process.env.MS_CLIENT_ID;
    }
    if (MS_CLIENT_SECRET) {
      process.env.MS_CLIENT_SECRET = MS_CLIENT_SECRET;
    } else {
      delete process.env.MS_CLIENT_SECRET;
    }
  });
});
