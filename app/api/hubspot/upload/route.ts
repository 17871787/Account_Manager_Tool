import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import {
  clearStoredDeals,
  Deal,
  loadStoredDeals,
  storeDeals,
} from './storage';

export const runtime = 'nodejs';

type RawDealRow = Record<string, unknown>;

function getFirstString(
  row: RawDealRow,
  keys: string[],
  fallback: string
): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return fallback;
}

function getFirstNumber(
  row: RawDealRow,
  keys: string[],
  fallback: number
): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback;
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
      const rawData = XLSX.utils.sheet_to_json<RawDealRow>(worksheet);

      // Map Excel data to deals format
      deals = rawData.map((row, index: number) => ({
        id: getFirstString(row, ['Deal ID', 'ID'], `imported_${Date.now()}_${index}`),
        name: getFirstString(
          row,
          ['Deal Name', 'Name', 'Title'],
          `Deal ${index + 1}`
        ),
        stage: getFirstString(row, ['Deal Stage', 'Stage', 'Status'], 'Unknown'),
        amount: getFirstNumber(
          row,
          ['Amount', 'Value', 'Deal Amount'],
          0
        ),
        closeDate: getFirstString(
          row,
          ['Close Date', 'Expected Close', 'Date'],
          new Date().toISOString()
        ),
        owner: getFirstString(
          row,
          ['Owner', 'Deal Owner', 'Assigned To'],
          'Unassigned'
        ),
        company: getFirstString(row, ['Company', 'Account', 'Client'], ''),
        status: getFirstString(row, ['Status'], 'Open'),
        ...row, // Include any additional fields
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
      deals = (records as RawDealRow[]).map((row, index: number) => ({
        id: getFirstString(row, ['Deal ID', 'ID'], `imported_${Date.now()}_${index}`),
        name: getFirstString(
          row,
          ['Deal Name', 'Name', 'Title'],
          `Deal ${index + 1}`
        ),
        stage: getFirstString(row, ['Deal Stage', 'Stage', 'Status'], 'Unknown'),
        amount: getFirstNumber(
          row,
          ['Amount', 'Value', 'Deal Amount'],
          0
        ),
        closeDate: getFirstString(
          row,
          ['Close Date', 'Expected Close', 'Date'],
          new Date().toISOString()
        ),
        owner: getFirstString(
          row,
          ['Owner', 'Deal Owner', 'Assigned To'],
          'Unassigned'
        ),
        company: getFirstString(row, ['Company', 'Account', 'Client'], ''),
        status: getFirstString(row, ['Status'], 'Open'),
        ...row, // Include any additional fields
      }));
    } else {
      return NextResponse.json(
        { success: false, error: 'Unsupported file format. Please upload .xlsx, .xls, or .csv file' },
        { status: 400 }
      );
    }

    const existingDeals = await loadStoredDeals();

    // Merge new deals with existing ones (update if ID matches, add if new)
    const dealsMap = new Map(existingDeals.map(deal => [deal.id, deal]));
    deals.forEach(deal => {
      dealsMap.set(deal.id, deal);
    });

    const mergedDeals = Array.from(dealsMap.values());

    await storeDeals(mergedDeals);

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
export async function GET(_request: NextRequest) {
  try {
    const deals = await loadStoredDeals();

    return NextResponse.json({
      success: true,
      deals,
      count: deals.length,
    });
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
export async function DELETE(_request: NextRequest) {
  try {
    await clearStoredDeals();

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