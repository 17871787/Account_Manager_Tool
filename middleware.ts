import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Global middleware for Next.js App Router
 * Enforces authentication on ALL /api/* routes
 */
export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith('/api')) {
    // Check for API key
    const apiKey = request.headers.get('x-api-key');
    const expectedApiKey = process.env.INTERNAL_API_KEY;

    if (expectedApiKey && apiKey === expectedApiKey) {
      // Valid API key, allow request
      return NextResponse.next();
    }

    // Check for session token (temporary - replace with real session management)
    const sessionToken = request.cookies.get('session-token')?.value;
    const validSessionToken = process.env.VALID_SESSION_TOKEN;

    if (validSessionToken && sessionToken === validSessionToken) {
      // Valid session, allow request
      return NextResponse.next();
    }

    // No valid authentication
    return NextResponse.json(
      {
        error: 'Unauthorized - API key or valid session required',
        timestamp: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  // Not an API route, allow request
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: '/api/:path*'
};