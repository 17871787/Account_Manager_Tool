import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { files } = await request.json();

    // Simple file-based storage for now
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

    // Also save a combined file for the dashboard
    const combinedData = {
      timestamp: new Date().toISOString(),
      hubspot: files.find((f: any) => f.type === 'hubspot'),
      finance: files.find((f: any) => f.type === 'finance')
    };

    await fs.writeFile(
      path.join(dataDir, 'latest.json'),
      JSON.stringify(combinedData, null, 2)
    );

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