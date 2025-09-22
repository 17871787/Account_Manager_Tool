import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '../../../../src/models/database';
import { captureException } from '../../../../src/utils/sentry';

const calculateSchema = z.object({
  startDate: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  endDate: z.string().refine((v) => !Number.isNaN(Date.parse(v))),
  clientId: z.string().optional(),
  projectId: z.string().optional(),
});

interface ProfitabilityResult {
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  hours: number;
  period: {
    start: string;
    end: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startDate, endDate, clientId, projectId } = calculateSchema.parse(body);

    // Build query with optional filters
    let queryText = `
      SELECT
        c.id as client_id,
        c.name as client_name,
        p.id as project_id,
        p.name as project_name,
        SUM(te.billable_amount) as revenue,
        SUM(te.cost_amount) as cost,
        SUM(te.hours) as hours
      FROM time_entries te
      LEFT JOIN clients c ON te.client_id = c.id
      LEFT JOIN projects p ON te.project_id = p.id
      WHERE te.date >= $1 AND te.date <= $2
    `;

    const params: any[] = [startDate, endDate];

    if (clientId) {
      queryText += ` AND te.client_id = $${params.length + 1}`;
      params.push(clientId);
    }

    if (projectId) {
      queryText += ` AND te.project_id = $${params.length + 1}`;
      params.push(projectId);
    }

    queryText += `
      GROUP BY c.id, c.name, p.id, p.name
      ORDER BY revenue DESC
    `;

    const result = await query(queryText, params);

    const profitability: ProfitabilityResult[] = result.rows.map((row: any) => {
      const revenue = parseFloat(row.revenue) || 0;
      const cost = parseFloat(row.cost) || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        clientId: row.client_id,
        clientName: row.client_name || 'Unknown Client',
        projectId: row.project_id,
        projectName: row.project_name,
        revenue,
        cost,
        profit,
        margin,
        hours: parseFloat(row.hours) || 0,
        period: {
          start: startDate,
          end: endDate,
        },
      };
    });

    // Calculate totals
    const totals = profitability.reduce(
      (acc, item) => ({
        revenue: acc.revenue + item.revenue,
        cost: acc.cost + item.cost,
        profit: acc.profit + item.profit,
        hours: acc.hours + item.hours,
      }),
      { revenue: 0, cost: 0, profit: 0, hours: 0 }
    );

    const overallMargin = totals.revenue > 0
      ? (totals.profit / totals.revenue) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: profitability,
      summary: {
        ...totals,
        margin: overallMargin,
        period: {
          start: startDate,
          end: endDate,
        },
      },
      count: profitability.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    captureException(error, {
      operation: 'profitability.calculate',
    });

    return NextResponse.json(
      { error: 'Failed to calculate profitability' },
      { status: 500 }
    );
  }
}