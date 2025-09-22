import { format, subDays } from 'date-fns';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

let sessionCookie: string | null = null;

async function ensureSession(): Promise<void> {
  if (sessionCookie) {
    return;
  }

  const username = process.env.AUTH_USERNAME;
  const password = process.env.AUTH_PASSWORD;

  if (!username || !password) {
    throw new Error('AUTH_USERNAME and AUTH_PASSWORD must be set to verify authentication.');
  }

  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Login failed: ${response.status} ${response.statusText} - ${body}`);
  }

  const rawHeaders =
    typeof (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie ===
    'function'
      ? (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : ((response.headers as unknown as { raw?: () => Record<string, string[]> }).raw?.()?.[
          'set-cookie'
        ] ?? []);

  const headerList = Array.isArray(rawHeaders) && rawHeaders.length > 0
    ? rawHeaders
    : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie') as string] : []);

  if (headerList.length === 0) {
    throw new Error('Login response did not include a session cookie.');
  }

  const session = headerList.find((value) => value.startsWith('session-token='));

  if (!session) {
    throw new Error('Unable to locate session cookie in login response.');
  }

  const trimmedSession = session.trim();
  sessionCookie = trimmedSession.split(';')[0] ?? null;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  await ensureSession();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: sessionCookie } : {}),
      ...(options.headers ?? {}),
    },
    credentials: 'include',
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
    throw new Error(`Expected 401 without session but received ${unauth.status}`);
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
