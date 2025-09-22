import { NextRequest, NextResponse } from 'next/server';
import { ProfitabilityService } from '../../../../../src/services/profitability.service';
import { captureException } from '../../../../../src/utils/sentry';

export async function GET(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    const profitabilityService = new ProfitabilityService();
    const metrics = await profitabilityService.getPortfolioProfitability(
      new Date(params.month)
    );

    return NextResponse.json(metrics);
  } catch (error) {
    captureException(error, {
      operation: 'getPortfolioProfitability',
      month: params.month,
    });

    return NextResponse.json(
      { error: 'Failed to get portfolio profitability' },
      { status: 500 }
    );
  }
}