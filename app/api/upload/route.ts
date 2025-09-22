import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Store in memory for Vercel deployment
let latestData: any = null;

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    // Store in memory (will persist for the session)
    const combinedData = {
      timestamp: new Date().toISOString(),
      hubspot: files.find((f: any) => f.type === 'hubspot'),
      finance: files.find((f: any) => f.type === 'finance')
    };

    latestData = combinedData;

    // Try to save to filesystem if running locally
    try {
      const dataDir = path.join(process.cwd(), 'data');

      // Create data directory if it doesn't exist
      try {
        await fs.access(dataDir);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // Save each file
      for (const file of files) {
        const fileName = `${file.type}_${new Date().toISOString().split('T')[0]}.json`;
        const filePath = path.join(dataDir, fileName);
        await fs.writeFile(filePath, JSON.stringify(file, null, 2));
      }

      await fs.writeFile(
        path.join(dataDir, 'latest.json'),
        JSON.stringify(combinedData, null, 2)
      );
    } catch (fsError) {
      // Filesystem write failed (probably on Vercel), but that's OK
      console.log('Filesystem write skipped (running on Vercel?):', fsError);
    }

    return NextResponse.json({
      success: true,
      message: 'Data uploaded successfully',
      filesProcessed: files.length
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return the in-memory data
  return NextResponse.json(latestData);
}