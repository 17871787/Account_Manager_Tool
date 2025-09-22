import { BoundedLruMap } from '../harvest.connector.optimized';

describe('BoundedLruMap', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('evicts the oldest entry when max size is exceeded', () => {
    const cache = new BoundedLruMap<string>({ maxSize: 2 });

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
  });

  it('refreshes recency on access', () => {
    const cache = new BoundedLruMap<string>({ maxSize: 2 });

    cache.set('a', '1');
    cache.set('b', '2');

    // Touch "a" so it becomes most recent
    expect(cache.get('a')).toBe('1');

    cache.set('c', '3');

    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  it('expires entries after the TTL elapses', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    const cache = new BoundedLruMap<string>({ maxSize: 5, ttlMs: 1000 });

    cache.set('a', '1');

    jest.advanceTimersByTime(500);
    expect(cache.get('a')).toBe('1');

    jest.advanceTimersByTime(1001);
    expect(cache.has('a')).toBe(false);
  });
});
