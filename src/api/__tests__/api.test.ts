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
});
