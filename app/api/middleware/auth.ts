import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuth,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from '../../../src/middleware/auth';

export async function withAuth(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const authError = await requireAuth(req);
  if (authError) {
    return authError;
  }

  return handler(req);
}

export function createAuthenticatedHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    const req = args[0] as NextRequest;
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = await verifySessionToken(sessionToken);

    if (!payload) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Valid session required' },
        { status: 401 }
      ) as R;
    }

    return handler(...args);
  };
}
