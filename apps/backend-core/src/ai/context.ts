import { Redis } from 'ioredis';

// ─── Constants (from claude.md §3 Redis Context Retention Strategy) ──────────
// Rolling Log Cap: Maximum of 5 messages per unique customer JID
const MAX_CONTEXT_MESSAGES = 5;

// Data Lifecycle (TTL): 24-hour expiration on every context hash key
const CONTEXT_TTL_SECONDS = 24 * 60 * 60; // 86400s

// Key Scheme: hitsbot:context:{whatsappNumber}:{customerJid}
const CONTEXT_KEY_PREFIX = 'hitsbot:context';

/**
 * A single message entry in the chat context.
 * Stored as JSON strings inside a Redis list.
 */
export interface ContextMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

// ─── Redis Client ───────────────────────────────────────────────────────────────
let redis: Redis | null = null;

/**
 * Returns (or creates) the shared Redis client for chat context storage.
 * Separate from BullMQ's connection to avoid contention.
 */
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });

    redis.on('connect', () => console.log('[Redis:Context] ✅ Connected'));
    redis.on('error', (err: Error) => console.error('[Redis:Context] ❌ Error:', err.message));
  }
  return redis;
}

/**
 * Builds the Redis key for a specific conversation.
 *
 * Key Scheme per claude.md: hitsbot:context:{whatsappNumber}:{customerJid}
 *
 * @param botNumber - The bot's WhatsApp number (from BotConfig.waNumber)
 * @param customerJid - The customer's WhatsApp JID (e.g., "628123456789@s.whatsapp.net")
 */
function buildContextKey(botNumber: string, customerJid: string): string {
  return `${CONTEXT_KEY_PREFIX}:${botNumber}:${customerJid}`;
}

/**
 * Retrieves the chat history for a specific customer conversation.
 * Returns the last N messages (up to MAX_CONTEXT_MESSAGES) in chronological order.
 *
 * @param botNumber - The bot's WhatsApp number
 * @param customerJid - The customer's WhatsApp JID
 * @returns Array of context messages (oldest → newest)
 */
export async function getChatHistory(
  botNumber: string,
  customerJid: string,
): Promise<ContextMessage[]> {
  const client = getRedis();
  const key = buildContextKey(botNumber, customerJid);

  const rawMessages = await client.lrange(key, 0, -1);
  return rawMessages.map((raw: string) => JSON.parse(raw) as ContextMessage);
}

/**
 * Appends a new message to the chat context and enforces the rolling log cap.
 *
 * Per claude.md: "Maximum of 5 messages stored per unique customer phone number (JID)"
 * This means 5 total entries (both user and model messages combined).
 *
 * Also refreshes the 24-hour TTL on every write to keep active conversations alive.
 *
 * @param botNumber - The bot's WhatsApp number
 * @param customerJid - The customer's WhatsApp JID
 * @param message - The message to append
 */
export async function appendToHistory(
  botNumber: string,
  customerJid: string,
  message: ContextMessage,
): Promise<void> {
  const client = getRedis();
  const key = buildContextKey(botNumber, customerJid);

  // Push to the end of the list (chronological order)
  await client.rpush(key, JSON.stringify(message));

  // Trim to keep only the last MAX_CONTEXT_MESSAGES entries (rolling cap)
  await client.ltrim(key, -MAX_CONTEXT_MESSAGES, -1);

  // Refresh TTL — 24-hour expiration per claude.md
  await client.expire(key, CONTEXT_TTL_SECONDS);
}

/**
 * Clears the chat history for a specific conversation.
 * Useful when a customer session ends or an admin resets context.
 */
export async function clearHistory(
  botNumber: string,
  customerJid: string,
): Promise<void> {
  const client = getRedis();
  const key = buildContextKey(botNumber, customerJid);
  await client.del(key);
}

/**
 * Gracefully disconnects the Redis context client.
 * Call during server shutdown.
 */
export async function disconnectContextRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    console.log('[Redis:Context] Disconnected.');
  }
}
