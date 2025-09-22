import { NextRequest, NextResponse } from 'next/server';

// Import the latestData from upload route
let latestData: any = null;

export function setLatestData(data: any) {
  latestData = data;
}

export async function GET(request: NextRequest) {
  try {
    // Return the in-memory data
    if (latestData) {
      return NextResponse.json(latestData);
    }

    // Try to get from upload endpoint
    try {
      const baseUrl = request.nextUrl.origin;
      const uploadResponse = await fetch(`${baseUrl}/api/upload`);
      if (uploadResponse.ok) {
        const data = await uploadResponse.json();
        if (data) {
          return NextResponse.json(data);
        }
      }
    } catch {
      // Ignore fetch errors
    }

    // No data available
    return NextResponse.json(null);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}