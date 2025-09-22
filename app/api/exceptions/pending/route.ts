import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ExceptionEngine } from '../../../../src/rules/exception.engine';
import { captureException } from '../../../../src/utils/sentry';

const exceptionEngine = new ExceptionEngine();

export async function GET(request: NextRequest) {
  let clientId: string | undefined;

  try {
    const searchParams = request.nextUrl.searchParams;
    clientId = searchParams.get('clientId') || undefined;

    const exceptions = await exceptionEngine.getPendingExceptions(clientId);

    return NextResponse.json(exceptions);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    captureException(error, {
      operation: 'getPendingExceptions',
      clientId,
    });

    return NextResponse.json(
      { error: 'Failed to get exceptions' },
      { status: 500 }
    );
  }
}