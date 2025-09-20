import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';
import path from 'path';

interface Deal {
  id?: string;
  name: string;
  stage?: string;
  amount?: number;
  closeDate?: string;
  owner?: string;
  company?: string;
  status?: string;
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let deals: Deal[] = [];
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Parse Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      // Map Excel data to deals format
      deals = rawData.map((row: any, index: number) => ({
        id: row['Deal ID'] || row['ID'] || `imported_${Date.now()}_${index}`,
        name: row['Deal Name'] || row['Name'] || row['Title'] || `Deal ${index + 1}`,
        stage: row['Deal Stage'] || row['Stage'] || row['Status'] || 'Unknown',
        amount: parseFloat(row['Amount'] || row['Value'] || row['Deal Amount'] || '0'),
        closeDate: row['Close Date'] || row['Expected Close'] || row['Date'] || new Date().toISOString(),
        owner: row['Owner'] || row['Deal Owner'] || row['Assigned To'] || 'Unassigned',
        company: row['Company'] || row['Account'] || row['Client'] || '',
        status: row['Status'] || 'Open',
        ...row // Include any additional fields
      }));
    } else if (fileName.endsWith('.csv')) {
      // Parse CSV file
      const csvContent = buffer.toString('utf-8');
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Map CSV data to deals format
      deals = records.map((row: any, index: number) => ({
        id: row['Deal ID'] || row['ID'] || `imported_${Date.now()}_${index}`,
        name: row['Deal Name'] || row['Name'] || row['Title'] || `Deal ${index + 1}`,
        stage: row['Deal Stage'] || row['Stage'] || row['Status'] || 'Unknown',
        amount: parseFloat(row['Amount'] || row['Value'] || row['Deal Amount'] || '0'),
        closeDate: row['Close Date'] || row['Expected Close'] || row['Date'] || new Date().toISOString(),
        owner: row['Owner'] || row['Deal Owner'] || row['Assigned To'] || 'Unassigned',
        company: row['Company'] || row['Account'] || row['Client'] || '',
        status: row['Status'] || 'Open',
        ...row // Include any additional fields
      }));
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file format. Please upload .xlsx, .xls, or .csv file' },
        { status: 400 }
      );
    }

    // Store deals in a temporary JSON file (in production, use a proper database)
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });

    const dealsFilePath = path.join(dataDir, 'imported_deals.json');

    // Read existing deals if any
    let existingDeals: Deal[] = [];
    try {
      const existingData = await fs.readFile(dealsFilePath, 'utf-8');
      existingDeals = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, that's okay
    }

    // Merge new deals with existing ones (update if ID matches, add if new)
    const dealsMap = new Map(existingDeals.map(deal => [deal.id, deal]));
    deals.forEach(deal => {
      dealsMap.set(deal.id, deal);
    });

    const mergedDeals = Array.from(dealsMap.values());

    // Save merged deals
    await fs.writeFile(dealsFilePath, JSON.stringify(mergedDeals, null, 2));

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${deals.length} deals`,
      dealsCount: deals.length,
      totalDeals: mergedDeals.length,
      deals: deals.slice(0, 5), // Return first 5 deals as preview
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process file'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve imported deals
export async function GET(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const dealsFilePath = path.join(dataDir, 'imported_deals.json');

    try {
      const dealsData = await fs.readFile(dealsFilePath, 'utf-8');
      const deals = JSON.parse(dealsData);

      return NextResponse.json({
        success: true,
        deals,
        count: deals.length,
      });
    } catch (error) {
      // No deals imported yet
      return NextResponse.json({
        success: true,
        deals: [],
        count: 0,
      });
    }
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch deals'
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to clear imported deals
export async function DELETE(request: NextRequest) {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const dealsFilePath = path.join(dataDir, 'imported_deals.json');

    try {
      await fs.unlink(dealsFilePath);
    } catch (error) {
      // File might not exist, that's okay
    }

    return NextResponse.json({
      success: true,
      message: 'All imported deals have been cleared',
    });
  } catch (error) {
    console.error('Error clearing deals:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear deals'
      },
      { status: 500 }
    );
  }
}