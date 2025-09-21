import type { NextRequest } from 'next/server';
import * as storage from '../storage';

// Mock the storage module
jest.mock('../storage');

describe('HubSpot upload route', () => {
  let POST: typeof import('../route').POST;
  let GET: typeof import('../route').GET;
  let DELETE: typeof import('../route').DELETE;

  const mockStorage = storage as jest.Mocked<typeof storage>;

  beforeAll(async () => {
    const routeModule = await import('../route');
    POST = routeModule.POST;
    GET = routeModule.GET;
    DELETE = routeModule.DELETE;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores uploaded deals in the database', async () => {
    const csvContent = 'Deal ID,Deal Name,Amount\n1,Test Deal,123.45\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'deals.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

    // Mock storage functions with correct function names
    mockStorage.loadStoredDeals.mockResolvedValue([]);
    mockStorage.storeDeals.mockResolvedValue(undefined);
    mockStorage.clearStoredDeals.mockResolvedValue(undefined);

    const request = new Request('http://localhost/api/hubspot/upload', {
      method: 'POST',
      body: formData,
      // @ts-expect-error Duplex is required by the Node.js fetch implementation
      duplex: 'half',
    });

    const response = await POST(request as unknown as NextRequest);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.dealsCount).toBe(1);

    // Mock loadStoredDeals to return the uploaded deal
    mockStorage.loadStoredDeals.mockResolvedValue([
      { id: '1', name: 'Test Deal', amount: 123.45 }
    ]);

    const getResponse = await GET(
      new Request('http://localhost/api/hubspot/upload') as unknown as NextRequest
    );
    const getPayload = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(getPayload.count).toBe(1);
    expect(getPayload.deals[0].name).toBe('Test Deal');

    const deleteResponse = await DELETE(
      new Request('http://localhost/api/hubspot/upload', { method: 'DELETE' }) as unknown as NextRequest
    );
    const deletePayload = await deleteResponse.json();

    expect(deleteResponse.status).toBe(200);
    expect(deletePayload.success).toBe(true);

    // Mock loadStoredDeals to return empty array after deletion
    mockStorage.loadStoredDeals.mockResolvedValue([]);

    const finalGet = await GET(
      new Request('http://localhost/api/hubspot/upload') as unknown as NextRequest
    );
    const finalPayload = await finalGet.json();

    expect(finalPayload.count).toBe(0);
  });
});
