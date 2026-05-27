/**
 * WhatsApp Module — Public API
 *
 * Re-exports the core socket functions and shared types for clean imports:
 *   import { initializeWhatsApp, getSocket } from './whatsapp';
 */

export {
  initializeWhatsApp,
  disconnectWhatsApp,
  getSocket,
  isConnected,
} from './socket.js';

export type {
  WAConnectionStatus,
  WAConnectionUpdate,
  WAEventCallbacks,
} from './types.js';
