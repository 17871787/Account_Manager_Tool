import { format, subDays } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? process.env.INTERNAL_API_KEY ?? 'test-key';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request to ${path} failed: ${response.status} ${response.statusText} - ${body}`);
  }

  return response.json() as Promise<T>;
}

async function verifyAuth(): Promise<void> {
  const unauth = await fetch(`${API_URL}/api/health`);
  if (unauth.status !== 401) {
    throw new Error(`Expected 401 without key but received ${unauth.status}`);
  }

  const health = await apiRequest<{ status: string }>(`/api/health`);
  if (health.status !== 'ok') {
    throw new Error('Health endpoint did not return ok status');
  }
  console.log('✅ Authenticated health check succeeded');
}

async function runHarvestSync(): Promise<void> {
  const toDate = process.env.SYNC_TO_DATE ? new Date(process.env.SYNC_TO_DATE) : new Date();
  const fromDate = process.env.SYNC_FROM_DATE
    ? new Date(process.env.SYNC_FROM_DATE)
    : subDays(toDate, 30);

  const payload = {
    fromDate: format(fromDate, 'yyyy-MM-dd'),
    toDate: format(toDate, 'yyyy-MM-dd'),
  };

  const startedAt = Date.now();
  const result = await apiRequest<any>(`/api/sync/harvest`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const elapsedMs = Date.now() - startedAt;

  console.log(`✅ Harvest sync completed in ${elapsedMs}ms`, result.performance);

  const queryCount = result.performance?.dbQueryCount;
  if (typeof queryCount === 'number' && queryCount > 10) {
    throw new Error(`Expected <=10 database queries but saw ${queryCount}`);
  }
}

async function confirmDashboardData(): Promise<void> {
  const monthKey = format(new Date(), 'yyyy-MM');
  const profitability = await apiRequest<any[]>(`/api/profitability/portfolio/${monthKey}`);
  if (!Array.isArray(profitability) || profitability.length === 0) {
    throw new Error('Profitability data is empty');
  }

  const exceptions = await apiRequest<any[]>(`/api/exceptions/pending`);
  console.log(`✅ Retrieved ${profitability.length} profitability rows and ${exceptions.length} exceptions`);
}

async function main() {
  try {
    await verifyAuth();
    await runHarvestSync();
    await confirmDashboardData();
    console.log('✅ Verification complete. Dashboard can render live data.');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exitCode = 1;
  }
}

void main();
