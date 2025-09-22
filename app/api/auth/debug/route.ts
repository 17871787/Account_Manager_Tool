import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  const expectedUsername = process.env.AUTH_USERNAME;
  const expectedPassword = process.env.AUTH_PASSWORD;

  // Never do this in production! This is just for debugging
  return NextResponse.json({
    received: {
      username,
      password: password ? `${password.substring(0, 2)}...` : null
    },
    expected: {
      hasUsername: !!expectedUsername,
      hasPassword: !!expectedPassword,
      usernameMatches: username === expectedUsername,
      passwordMatches: password === expectedPassword
    }
  });
}