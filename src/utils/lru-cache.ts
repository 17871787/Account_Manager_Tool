/**
 * LRU Cache with size bounds and TTL support
 * Prevents memory leaks while maintaining performance
 */
export class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize = 10000, ttlMs = 3600000) { // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: K): V | null {
    const item = this.cache.get(key);

    if (!item) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hits++;

    return item.value;
  }

  set(key: K, value: V): void {
    // If key exists, delete it first (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If at max size, remove oldest (first) entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // Add to end (most recently used)
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  has(key: K): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check expiry
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  get size(): number {
    return this.cache.size;
  }

  get hitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  // Get all entries (for batch operations)
  entries(): Array<[K, V]> {
    const now = Date.now();
    const result: Array<[K, V]> = [];

    // Clean expired while iterating
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp <= this.ttlMs) {
        result.push([key, item.value]);
      } else {
        this.cache.delete(key);
      }
    }

    return result;
  }

  // Metrics for monitoring
  getMetrics() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hitRate,
      ttlMs: this.ttlMs
    };
  }
}

/**
 * Factory for creating bounded caches with consistent settings
 */
export class CacheFactory {
  static createIdCache<V>(name: string, maxSize = 10000): LRUCache<string, V> {
    const cache = new LRUCache<string, V>(maxSize);

    // Log metrics periodically in development
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        const metrics = cache.getMetrics();
        if (metrics.size > 0) {
          console.log(`[Cache ${name}] Size: ${metrics.size}/${metrics.maxSize}, Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
        }
      }, 60000); // Every minute
    }

    return cache;
  }
}