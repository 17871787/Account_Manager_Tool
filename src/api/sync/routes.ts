import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { HarvestConnector } from '../../connectors/harvest.connector';
import { SFTConnector } from '../../connectors/sft.connector';
import { HubSpotConnector } from '../../connectors/hubspot.connector';
import { getClient } from '../../models/database';
import { captureException } from '../../utils/sentry';
import { batchInsert } from './batchInsert';
import { createRateLimitMiddleware } from '../../middleware/expressAuth';

export interface SyncRouterDeps {
  harvestConnector?: HarvestConnector;
  sftConnector?: SFTConnector;
  hubspotConnector?: HubSpotConnector;
}

export default function createSyncRouter({
  harvestConnector,
  sftConnector,
  hubspotConnector
}: SyncRouterDeps = {}) {
  const router = Router();

  const harvestLimiter = createRateLimitMiddleware({
    scope: 'sync-harvest',
    limit: 3,
    windowMs: 5 * 60 * 1000,
  });
  const hubspotLimiter = createRateLimitMiddleware({
    scope: 'sync-hubspot',
    limit: 3,
    windowMs: 5 * 60 * 1000,
  });
  const sftLimiter = createRateLimitMiddleware({
    scope: 'sync-sft',
    limit: 3,
    windowMs: 5 * 60 * 1000,
  });

  router.post('/sync/harvest', harvestLimiter, async (req: Request, res: Response) => {
    let connector: HarvestConnector;
    let fromDate: string | undefined;
    let toDate: string | undefined;
    let clientId: string | undefined;
    try {
      if (harvestConnector) {
        connector = harvestConnector;
      } else {
        const required = ['HARVEST_ACCESS_TOKEN', 'HARVEST_ACCOUNT_ID'];
        const missing = required.filter((v) => !process.env[v]);
        if (missing.length) {
          return res
            .status(500)
            .json({ error: `Missing environment variables: ${missing.join(', ')}` });
        }
        connector = new HarvestConnector();
      }
      const schema = z.object({
        fromDate: z
          .string()
          .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid fromDate' }),
        toDate: z
          .string()
          .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid toDate' }),
        clientId: z.string().optional()
      });
      ({ fromDate, toDate, clientId } = schema.parse(req.body));

      const entries = await connector.getTimeEntries(
        new Date(fromDate),
        new Date(toDate),
        clientId
      );

      const client = await getClient();
      try {
        await client.query('BEGIN');

        if (entries.length) {
          const records = entries.map((entry) => [
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

          await batchInsert(
            client,
            'time_entries',
            [
              'harvest_entry_id',
              'date',
              'hours',
              'billable_flag',
              'notes',
              'client_id',
              'project_id',
              'task_id',
              'person_id',
              'billable_amount',
              'cost_amount',
            ],
            records,
            `ON CONFLICT (harvest_entry_id) DO UPDATE SET
              date = EXCLUDED.date,
              hours = EXCLUDED.hours,
              billable_flag = EXCLUDED.billable_flag,
              notes = EXCLUDED.notes,
              client_id = EXCLUDED.client_id,
              project_id = EXCLUDED.project_id,
              task_id = EXCLUDED.task_id,
              person_id = EXCLUDED.person_id,
              billable_amount = EXCLUDED.billable_amount,
              cost_amount = EXCLUDED.cost_amount`
          );
        }

        await client.query('COMMIT');
        res.json({
          success: true,
          entriesProcessed: entries.length,
          period: { fromDate, toDate },
          source: 'harvest'
        });
      } catch (err) {
        await client.query('ROLLBACK');
        captureException(err, {
          operation: 'syncHarvest.db',
          fromDate,
          toDate,
          clientId,
        });
        res.status(500).json({ error: 'Failed to sync Harvest data' });
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      captureException(error, {
        operation: 'syncHarvest',
        fromDate,
        toDate,
        clientId,
      });
      res.status(500).json({ error: 'Failed to sync Harvest data' });
    }
  });

  router.post('/sync/hubspot', hubspotLimiter, async (req: Request, res: Response) => {
  let connector: HubSpotConnector;
  try {
    if (hubspotConnector) {
      connector = hubspotConnector;
    } else {
      const required = ['HUBSPOT_API_KEY'];
      const missing = required.filter((v) => !process.env[v]);
      if (missing.length) {
        return res
          .status(500)
          .json({ error: `Missing environment variables: ${missing.join(', ')}` });
      }
      connector = new HubSpotConnector();
    }
    z.object({}).parse(req.body);
    const result = await connector.syncRevenueData();

    res.json({
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      source: 'hubspot',
      message: `Synced ${result.recordsProcessed} company revenue records from HubSpot`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    captureException(error, {
      operation: 'syncHubSpot',
    });
    res.status(500).json({ error: 'Failed to sync HubSpot data' });
  }
});

  router.post('/sync/sft', sftLimiter, async (req: Request, res: Response) => {
    let connector: SFTConnector;
    let monthStr: string | undefined;
    try {
      if (sftConnector) {
        connector = sftConnector;
      } else {
        const required = ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET'];
        const missing = required.filter((v) => !process.env[v]);
        if (missing.length) {
          return res
            .status(500)
            .json({ error: `Missing environment variables: ${missing.join(', ')}` });
        }
        connector = new SFTConnector();
      }
      const schema = z.object({ month: z.string().optional() });
      const { month } = schema.parse(req.body);
      monthStr = month ?? new Date().toISOString().slice(0, 7);

      const revenues = await connector.getMonthlyRevenue(monthStr);

      const client = await getClient();
      let processed = 0;
      try {
        await client.query('BEGIN');

        if (revenues.length) {
          const records = revenues.map((rev) => [
            null,
            null,
            new Date(rev.month + '-01'),
            rev.recognisedRevenue,
          ]);

          await batchInsert(
            client,
            'sft_revenue',
            ['client_id', 'project_id', 'month', 'recognised_revenue'],
            records,
            'ON CONFLICT DO NOTHING'
          );
          processed = revenues.length;
        }

        await client.query('COMMIT');
        res.json({
          success: true,
          recordsProcessed: processed,
          source: 'sft',
          month: monthStr,
          message: `Synced ${processed} revenue records from Sales Forecast Tracker`
        });
      } catch (err) {
        await client.query('ROLLBACK');
        captureException(err, {
          operation: 'syncSFT.db',
          month: monthStr,
        });
        res.status(500).json({ error: 'Failed to sync SFT data' });
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      captureException(error, {
        operation: 'syncSFT',
        month: monthStr,
      });
      res.status(500).json({ error: 'Failed to sync SFT data' });
    }
  });

  return router;
}

