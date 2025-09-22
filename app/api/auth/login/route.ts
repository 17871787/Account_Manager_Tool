import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME } from '../../../../src/middleware/auth';

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

  // Hardcoded fallback credentials for personal use
  const hardcodedUsername = 'joe';
  const hardcodedPassword = 'demo2025';

  // Try environment variables first, fall back to hardcoded
  const expectedUsername = process.env.AUTH_USERNAME || hardcodedUsername;
  const expectedPassword = process.env.AUTH_PASSWORD || hardcodedPassword;

  if (!process.env.SESSION_SECRET) {
    // Use a default session secret for development/personal use
    process.env.SESSION_SECRET = 'default-session-secret-for-joe-account-manager-tool-2025';
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
