import { NextRequest, NextResponse } from 'next/server';
import { dataStore } from '@/src/lib/dataStore';

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    console.log('Upload API received files:', files.length);

    // Store in shared memory
    const combinedData = {
      timestamp: new Date().toISOString(),
      hubspot: files.find((f: any) => f.type === 'hubspot'),
      finance: files.find((f: any) => f.type === 'finance')
    };

    dataStore.setData(combinedData);

    return NextResponse.json({
      success: true,
      message: 'Data uploaded successfully',
      filesProcessed: files.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return the in-memory data
  const data = dataStore.getData();
  return NextResponse.json(data);
}