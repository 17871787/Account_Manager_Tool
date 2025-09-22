import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    hasAuthUsername: !!process.env.AUTH_USERNAME,
    hasAuthPassword: !!process.env.AUTH_PASSWORD,
    hasSessionSecret: !!process.env.SESSION_SECRET,
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}