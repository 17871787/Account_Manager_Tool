import { buildInsertQuery } from '../db';

describe('buildInsertQuery', () => {
  it('creates insert query with placeholders and params', () => {
    const { query, params } = buildInsertQuery(
      'time_entries',
      ['id', 'value'],
      [
        ['a', 1],
        ['b', 2],
      ],
      'ON CONFLICT DO NOTHING'
    );

    expect(query).toContain('INSERT INTO time_entries (id, value)');
    expect(query).toContain('VALUES ($1, $2), ($3, $4)');
    expect(query.trim().endsWith('ON CONFLICT DO NOTHING;')).toBe(true);
    expect(params).toEqual(['a', 1, 'b', 2]);
  });

  it('supports conflict update clauses', () => {
    const { query, params } = buildInsertQuery(
      'test_table',
      ['id', 'name'],
      [[1, 'foo']],
      'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name'
    );

    expect(query).toContain('INSERT INTO test_table (id, name)');
    expect(query).toContain('VALUES ($1, $2)');
    expect(query).toContain('ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name');
    expect(params).toEqual([1, 'foo']);
  });
});
