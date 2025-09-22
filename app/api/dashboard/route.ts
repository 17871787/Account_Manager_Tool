import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const latestFile = path.join(dataDir, 'latest.json');

    try {
      const data = await fs.readFile(latestFile, 'utf-8');
      return NextResponse.json(JSON.parse(data));
    } catch (error) {
      // No data yet
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}