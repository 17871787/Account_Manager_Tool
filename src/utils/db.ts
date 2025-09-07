export interface InsertQueryResult {
  query: string;
  params: Array<string | number | Date | boolean | null>;
}

export function buildInsertQuery(
  table: string,
  columns: string[],
  records: Array<Array<string | number | Date | boolean | null>>,
  conflictClause: string
): InsertQueryResult {
  const params: Array<string | number | Date | boolean | null> = [];
  const valuePlaceholders = records.map((record, rowIndex) => {
    const placeholders = record.map((value, columnIndex) => {
      const paramIndex = rowIndex * columns.length + columnIndex + 1;
      params.push(value);
      return `$${paramIndex}`;
    });
    return `(${placeholders.join(', ')})`;
  });

  const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES ${valuePlaceholders.join(', ')}
    ${conflictClause};
  `;

  return { query, params };
}
