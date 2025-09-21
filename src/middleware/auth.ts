import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication middleware for API routes
 * Checks for valid API key or session
 */
export async function requireAuth(req: NextRequest): Promise<NextResponse | null> {
  // Check for API key in headers
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  // If we have an expected API key configured, check it
  if (expectedApiKey && apiKey === expectedApiKey) {
    return null; // Authentication successful
  }

  // Check for session cookie (if using session-based auth)
  const sessionToken = req.cookies.get('session-token')?.value;
  if (sessionToken) {
    // TODO: Validate session token against database or session store
    // For now, we'll check if it matches a configured token
    const validSessionToken = process.env.VALID_SESSION_TOKEN;
    if (validSessionToken && sessionToken === validSessionToken) {
      return null; // Authentication successful
    }
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