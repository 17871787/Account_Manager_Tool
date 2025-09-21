import { setPool } from '../../../../../src/models/database';
import {
  clearStoredDeals,
  loadStoredDeals,
  storeDeals,
  Deal,
} from '../storage';

interface StoredDeal {
  dealId: string;
  payload: Deal;
  sortOrder: number;
}

class InMemoryDealStore {
  private deals = new Map<string, StoredDeal>();
  private snapshot: Map<string, StoredDeal> | null = null;

  async handleQuery(text: string, params: unknown[] = []) {
    const normalized = text.trim();

    if (normalized === 'BEGIN') {
      this.snapshot = new Map(this.deals);
      return { rows: [] };
    }

    if (normalized === 'COMMIT') {
      this.snapshot = null;
      return { rows: [] };
    }

    if (normalized === 'ROLLBACK') {
      if (this.snapshot) {
        this.deals = new Map(this.snapshot);
      }
      this.snapshot = null;
      return { rows: [] };
    }

    if (normalized.startsWith('CREATE TABLE')) {
      return { rows: [] };
    }

    if (normalized.startsWith('CREATE INDEX')) {
      return { rows: [] };
    }

    if (normalized.startsWith('DELETE FROM hubspot_deal_imports')) {
      this.deals.clear();
      return { rows: [] };
    }

    if (normalized.startsWith('INSERT INTO hubspot_deal_imports')) {
      for (let index = 0; index < params.length; index += 3) {
        const dealId = params[index] as string;
        const rawPayload = params[index + 1] as string;
        const sortOrder = params[index + 2] as number;
        const payload = JSON.parse(rawPayload) as Deal;
        this.deals.set(dealId, {
          dealId,
          payload,
          sortOrder,
        });
      }
      return { rows: [] };
    }

    if (normalized.startsWith('SELECT data FROM hubspot_deal_imports')) {
      const rows = Array.from(this.deals.values())
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((item) => ({ data: item.payload }));
      return { rows };
    }

    throw new Error(`Unsupported query: ${normalized}`);
  }
}

class MockClient {
  constructor(private readonly store: InMemoryDealStore) {}

  query(text: string, params?: unknown[]) {
    return this.store.handleQuery(text, params);
  }

  release() {
    return undefined;
  }
}

class MockPool {
  constructor(private readonly store: InMemoryDealStore) {}

  connect() {
    return Promise.resolve(new MockClient(this.store));
  }

  query(text: string, params?: unknown[]) {
    return this.store.handleQuery(text, params);
  }
}

describe('HubSpot durable deal storage', () => {
  beforeEach(() => {
    const store = new InMemoryDealStore();
    const pool = new MockPool(store);
    setPool(pool as unknown as any);
  });

  it('persists deals and returns them in insertion order', async () => {
    const deals: Deal[] = [
      { id: 'deal-1', name: 'First', amount: 100 },
      { id: 'deal-2', name: 'Second', amount: 200 },
    ];

    await storeDeals(deals);

    const stored = await loadStoredDeals();
    expect(stored).toHaveLength(2);
    expect(stored[0]).toMatchObject({ id: 'deal-1', name: 'First', amount: 100 });
    expect(stored[1]).toMatchObject({ id: 'deal-2', name: 'Second', amount: 200 });
  });

  it('replaces existing snapshot when new deals are stored', async () => {
    await storeDeals([{ id: 'old', name: 'Old Deal' }]);

    await storeDeals([{ id: 'new', name: 'New Deal', amount: 50 }]);

    const stored = await loadStoredDeals();
    expect(stored).toEqual([
      expect.objectContaining({ id: 'new', name: 'New Deal', amount: 50 }),
    ]);
  });

  it('clears all deals when requested', async () => {
    await storeDeals([{ id: 'temp', name: 'Temp Deal' }]);

    await clearStoredDeals();

    const stored = await loadStoredDeals();
    expect(stored).toHaveLength(0);
  });
});
