import { NextRequest, NextResponse } from 'next/server';

/**
 * Returns true when the provided API key matches the configured INTERNAL_API_KEY
 */
export function isApiKeyAuthorized(apiKey: string | null | undefined): boolean {
  const expectedApiKey = process.env.INTERNAL_API_KEY;
  return Boolean(expectedApiKey && apiKey && apiKey === expectedApiKey);
}

/**
 * Returns true when the provided session token matches the configured VALID_SESSION_TOKEN
 */
export function isSessionTokenAuthorized(token: string | null | undefined): boolean {
  const validSessionToken = process.env.VALID_SESSION_TOKEN;
  return Boolean(validSessionToken && token && token === validSessionToken);
}

/**
 * Authentication middleware for API routes
 * Checks for valid API key or session
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  // Check for API key in headers
  const apiKey = req.headers.get('x-api-key');
  if (isApiKeyAuthorized(apiKey)) {
    return null; // Authentication successful
  }

  // Check for session cookie (if using session-based auth)
  const sessionToken = req.cookies.get('session-token')?.value;
  if (isSessionTokenAuthorized(sessionToken)) {
    return null; // Authentication successful
  }

  // No valid authentication found
  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid authentication required to access this endpoint'
    },
    { status: 401 }
  );
}

/**
 * Rate limiting check
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || record.resetTime < now) {
    requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Clears stored rate limit counters. Useful for testing environments.
 */
export function resetRateLimit(identifier?: string): void {
  if (identifier) {
    requestCounts.delete(identifier);
    return;
  }
  requestCounts.clear();
}