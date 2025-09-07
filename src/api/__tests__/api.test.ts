import request from 'supertest';
import app from '../../../api/index';

jest.mock('../../connectors/harvest.connector', () => ({
  HarvestConnector: jest.fn().mockImplementation(() => ({
    getTimeEntries: jest.fn().mockResolvedValue([
      { entryId: '1', date: new Date(), hours: 1, billableFlag: true, notes: 'test' },
    ]),
  })),
}));

jest.mock('../../connectors/hubspot.connector', () => ({
  HubSpotConnector: jest.fn().mockImplementation(() => ({
    syncRevenueData: jest.fn().mockResolvedValue({ success: true, recordsProcessed: 2 }),
  })),
}));

jest.mock('../../connectors/sft.connector', () => ({
  SFTConnector: jest.fn().mockImplementation(() => ({
    getMonthlyRevenue: jest.fn().mockResolvedValue([
      { month: '2024-01', recognisedRevenue: 100 },
    ]),
  })),
}));

const mockClient = {
  query: jest.fn().mockResolvedValue({}),
  release: jest.fn(),
};

jest.mock('../../models/database', () => ({
  getClient: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn(),
}));

describe('API endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
