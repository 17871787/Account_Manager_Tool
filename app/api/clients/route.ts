import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../src/models/database';
import { captureException } from '../../../src/utils/sentry';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive') !== 'false';

    const result = await query(
      'SELECT * FROM clients WHERE is_active = $1 ORDER BY name',
      [isActive]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    captureException(error, {
      operation: 'getClients',
    });

    return NextResponse.json(
      { error: 'Failed to get clients' },
      { status: 500 }
    );
  }
}