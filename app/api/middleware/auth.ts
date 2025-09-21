import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication middleware for Next.js API routes
 * Checks for API key or session authentication
 */
export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  // Check for API key authentication
  const apiKey = req.headers.get('x-api-key');
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  if (expectedApiKey && apiKey === expectedApiKey) {
    // API key is valid, proceed with request
    return handler(req);
  }

  // Check for session authentication (if using NextAuth or similar)
  const sessionToken = req.cookies.get('session-token')?.value;
  if (sessionToken) {
    // In production, validate the session token against your auth provider
    // For now, we'll check if it matches an environment variable
    const validSessionToken = process.env.VALID_SESSION_TOKEN;
    if (validSessionToken && sessionToken === validSessionToken) {
      return handler(req);
    }
  }

  // No valid authentication found
  return NextResponse.json(
    { error: 'Unauthorized - API key or session required' },
    { status: 401 }
  );
}

/**
 * Helper to create an authenticated route handler
 */
export function createAuthenticatedHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    const req = args[0] as NextRequest;

    // Check authentication
    const apiKey = req.headers.get('x-api-key');
    const expectedApiKey = process.env.INTERNAL_API_KEY;

    if (!expectedApiKey || apiKey !== expectedApiKey) {
      // Check session as fallback
      const sessionToken = req.cookies.get('session-token')?.value;
      const validSessionToken = process.env.VALID_SESSION_TOKEN;

      if (!validSessionToken || sessionToken !== validSessionToken) {
        return NextResponse.json(
          { error: 'Unauthorized - API key or session required' },
          { status: 401 }
        ) as R;
      }
    }

    // Authentication successful, call the handler
    return handler(...args);
  };
}