import { LRUCache } from '../lru-cache';

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBeNull();
    });

    it('should report correct size', () => {
      const cache = new LRUCache<string, string>(5);
      expect(cache.size).toBe(0);

      cache.set('a', 'value1');
      expect(cache.size).toBe(1);

      cache.set('b', 'value2');
      cache.set('c', 'value3');
      expect(cache.size).toBe(3);
    });

    it('should check existence with has()', () => {
      const cache = new LRUCache<string, string>(5);
      cache.set('exists', 'yes');

      expect(cache.has('exists')).toBe(true);
      expect(cache.has('not-exists')).toBe(false);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used item when full', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size).toBe(3);

      // Cache is full, adding 'd' should evict 'a'
      cache.set('d', 4);
      expect(cache.size).toBe(3);
      expect(cache.get('a')).toBeNull(); // 'a' was evicted
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on get()', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it most recently used
      expect(cache.get('a')).toBe(1);

      // Now 'b' is least recently used
      cache.set('d', 4);
      expect(cache.get('b')).toBeNull(); // 'b' was evicted
      expect(cache.get('a')).toBe(1); // 'a' still exists
    });

    it('should update position on re-set', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Update 'a' to make it most recently used
      cache.set('a', 10);

      // Now 'b' is least recently used
      cache.set('d', 4);
      expect(cache.get('b')).toBeNull(); // 'b' was evicted
      expect(cache.get('a')).toBe(10); // 'a' still exists with new value
    });
  });

  describe('TTL expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should expire items after TTL', () => {
      const cache = new LRUCache<string, number>(5, 1000); // 1 second TTL

      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      // Advance time by 500ms - should still exist
      jest.advanceTimersByTime(500);
      expect(cache.get('a')).toBe(1);

      // Advance time by another 600ms (total 1100ms) - should be expired
      jest.advanceTimersByTime(600);
      expect(cache.get('a')).toBeNull();
    });

    it('should remove expired items from has() check', () => {
      const cache = new LRUCache<string, number>(5, 1000);

      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);

      jest.advanceTimersByTime(1100);
      expect(cache.has('a')).toBe(false);
    });

    it('should clean expired items in entries()', () => {
      const cache = new LRUCache<string, number>(5, 1000);

      cache.set('a', 1);
      cache.set('b', 2);

      jest.advanceTimersByTime(500);
      cache.set('c', 3); // 'c' has fresh timestamp

      jest.advanceTimersByTime(600); // 'a' and 'b' expired, 'c' still valid

      const entries = cache.entries();
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(['c', 3]);
    });
  });

  describe('clear operation', () => {
    it('should clear all items', () => {
      const cache = new LRUCache<string, number>(5);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size).toBe(3);

      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
      expect(cache.get('c')).toBeNull();
    });

    it('should reset metrics on clear', () => {
      const cache = new LRUCache<string, number>(5);

      cache.set('a', 1);
      cache.get('a'); // hit
      cache.get('b'); // miss

      const metricsBefore = cache.getMetrics();
      expect(metricsBefore.hits).toBe(1);
      expect(metricsBefore.misses).toBe(1);

      cache.clear();

      const metricsAfter = cache.getMetrics();
      expect(metricsAfter.hits).toBe(0);
      expect(metricsAfter.misses).toBe(0);
    });
  });

  describe('metrics tracking', () => {
    it('should track hits and misses', () => {
      const cache = new LRUCache<string, number>(5);

      cache.set('a', 1);
      cache.set('b', 2);

      cache.get('a'); // hit
      cache.get('b'); // hit
      cache.get('c'); // miss
      cache.get('d'); // miss
      cache.get('a'); // hit

      const metrics = cache.getMetrics();
      expect(metrics.hits).toBe(3);
      expect(metrics.misses).toBe(2);
      expect(metrics.hitRate).toBeCloseTo(0.6, 2); // 3/5 = 0.6
    });

    it('should handle zero total requests in hitRate', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.hitRate).toBe(0);
    });

    it('should include all metrics in getMetrics()', () => {
      const cache = new LRUCache<string, number>(10, 5000);
      cache.set('a', 1);
      cache.get('a');

      const metrics = cache.getMetrics();
      expect(metrics).toEqual({
        size: 1,
        maxSize: 10,
        hits: 1,
        misses: 0,
        hitRate: 1,
        ttlMs: 5000
      });
    });
  });

  describe('entries operation', () => {
    it('should return all valid entries', () => {
      const cache = new LRUCache<string, number>(5);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const entries = cache.entries();
      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual(['a', 1]);
      expect(entries).toContainEqual(['b', 2]);
      expect(entries).toContainEqual(['c', 3]);
    });

    it('should return empty array for empty cache', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.entries()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle cache size of 1', () => {
      const cache = new LRUCache<string, number>(1);

      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      cache.set('b', 2);
      expect(cache.get('a')).toBeNull(); // evicted
      expect(cache.get('b')).toBe(2);
    });

    it('should handle updating same key multiple times', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('a', 2);
      cache.set('a', 3);

      expect(cache.size).toBe(1);
      expect(cache.get('a')).toBe(3);
    });

    it('should handle null/undefined as valid values', () => {
      const cache = new LRUCache<string, null | undefined>(5);

      cache.set('null-value', null);
      cache.set('undefined-value', undefined);

      // Note: get() returns null for missing keys, so we need has() to distinguish
      expect(cache.has('null-value')).toBe(true);
      expect(cache.has('undefined-value')).toBe(true);
      expect(cache.has('not-exists')).toBe(false);
    });
  });
});