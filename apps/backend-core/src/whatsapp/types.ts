/**
 * WhatsApp connection status types aligned with BotConfig.waStatus in Prisma schema.
 * Values: CONNECTED, DISCONNECTED, SCANNING
 */
export type WAConnectionStatus = 'CONNECTED' | 'DISCONNECTED' | 'SCANNING';

/**
 * Structured event payload emitted on connection state changes.
 * Consumed by Socket.io to push real-time updates to the frontend dashboard.
 */
export interface WAConnectionUpdate {
  status: WAConnectionStatus;
  qr?: string;           // Base64-encoded QR string (only present during SCANNING)
  timestamp: string;      // ISO 8601 timestamp of the event
  isNewLogin?: boolean;   // True when this is a fresh QR scan login
}

/**
 * Callback signatures for WhatsApp event listeners.
 * Used by the core socket module to decouple event handling from business logic.
 */
export interface WAEventCallbacks {
  onQR: (qr: string) => void;
  onConnectionUpdate: (update: WAConnectionUpdate) => void;
  onMessageReceived: (message: any) => void;
}
