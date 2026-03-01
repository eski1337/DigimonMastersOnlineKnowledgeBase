/**
 * Redis Client
 *
 * Provides a shared Redis connection for rate limiting, caching, and queues.
 * Falls back to in-memory store if REDIS_URL is not configured (dev mode).
 */

import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionFailed = false;

async function getRedis(): Promise<Redis | null> {
  if (connectionFailed) return null;
  if (redisClient) return redisClient;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        if (times > 3) {
          connectionFailed = true;
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });
    await redisClient.connect();
    return redisClient;
  } catch {
    connectionFailed = true;
    redisClient = null;
    return null;
  }
}

export { getRedis };
