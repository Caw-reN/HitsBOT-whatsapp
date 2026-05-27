import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { EVENTS, CLIENT_EVENTS } from './events.js';
import { WAConnectionUpdate } from '../whatsapp/types.js';
import { isConnected } from '../whatsapp/index.js';

// ─── Module State ───────────────────────────────────────────────────────────────
let io: SocketIOServer | null = null;

// Cache the latest status so newly connected clients get immediate state
let lastStatus: WAConnectionUpdate | null = null;
let lastQR: string | null = null;

/**
 * Returns the Socket.io server instance.
 * Throws if called before `initializeSocketIO()`.
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('[Socket.io] Server not initialized. Call initializeSocketIO() first.');
  }
  return io;
}

/**
 * Initializes the Socket.io server and attaches it to the existing HTTP server.
 *
 * Configuration:
 *  - CORS: Allows all origins in development (tighten for production)
 *  - Transports: WebSocket preferred, with polling fallback
 *  - Path: Default `/socket.io`
 *
 * @param httpServer - The Node.js HTTP server instance (from Express)
 * @returns The initialized Socket.io server
 */
export function initializeSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,   // Keep-alive every 25s
    pingTimeout: 20000,    // Disconnect if no pong in 20s
  });

  // ─── Connection Handler ───────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.io] 🔌 Client connected: ${socket.id}`);

    // Immediately send cached state to the new client so the dashboard
    // renders the correct status without waiting for the next Baileys event
    if (lastStatus) {
      socket.emit(EVENTS.WHATSAPP_STATUS, lastStatus);
    }
    if (lastQR) {
      socket.emit(EVENTS.WHATSAPP_QR, { qr: lastQR });
    }

    // ── Client Requests ───────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.REQUEST_STATUS, () => {
      const status: WAConnectionUpdate = lastStatus || {
        status: isConnected() ? 'CONNECTED' : 'DISCONNECTED',
        timestamp: new Date().toISOString(),
      };
      socket.emit(EVENTS.WHATSAPP_STATUS, status);
    });

    socket.on(CLIENT_EVENTS.REQUEST_QR, () => {
      if (lastQR) {
        socket.emit(EVENTS.WHATSAPP_QR, { qr: lastQR });
      }
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason: string) => {
      console.log(`[Socket.io] ⚡ Client disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('[Socket.io] ✅ Real-time gateway initialized');
  return io;
}

// ─── Broadcast Helpers ────────────────────────────────────────────────────────
// These are called by the WhatsApp module callbacks to push data to all clients.

/**
 * Broadcasts a new QR code to all connected frontend clients.
 * Also caches the QR so late-joining clients receive it immediately.
 *
 * @param qr - Raw QR code string from Baileys
 */
export function broadcastQR(qr: string): void {
  lastQR = qr;
  if (io) {
    io.emit(EVENTS.WHATSAPP_QR, { qr });
    console.log(`[Socket.io] 📡 Broadcasted QR to ${io.engine.clientsCount} client(s)`);
  }
}

/**
 * Broadcasts a WhatsApp connection status update to all connected clients.
 * Caches the status and clears the QR cache when connected (no longer needed).
 *
 * @param update - Structured connection status payload
 */
export function broadcastStatus(update: WAConnectionUpdate): void {
  lastStatus = update;

  // Clear QR cache once authenticated — no need to show stale QR
  if (update.status === 'CONNECTED') {
    lastQR = null;
  }

  if (io) {
    io.emit(EVENTS.WHATSAPP_STATUS, update);
    console.log(
      `[Socket.io] 📡 Broadcasted status [${update.status}] to ${io.engine.clientsCount} client(s)`
    );
  }
}

/**
 * Broadcasts an incoming WhatsApp message to all connected clients.
 * Used by the dashboard to show live message feeds.
 *
 * @param message - Raw Baileys message object
 */
export function broadcastMessage(message: any): void {
  if (io) {
    io.emit(EVENTS.WHATSAPP_MESSAGE, message);
  }
}
