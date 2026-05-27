import { Queue } from 'bullmq';
import { redisConnection } from './connection.js';
import { QUEUE_NAMES, OutboundMessageJob } from './types.js';

// ─── Queue Instance ─────────────────────────────────────────────────────────────
const outboundQueue = new Queue<OutboundMessageJob>(QUEUE_NAMES.MESSAGE_OUTBOUND, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },  // Keep last 100 completed jobs for debugging
    removeOnFail: { count: 50 },       // Keep last 50 failed jobs for inspection
    attempts: 3,                        // Retry up to 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 5000,                      // 5s → 10s → 20s backoff between retries
    },
  },
});

/**
 * Enqueues an outbound WhatsApp message for delayed, human-like delivery.
 *
 * Per claude.md: "Outbound messages must be passed to BullMQ first."
 * The worker will handle the 2-4s delay + composing state before sending.
 *
 * @param recipientJid - WhatsApp JID (e.g., "628123456789@s.whatsapp.net")
 * @param text - Message text content
 * @param quotedMessageId - Optional message ID to quote/reply to
 * @returns The created BullMQ job
 */
export async function enqueueOutboundMessage(
  recipientJid: string,
  text: string,
  quotedMessageId?: string,
) {
  const job = await outboundQueue.add(
    'send-message',
    {
      recipientJid,
      text,
      quotedMessageId,
      enqueuedAt: new Date().toISOString(),
    },
  );

  console.log(
    `[Queue] 📥 Enqueued message to ${recipientJid} (job: ${job.id})`
  );

  return job;
}

/**
 * Returns the outbound queue instance for monitoring/management.
 */
export function getOutboundQueue(): Queue<OutboundMessageJob> {
  return outboundQueue;
}
