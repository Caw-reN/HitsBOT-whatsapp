import { ConnectionOptions } from 'bullmq';

/**
 * Shared Redis connection config for all BullMQ queues and workers.
 * Reads from environment variables with sensible local defaults.
 *
 * Per claude.md: "Cache & Queue: Redis Server v7+ (BullMQ Core)"
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,  // Required by BullMQ — disables retry limit
};
