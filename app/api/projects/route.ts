import { NextRequest, NextResponse } from 'next/server';
import { query } from '../../../src/models/database';
import { captureException } from '../../../src/utils/sentry';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId');
    const isActive = searchParams.get('isActive') !== 'false';

    let queryText = 'SELECT * FROM projects WHERE is_active = $1';
    const values: any[] = [isActive];

    if (clientId) {
      queryText += ' AND client_id = $2';
      values.push(clientId);
    }

    queryText += ' ORDER BY name';

    const result = await query(queryText, values);

    return NextResponse.json(result.rows);
  } catch (error) {
    captureException(error, {
      operation: 'getProjects',
    });

    return NextResponse.json(
      { error: 'Failed to get projects' },
      { status: 500 }
    );
  }
}