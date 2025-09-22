import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/src/lib/dataStore';

export async function GET(request: NextRequest) {
  try {
    // Get data from shared memory store
    const data = dataStore.getData();

    console.log('Dashboard API retrieving data:', data ? 'Found' : 'Not found');

    // Return the data or null if not found
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data: ' + (error as Error).message },
      { status: 500 }
    );
  }
}