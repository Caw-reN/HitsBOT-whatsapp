/**
 * Queue Module — Public API
 *
 * Re-exports queue, worker, and connection utilities for clean imports:
 *   import { enqueueOutboundMessage, initializeOutboundWorker } from './queue';
 */

export { redisConnection } from './connection.js';

export { enqueueOutboundMessage, getOutboundQueue } from './outbound-queue.js';

export { initializeOutboundWorker, shutdownOutboundWorker } from './outbound-worker.js';

export type { OutboundMessageJob } from './types.js';
export { QUEUE_NAMES } from './types.js';
