import { PoolClient } from 'pg';
import { getPool, query } from '../../../../src/models/database';
import { buildInsertQuery } from '../../../../src/utils/db';

export interface Deal {
  id?: string;
  name: string;
  stage?: string;
  amount?: number;
  closeDate?: string;
  owner?: string;
  company?: string;
  status?: string;
  [key: string]: unknown;
}

const TABLE_NAME = 'hubspot_deal_imports';

let ensureTablePromise: Promise<void> | null = null;

async function ensureStorageTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = (async () => {
      await query(
        `CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
          deal_id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          sort_order INTEGER NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`
      );

      await query(
        `CREATE INDEX IF NOT EXISTS idx_${TABLE_NAME}_sort_order
         ON ${TABLE_NAME} (sort_order);`
      );
    })();
  }

  return ensureTablePromise;
}

async function runInTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

type PersistedDeal = Deal & { id: string };

function ensureDealId(deal: Deal, index: number): PersistedDeal {
  if (typeof deal.id === 'string' && deal.id.trim().length > 0) {
    return deal as PersistedDeal;
  }

  return {
    ...deal,
    id: `generated_${index}`,
  };
}

export async function loadStoredDeals(): Promise<Deal[]> {
  await ensureStorageTable();

  const { rows } = await query<{ data: Deal | string }>(
    `SELECT data FROM ${TABLE_NAME} ORDER BY sort_order ASC`
  );

  return rows.map((row) =>
    typeof row.data === 'string' ? (JSON.parse(row.data) as Deal) : row.data
  );
}

export async function storeDeals(deals: Deal[]): Promise<void> {
  await ensureStorageTable();

  if (deals.length === 0) {
    await clearStoredDeals();
    return;
  }

  await runInTransaction(async (client) => {
    await client.query(`DELETE FROM ${TABLE_NAME}`);

    const normalizedDeals = deals.map((deal, index) => {
      const persisted = ensureDealId(deal, index);
      return {
        persisted,
        sortOrder: index,
      };
    });

    const records = normalizedDeals.map(({ persisted, sortOrder }) => [
      persisted.id,
      JSON.stringify(persisted),
      sortOrder,
    ]);

    const { query: insertQuery, params } = buildInsertQuery(
      TABLE_NAME,
      ['deal_id', 'data', 'sort_order'],
      records,
      `ON CONFLICT (deal_id) DO UPDATE SET
        data = EXCLUDED.data,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()`
    );

    await client.query(insertQuery, params);
  });
}

export async function clearStoredDeals(): Promise<void> {
  await ensureStorageTable();
  await query(`DELETE FROM ${TABLE_NAME}`);
}
