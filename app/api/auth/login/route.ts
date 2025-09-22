import { NextRequest, NextResponse } from 'next/server';
<<<<<<< HEAD
import { AuthService } from '../../../../src/auth/jwt-auth';

/**
 * Real login endpoint - not theater
 * POST /api/auth/login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const token = await AuthService.authenticate(email, password);

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
    });

    // Set secure HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
=======
import { createSessionToken, SESSION_COOKIE_NAME } from '../../../../../src/middleware/auth';

interface LoginRequestBody {
  username?: string;
  password?: string;
}

export async function POST(request: NextRequest) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { username, password } = body;

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassword || !process.env.SESSION_SECRET) {
    return NextResponse.json(
      { error: 'Authentication is not configured on the server' },
      { status: 500 }
    );
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const session = await createSessionToken(username);
  const maxAgeSeconds = Math.max(0, Math.floor((session.payload.exp - Date.now()) / 1000));

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  });

  return response;
}
>>>>>>> 9a045deabf5c593e9f61366cfe9a45bf949eb9aa
