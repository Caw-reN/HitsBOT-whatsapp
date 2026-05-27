/**
 * Socket.io Event Constants
 *
 * Centralized event name registry to prevent typo-bugs and ensure
 * the frontend and backend always reference the same channel names.
 */

// ─── Server → Client (Broadcast) Events ─────────────────────────────────────
export const EVENTS = {
  /** Emits the raw QR code string for frontend rendering */
  WHATSAPP_QR: 'whatsapp:qr',

  /** Emits WAConnectionUpdate payload on every status change */
  WHATSAPP_STATUS: 'whatsapp:status',

  /** Emits incoming customer message data */
  WHATSAPP_MESSAGE: 'whatsapp:message',
} as const;

// ─── Client → Server (Request) Events ───────────────────────────────────────
export const CLIENT_EVENTS = {
  /** Client requests the current WhatsApp connection status */
  REQUEST_STATUS: 'whatsapp:request-status',

  /** Client requests a fresh QR code generation (re-scan) */
  REQUEST_QR: 'whatsapp:request-qr',
} as const;
