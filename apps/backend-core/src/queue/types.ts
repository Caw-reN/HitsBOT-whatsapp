/**
 * BullMQ Queue & Job Type Definitions
 */

/** Queue name constants */
export const QUEUE_NAMES = {
  MESSAGE_OUTBOUND: 'message-outbound',
} as const;

/**
 * Job payload for outbound WhatsApp messages.
 * This is what gets enqueued and later processed by the worker.
 */
export interface OutboundMessageJob {
  /** WhatsApp JID of the recipient (e.g., "628123456789@s.whatsapp.net") */
  recipientJid: string;

  /** The text content to send */
  text: string;

  /** Optional: quoted message ID for reply context */
  quotedMessageId?: string;

  /** ISO timestamp of when the job was enqueued */
  enqueuedAt: string;
}
