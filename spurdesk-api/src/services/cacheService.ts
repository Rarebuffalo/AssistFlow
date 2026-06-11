import { createClient } from 'redis';

export class CacheService {
  private client: any = null;
  private isRedisReady = false;
  private localCache = new Map<string, string>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    try {
      this.client = createClient({ url: redisUrl });
      
      this.client.on('error', (err: any) => {
        // Log connection issue but don't crash the server
        if (this.isRedisReady) {
          console.warn('[CacheService] Redis connection lost. Falling back to in-memory cache.');
          this.isRedisReady = false;
        }
      });

      this.client.on('connect', () => {
        console.log('[CacheService] Connecting to Redis...');
      });

      this.client.on('ready', () => {
        console.log('[CacheService] Redis Client Ready.');
        this.isRedisReady = true;
      });

      this.client.connect().catch((err: any) => {
        // Suppress print since in-memory fallback will handle everything
        console.warn('[CacheService] Redis server not reachable. Using in-memory fallback cache.');
      });
    } catch (e) {
      console.warn('[CacheService] Failed to initialize Redis. Using in-memory fallback cache.');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisReady) {
      try {
        const val = await this.client.get(key);
        if (val) return val;
      } catch (e) {
        // Fallback below
      }
    }
    return this.localCache.get(key) || null;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    if (this.isRedisReady) {
      try {
        await this.client.set(key, value, { EX: ttlSeconds });
        return;
      } catch (e) {
        // Fallback below
      }
    }
    this.localCache.set(key, value);
    // Auto-prune local cache after TTL
    setTimeout(() => this.localCache.delete(key), ttlSeconds * 1000);
  }
}
