import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BoundedHarvestConnector } from '../../../../src/connectors/harvest.connector.bounded';
import { getClient } from '../../../../src/models/database';
import { captureException } from '../../../../src/utils/sentry';

// Singleton instance for efficiency
let harvestConnector: BoundedHarvestConnector | null = null;

async function getHarvestConnector(): Promise<BoundedHarvestConnector> {
  if (!harvestConnector) {
    const required = ['HARVEST_ACCESS_TOKEN', 'HARVEST_ACCOUNT_ID'];
    const missing = required.filter((v) => !process.env[v]);
    if (missing.length) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    harvestConnector = new BoundedHarvestConnector();
    await harvestConnector.preloadCache();
  }
  return harvestConnector;
}

const syncSchema = z.object({
  fromDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid fromDate' }),
  toDate: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid toDate' }),
  clientId: z.string().optional()
});

export async function POST(request: NextRequest) {
  let fromDate: string | undefined;
  let toDate: string | undefined;
  let clientId: string | undefined;

  try {
    const body = await request.json();
    const validated = syncSchema.parse(body);
    ({ fromDate, toDate, clientId } = validated);

    const connector = await getHarvestConnector();
    const startTime = Date.now();

    const entries = await connector.getTimeEntries(
      new Date(fromDate),
      new Date(toDate),
      clientId
    );

    const fetchTime = Date.now() - startTime;
    const metrics = connector.getLastSyncMetrics();

    // Store in database
    const client = await getClient();
    try {
      await client.query('BEGIN');

      if (entries.length) {
        // Batch insert time entries
        const values = entries.map((entry, index) => {
          const offset = index * 11;
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
        }).join(', ');

        const params = entries.flatMap((entry) => [
          entry.entryId,
          entry.date,
          entry.hours,
          entry.billableFlag,
          entry.notes,
          entry.clientId ?? null,
          entry.projectId ?? null,
          entry.taskId ?? null,
          entry.personId ?? null,
          entry.billableAmount,
          entry.costAmount,
        ]);

        await client.query(
          `INSERT INTO time_entries (
            harvest_entry_id, date, hours, billable_flag, notes,
            client_id, project_id, task_id, person_id,
            billable_amount, cost_amount
          ) VALUES ${values}
          ON CONFLICT (harvest_entry_id) DO UPDATE SET
            date = EXCLUDED.date,
            hours = EXCLUDED.hours,
            billable_flag = EXCLUDED.billable_flag,
            notes = EXCLUDED.notes,
            client_id = EXCLUDED.client_id,
            project_id = EXCLUDED.project_id,
            task_id = EXCLUDED.task_id,
            person_id = EXCLUDED.person_id,
            billable_amount = EXCLUDED.billable_amount,
            cost_amount = EXCLUDED.cost_amount`,
          params
        );
      }

      await client.query('COMMIT');

      const cacheHitRate = metrics
        ? metrics.cacheHits + metrics.cacheMisses > 0
          ? metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
          : 1
        : null;

      return NextResponse.json({
        success: true,
        entriesProcessed: entries.length,
        period: { fromDate, toDate },
        source: 'harvest',
        performance: {
          fetchTimeMs: fetchTime,
          entriesPerSecond: entries.length > 0 ? Math.round(entries.length / (fetchTime / 1000)) : 0,
          harvestApiRequests: metrics?.harvestRequests ?? null,
          dbQueryCount: metrics?.dbQueryCount ?? null,
          cacheHitRate,
        }
      });
    } catch (err) {
      await client.query('ROLLBACK');
      captureException(err, {
        operation: 'syncHarvest.db',
        fromDate,
        toDate,
        clientId,
      });
      return NextResponse.json(
        { error: 'Failed to sync Harvest data' },
        { status: 500 }
      );
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && /Missing environment variables:/i.test(error.message)) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    captureException(error, {
      operation: 'syncHarvest',
      fromDate,
      toDate,
      clientId,
    });

    return NextResponse.json(
      { error: 'Failed to sync Harvest data' },
      { status: 500 }
    );
  }
}