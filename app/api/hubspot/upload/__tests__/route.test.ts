import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { NextRequest } from 'next/server';

describe('HubSpot upload route', () => {
  const storageDir = path.join(
    os.tmpdir(),
    `hubspot-upload-test-${Date.now().toString(36)}`
  );
  let POST: typeof import('../route').POST;
  let GET: typeof import('../route').GET;
  let DELETE: typeof import('../route').DELETE;

  beforeAll(async () => {
    process.env.HUBSPOT_DEALS_STORAGE_DIR = storageDir;
    const routeModule = await import('../route');
    POST = routeModule.POST;
    GET = routeModule.GET;
    DELETE = routeModule.DELETE;
  });

  afterAll(async () => {
    await fs.rm(storageDir, { recursive: true, force: true });
    delete process.env.HUBSPOT_DEALS_STORAGE_DIR;
  });

  it('stores uploaded deals in the temporary storage directory', async () => {
    const csvContent = 'Deal ID,Deal Name,Amount\n1,Test Deal,123.45\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'deals.csv', { type: 'text/csv' });
    const formData = new FormData();
    formData.append('file', file);

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

    const finalGet = await GET(
      new Request('http://localhost/api/hubspot/upload') as unknown as NextRequest
    );
    const finalPayload = await finalGet.json();

    expect(finalPayload.count).toBe(0);
  });
});
