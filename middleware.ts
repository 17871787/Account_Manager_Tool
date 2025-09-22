import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from './src/middleware/auth';

export async function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow auth endpoints without session
  if (request.nextUrl.pathname.startsWith('/api/auth/') ||
      request.nextUrl.pathname === '/api/health') {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const payload = await verifySessionToken(sessionToken);

  if (payload) {
    return NextResponse.next();
  }

  return NextResponse.json(
    {
      error: 'Unauthorized',
      message: 'Valid session required',
      timestamp: new Date().toISOString(),
    },
    { status: 401 }
  );
}

export const config = {
  matcher: '/api/:path*',
};
