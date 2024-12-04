import Redis from 'ioredis';
import { env } from './env';

// For testing purposes
export const createRedisClient = () => {
  return new Redis(env.REDIS_URL);
};

// Singleton instance for production use
let redisClient: Redis | null = null;

export const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
};

// Export the redis client instance
export const redis = getRedisClient();

// Test utilities
export const createTestRedisClient = () => {
  return new Redis('redis://localhost:6379/1');
};

export const clearTestRedisDb = async () => {
  const client = createTestRedisClient();
  await client.flushdb();
  await client.quit();
};

// Cleanup utility
export const closeRedisConnection = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};
