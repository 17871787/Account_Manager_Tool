import { Pool, QueryResult, QueryResultRow } from 'pg';
import type { ConnectionOptions } from 'tls';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

let pool: Pool | undefined;

export function getPool(connectionString?: string): Pool {
  if (!pool) {
    const sslConfig = (() => {
      const mode = (process.env.DATABASE_SSL_MODE || 'verify-full').toLowerCase();

      if (mode === 'disable') {
        logger.warn(
          'DATABASE_SSL_MODE=disable – establishing connection without TLS. Use only in trusted environments.'
        );
        return false;
      }

      if (mode === 'allow-invalid') {
        logger.warn(
          'DATABASE_SSL_MODE=allow-invalid – certificate verification disabled. Use only in trusted development environments.'
        );
        return { rejectUnauthorized: false };
      }

      if (mode !== 'verify-full') {
        logger.warn(
          `Unknown DATABASE_SSL_MODE "${process.env.DATABASE_SSL_MODE}". Defaulting to verify-full.`
        );
      }

      const sslOptions: ConnectionOptions = { rejectUnauthorized: true };
      const ca = process.env.DATABASE_SSL_CA;
      const cert = process.env.DATABASE_SSL_CERT;
      const key = process.env.DATABASE_SSL_KEY;

      if (ca) {
        sslOptions.ca = ca.replace(/\\n/g, '\n');
      }

      if (cert) {
        sslOptions.cert = cert.replace(/\\n/g, '\n');
      }

      if (key) {
        sslOptions.key = key.replace(/\\n/g, '\n');
      }

      return sslOptions;
    })();

    pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
      ssl: sslConfig,
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
