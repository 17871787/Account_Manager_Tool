import { Pool, QueryResult, QueryResultRow } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

let pool: Pool | undefined;

export function getPool(connectionString?: string): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    });
  }
  return pool;
}

export function setPool(newPool: Pool) {
  pool = newPool;
}

export async function query<T extends QueryResultRow>(text: string): Promise<QueryResult<T>>;
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[]
): Promise<QueryResult<T>>;
export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
    const start = Date.now();
    const currentPool = getPool();
    const res = params
      ? await currentPool.query<T>(text, params)
      : await currentPool.query<T>(text);
    const duration = Date.now() - start;
    logger.debug({ text, duration, rows: res.rowCount }, 'Executed query');
    return res;
  }

export async function getClient() {
  const client = await getPool().connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);
  
  client.release = () => {
    clearTimeout(timeout);
    client.release = release;
    return release();
  };
  
  return client;
}
