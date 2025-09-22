import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AuthService, UserRateLimiter } from './src/auth/jwt-auth';

/**
 * REAL security middleware - not theater
 *
 * This replaces the fake API key authentication with real JWT-based auth
 */
export function middleware(request: NextRequest) {
  // Public paths that don't require authentication
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/health',
  ];

  const path = request.nextUrl.pathname;

  // Allow public paths
  if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
    return NextResponse.next();
  }

  // All API routes require authentication
  if (path.startsWith('/api')) {
    // Get token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'Please login to access this resource',
        },
        { status: 401 }
      );
    }

    // Verify token
    const payload = AuthService.verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        {
          error: 'Invalid or expired token',
          message: 'Please login again',
        },
        { status: 401 }
      );
    }

    // Check rate limit per user
    if (!UserRateLimiter.check(payload.userId)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);

    // Log API access for audit trail
    console.log(`[AUDIT] User ${payload.email} accessed ${path} at ${new Date().toISOString()}`);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Non-API routes (pages) - these will use server components for auth
  return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};