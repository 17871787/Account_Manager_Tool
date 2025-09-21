import { PoolClient } from 'pg';
import { buildInsertQuery } from '../../utils/db';

type RecordValue = string | number | Date | boolean | null;
type RecordRow = RecordValue[];

export const DEFAULT_BATCH_SIZE = 1000;

function chunkRecords(records: RecordRow[], chunkSize: number): RecordRow[][] {
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0');
  }

  const chunks: RecordRow[][] = [];
  for (let i = 0; i < records.length; i += chunkSize) {
    chunks.push(records.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function batchInsert(
  client: PoolClient,
  table: string,
  columns: string[],
  records: RecordRow[],
  conflictClause: string,
  batchSize: number = DEFAULT_BATCH_SIZE
): Promise<void> {
  if (!records.length) {
    return;
  }

  const chunks = chunkRecords(records, batchSize);

  for (const chunk of chunks) {
    const { query, params } = buildInsertQuery(table, columns, chunk, conflictClause);
    await client.query(query, params);
  }
}

export { RecordRow };
