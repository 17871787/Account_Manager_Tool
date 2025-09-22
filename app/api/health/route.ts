import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint is public - no auth required
  // Just for checking if the server is running
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasAuth: !!(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD && process.env.SESSION_SECRET),
      hasDatabase: !!process.env.DATABASE_URL,
      hasHarvest: !!(process.env.HARVEST_ACCESS_TOKEN && process.env.HARVEST_ACCOUNT_ID),
      nodeEnv: process.env.NODE_ENV
    }
  });
}