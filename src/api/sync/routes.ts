import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { HarvestConnector } from '../../connectors/harvest.connector';
import { SFTConnector } from '../../connectors/sft.connector';
import { HubSpotConnector } from '../../connectors/hubspot.connector';
import { getClient } from '../../models/database';

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

  router.post('/sync/harvest', async (req: Request, res: Response) => {
    const connector = harvestConnector ?? new HarvestConnector();
    try {
      const schema = z.object({
        fromDate: z
          .string()
          .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid fromDate' }),
        toDate: z
          .string()
          .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid toDate' }),
        clientId: z.string().optional()
      });
      const { fromDate, toDate, clientId } = schema.parse(req.body);

    const entries = await connector.getTimeEntries(
      new Date(fromDate),
      new Date(toDate),
      clientId
    );

    const client = await getClient();
    try {
      await client.query('BEGIN');

      if (entries.length) {
        const values: string[] = [];
        const params: Array<string | number | Date | boolean | null> = [];
        entries.forEach((entry, index) => {
          const base = index * 5;
          values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
          params.push(entry.entryId, entry.date, entry.hours, entry.billableFlag, entry.notes);
        });

        const insertQuery = `
          INSERT INTO time_entries (harvest_entry_id, date, hours, billable_flag, notes)
          VALUES ${values.join(',')}
          ON CONFLICT (harvest_entry_id) DO UPDATE SET
            hours = EXCLUDED.hours,
            billable_flag = EXCLUDED.billable_flag,
            notes = EXCLUDED.notes;
        `;
        await client.query(insertQuery, params);
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
      console.error('Sync error:', err);
      res.status(500).json({ error: 'Failed to sync Harvest data' });
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync Harvest data' });
  }
});

router.post('/sync/hubspot', async (req: Request, res: Response) => {
  const connector = hubspotConnector ?? new HubSpotConnector();
  try {
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
    console.error('HubSpot sync error:', error);
    res.status(500).json({ error: 'Failed to sync HubSpot data' });
  }
});

  router.post('/sync/sft', async (req: Request, res: Response) => {
    const connector = sftConnector ?? new SFTConnector();
    try {
      const schema = z.object({ month: z.string().optional() });
      const { month } = schema.parse(req.body);
      const monthStr = month ?? new Date().toISOString().slice(0, 7);

      const revenues = await connector.getMonthlyRevenue(monthStr);

      const client = await getClient();
      let processed = 0;
      try {
        await client.query('BEGIN');

        if (revenues.length) {
          const values: string[] = [];
          const params: Array<string | number | Date | boolean | null> = [];
          revenues.forEach((rev, index) => {
            const base = index * 4;
            values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
            params.push(null, null, new Date(rev.month + '-01'), rev.recognisedRevenue);
          });

          const insertQuery = `
            INSERT INTO sft_revenue (client_id, project_id, month, recognised_revenue)
            VALUES ${values.join(',')}
            ON CONFLICT DO NOTHING;
          `;
          await client.query(insertQuery, params);
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
        console.error('SFT sync error:', err);
        res.status(500).json({ error: 'Failed to sync SFT data' });
      } finally {
        client.release();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('SFT sync error:', error);
      res.status(500).json({ error: 'Failed to sync SFT data' });
    }
  });

  return router;
}

