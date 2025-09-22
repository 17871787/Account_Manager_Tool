import { NextRequest } from 'next/server';
import { POST } from '../../sync/harvest/route';
import { BoundedHarvestConnector } from '../../../../src/connectors/harvest.connector.bounded';
import { getClient } from '../../../../src/models/database';

// Mock dependencies
jest.mock('../../../../src/connectors/harvest.connector.bounded');
jest.mock('../../../../src/models/database');
jest.mock('../../../../src/utils/sentry', () => ({
  captureException: jest.fn(),
}));

const MockedBoundedHarvestConnector = BoundedHarvestConnector as jest.MockedClass<typeof BoundedHarvestConnector>;
const mockedGetClient = getClient as jest.MockedFunction<typeof getClient>;

describe('Harvest Sync API Integration Tests', () => {
  let mockConnector: jest.Mocked<BoundedHarvestConnector>;
  let mockDbClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock database client
    mockDbClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    mockedGetClient.mockResolvedValue(mockDbClient);

    // Setup mock harvest connector
    mockConnector = {
      getTimeEntries: jest.fn(),
      getLastSyncMetrics: jest.fn(),
      preloadCache: jest.fn(),
    } as any;

    MockedBoundedHarvestConnector.mockImplementation(() => mockConnector);

    // Set required env vars
    process.env.HARVEST_ACCESS_TOKEN = 'test-token';
    process.env.HARVEST_ACCOUNT_ID = 'test-account';
  });

  afterEach(() => {
    delete process.env.HARVEST_ACCESS_TOKEN;
    delete process.env.HARVEST_ACCOUNT_ID;
  });

  describe('POST /api/sync/harvest', () => {
    it('should successfully sync harvest entries', async () => {
      const mockEntries = [
        {
          entryId: '123',
          date: new Date('2024-01-01'),
          hours: 8,
          billableFlag: true,
          notes: 'Test work',
          clientId: 'client-1',
          projectId: 'project-1',
          taskId: 'task-1',
          personId: 'person-1',
          billableAmount: 800,
          costAmount: 400,
        },
      ];

      const mockMetrics = {
        harvestRequests: 1,
        dbQueryCount: 4,
        cacheHits: 10,
        cacheMisses: 2,
        entriesProcessed: 1,
      };

      mockConnector.getTimeEntries.mockResolvedValue(mockEntries);
      mockConnector.getLastSyncMetrics.mockReturnValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/sync/harvest', {
        method: 'POST',
        body: JSON.stringify({
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.entriesProcessed).toBe(1);
      expect(data.period).toEqual({
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      // Verify database transaction
      expect(mockDbClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO time_entries'),
        expect.arrayContaining(['123', mockEntries[0].date, 8])
      );
      expect(mockDbClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/sync/harvest', {
        method: 'POST',
        body: JSON.stringify({
          fromDate: 'invalid-date',
          toDate: '2024-01-31',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should rollback on database error', async () => {
      mockConnector.getTimeEntries.mockResolvedValue([
        {
          entryId: '123',
          date: new Date('2024-01-01'),
          hours: 8,
          billableFlag: true,
          notes: 'Test',
          billableAmount: 800,
          costAmount: 400,
        } as any,
      ]);
      mockConnector.getLastSyncMetrics.mockReturnValue(null);

      // Simulate database error on INSERT
      mockDbClient.query.mockImplementation((query: string) => {
        if (query === 'BEGIN') return Promise.resolve();
        if (query.includes('INSERT')) throw new Error('Database error');
        return Promise.resolve();
      });

      const request = new NextRequest('http://localhost:3000/api/sync/harvest', {
        method: 'POST',
        body: JSON.stringify({
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to sync Harvest data');
      expect(mockDbClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockDbClient.release).toHaveBeenCalled();
    });

    it('should handle missing environment variables', async () => {
      delete process.env.HARVEST_ACCESS_TOKEN;

      const request = new NextRequest('http://localhost:3000/api/sync/harvest', {
        method: 'POST',
        body: JSON.stringify({
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Missing environment variables');
    });

    it('should calculate cache hit rate correctly', async () => {
      const mockMetrics = {
        harvestRequests: 2,
        dbQueryCount: 5,
        cacheHits: 75,
        cacheMisses: 25,
        entriesProcessed: 10,
      };

      mockConnector.getTimeEntries.mockResolvedValue([]);
      mockConnector.getLastSyncMetrics.mockReturnValue(mockMetrics);

      const request = new NextRequest('http://localhost:3000/api/sync/harvest', {
        method: 'POST',
        body: JSON.stringify({
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.performance.cacheHitRate).toBe(0.75);
    });

    it('should filter by clientId when provided', async () => {
      mockConnector.getTimeEntries.mockResolvedValue([]);
      mockConnector.getLastSyncMetrics.mockReturnValue(null);

      const request = new NextRequest('http://localhost:3000/api/sync/harvest', {
        method: 'POST',
        body: JSON.stringify({
          fromDate: '2024-01-01',
          toDate: '2024-01-31',
          clientId: 'client-123',
        }),
      });

      await POST(request);

      expect(mockConnector.getTimeEntries).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'client-123'
      );
    });
  });
});