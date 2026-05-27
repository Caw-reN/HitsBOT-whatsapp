/**
 * Socket.io Module — Public API
 *
 * Re-exports the gateway functions and event constants for clean imports:
 *   import { initializeSocketIO, broadcastQR } from './socket';
 */

export {
  initializeSocketIO,
  getIO,
  broadcastQR,
  broadcastStatus,
  broadcastMessage,
} from './gateway.js';

export { EVENTS, CLIENT_EVENTS } from './events.js';
