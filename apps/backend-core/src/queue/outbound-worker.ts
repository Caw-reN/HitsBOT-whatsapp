import { Worker, Job } from 'bullmq';
import { redisConnection } from './connection.js';
import { QUEUE_NAMES, OutboundMessageJob } from './types.js';
import { getSocket } from '../whatsapp/index.js';

// ─── Constants (from claude.md Safety Guardrails) ───────────────────────────────
// "Enforce a random 2-4 second delay, push a sendPresenceUpdate('composing')
//  network packet for 2 seconds to mimic real typing, and then fire the text payload."
const MIN_HUMAN_DELAY_MS = 2000;
const MAX_HUMAN_DELAY_MS = 4000;
const COMPOSING_DURATION_MS = 2000;

/**
 * Returns a random integer between min and max (inclusive).
 */
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Async sleep utility.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Worker Instance ────────────────────────────────────────────────────────────
let worker: Worker<OutboundMessageJob> | null = null;

/**
 * Initializes the BullMQ worker that processes outbound WhatsApp messages.
 *
 * Processing pipeline per claude.md spec:
 *  1. Random 2-4 second human-like delay (prevents rate-limit bans)
 *  2. Send 'composing' presence update for 2 seconds (mimics real typing)
 *  3. Send the actual text message via the Baileys socket
 *
 * The worker processes one job at a time (concurrency: 1) to further
 * prevent flooding the WhatsApp network and triggering bans.
 */
export function initializeOutboundWorker(): Worker<OutboundMessageJob> {
  worker = new Worker<OutboundMessageJob>(
    QUEUE_NAMES.MESSAGE_OUTBOUND,
    async (job: Job<OutboundMessageJob>) => {
      const { recipientJid, text } = job.data;

      console.log(
        `[Worker] 🔧 Processing job ${job.id} → ${recipientJid}`
      );

      // ── Step 1: Human-like delay (2-4s) ─────────────────────────────────────
      const delay = randomDelay(MIN_HUMAN_DELAY_MS, MAX_HUMAN_DELAY_MS);
      console.log(`[Worker] ⏳ Waiting ${delay}ms (human delay)...`);
      await sleep(delay);

      // ── Step 2: Format Remote JID & Send Presence ───────────────────────────
      const sock = getSocket();
      
      // Ensure the remote JID is correctly formatted
      let formattedJid = recipientJid;
      if (!formattedJid.includes('@')) {
        formattedJid = `${formattedJid}@s.whatsapp.net`;
      }

      await sock.presenceSubscribe(formattedJid);
      await sock.sendPresenceUpdate('composing', formattedJid);
      console.log(`[Worker] ⌨️  Typing indicator sent to ${formattedJid}...`);
      await sleep(COMPOSING_DURATION_MS);

      // Clear the composing state before sending
      await sock.sendPresenceUpdate('paused', formattedJid);

      // ── Step 3: Send the message strictly in the required format ────────────
      let sentMsg: any = null;
      try {
        console.log(`[Worker] ✉️  Sending text payload to ${formattedJid}`);
        
        // Ensure Baileys sends the text strictly using the correct format:
        // await sock.sendMessage(jid, { text: messageContent })
        sentMsg = await sock.sendMessage(formattedJid, { text });
        
        console.log(
          `[Worker] ✅ Message sent to ${formattedJid} (msgId: ${sentMsg?.key?.id})`
        );
      } catch (baileysErr: any) {
        console.error(`[Worker] ❌ Baileys sendMessage error to ${formattedJid}:`, baileysErr);
        throw baileysErr;
      }

      // Ensure the BullMQ worker processor properly completes the job
      return {
        messageId: sentMsg?.key?.id,
        recipientJid: formattedJid,
        sentAt: new Date().toISOString(),
      };
    },
    {
      connection: redisConnection,
      concurrency: 1,       // Process one message at a time to avoid bans
      limiter: {
        max: 10,             // Max 10 messages per 60s window
        duration: 60_000,
      },
    },
  );

  // ─── Worker Event Listeners ─────────────────────────────────────────────────
  worker.on('completed', (job) => {
    console.log(`[Worker] ✅ Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ❌ Job ${job?.id} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    console.error('[Worker] 🔥 Worker error:', err.message);
  });

  console.log('[Queue] ✅ Outbound message worker initialized');
  return worker;
}

/**
 * Gracefully shuts down the outbound worker.
 * Call during server shutdown to allow in-progress jobs to finish.
 */
export async function shutdownOutboundWorker(): Promise<void> {
  if (worker) {
    console.log('[Queue] Shutting down outbound worker...');
    await worker.close();
    worker = null;
    console.log('[Queue] Outbound worker shut down.');
  }
}
