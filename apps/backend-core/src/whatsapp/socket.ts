import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import path from 'path';
import pino from 'pino';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { WAConnectionStatus, WAConnectionUpdate, WAEventCallbacks } from './types.js';

// Reconstruct __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Constants ──────────────────────────────────────────────────────────────────
// Session auth persistence path as defined in claude.md:
// "Local File System (useMultiFileAuthState) stored in apps/backend-core/sessions/"
const SESSIONS_DIR = path.resolve(__dirname, '../../sessions');

// Maximum consecutive reconnection attempts before giving up
const MAX_RECONNECT_RETRIES = 5;

// Delay between reconnection attempts (ms) — prevents hammering the WA servers
const RECONNECT_DELAY_MS = 3000;

// Baileys logger — silent by default to keep console clean
const logger = pino({ level: 'silent' });

// ─── Module State ───────────────────────────────────────────────────────────────
let sock: WASocket | null = null;
let reconnectAttempts = 0;
let eventCallbacks: WAEventCallbacks | null = null;

/**
 * Returns the current active Baileys socket instance.
 * Throws if called before `initializeWhatsApp()`.
 */
export function getSocket(): WASocket {
  if (!sock) {
    throw new Error('[WhatsApp] Socket not initialized. Call initializeWhatsApp() first.');
  }
  return sock;
}

/**
 * Returns the current connection status without requiring a socket reference.
 */
export function isConnected(): boolean {
  return sock?.user !== undefined;
}

/**
 * Initializes the Baileys WhatsApp socket with multi-file auth state persistence.
 *
 * Lifecycle:
 *  1. Loads (or creates) auth credentials from the sessions/ directory
 *  2. Creates a WASocket with the latest Baileys version
 *  3. Registers event listeners for connection updates, credential saves, and messages
 *  4. Handles automatic reconnection on non-logout disconnects
 *
 * @param callbacks - Event callbacks for QR, connection changes, and incoming messages
 */
export async function initializeWhatsApp(callbacks: WAEventCallbacks): Promise<WASocket> {
  eventCallbacks = callbacks;

  // Load persisted auth state from local filesystem
  const { state, saveCreds } = await useMultiFileAuthState(SESSIONS_DIR);

  // Fetch the latest WA Web version to avoid version mismatch bans
  const { version } = await fetchLatestBaileysVersion();
  console.log(`[WhatsApp] Connecting with Baileys WA v${version.join('.')}`);

  // Create the Baileys socket
  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,  // Also prints to terminal as fallback
    generateHighQualityLinkPreview: false,
    // Browser identification to reduce ban risk
    browser: ['HiTsBOT', 'Chrome', '22.0'],
  });

  // ─── Event: Credential Updates ──────────────────────────────────────────────
  // WhatsApp frequently rotates Signal session keys.
  // Failing to persist these causes message decryption failures.
  sock.ev.on('creds.update', saveCreds);

  // ─── Event: Connection State Changes ────────────────────────────────────────
  sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
    handleConnectionUpdate(update, callbacks);
  });

  // ─── Event: Incoming Messages ───────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Only process new notify-type messages (not history sync)
    if (type !== 'notify') return;

    for (const message of messages) {
      // Skip messages sent by the bot itself
      if (message.key.fromMe) continue;
      // Skip status broadcast messages
      if (message.key.remoteJid === 'status@broadcast') continue;

      console.log(
        `[WhatsApp] 📩 Message from ${message.key.remoteJid}:`,
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        '[media/other]'
      );

      callbacks.onMessageReceived(message);
    }
  });

  return sock;
}

/**
 * Handles connection.update events from Baileys.
 * Maps Baileys states to the app's WAConnectionStatus enum and manages reconnection logic.
 */
function handleConnectionUpdate(
  update: Partial<ConnectionState>,
  callbacks: WAEventCallbacks
): void {
  const { connection, lastDisconnect, qr } = update;

  // ── QR Code Generated ───────────────────────────────────────────────────────
  // Emitted when Baileys needs the user to scan a QR code for authentication.
  if (qr) {
    console.log('[WhatsApp] 📱 QR code received — waiting for scan...');
    reconnectAttempts = 0; // Reset retry counter on new QR

    const connectionUpdate: WAConnectionUpdate = {
      status: 'SCANNING',
      qr,
      timestamp: new Date().toISOString(),
    };

    callbacks.onQR(qr);
    callbacks.onConnectionUpdate(connectionUpdate);
  }

  // ── Connection Opened ───────────────────────────────────────────────────────
  if (connection === 'open') {
    reconnectAttempts = 0;
    const phoneNumber = sock?.user?.id?.split(':')[0] || 'unknown';
    console.log(`[WhatsApp] ✅ Connected successfully as ${phoneNumber}`);

    const connectionUpdate: WAConnectionUpdate = {
      status: 'CONNECTED',
      timestamp: new Date().toISOString(),
      isNewLogin: (update as any).isNewLogin ?? false,
    };

    callbacks.onConnectionUpdate(connectionUpdate);
  }

  // ── Connection Closed ───────────────────────────────────────────────────────
  if (connection === 'close') {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    const errorMessage = (lastDisconnect?.error as Boom)?.message || 'Unknown error';

    // If the user explicitly logged out or session became unauthorized (401)
    const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

    console.log(
      `[WhatsApp] ❌ Connection closed — code: ${statusCode}, reason: "${errorMessage}", ` +
      `loggedOut: ${isLoggedOut}`
    );

    const connectionUpdate: WAConnectionUpdate = {
      status: 'DISCONNECTED',
      timestamp: new Date().toISOString(),
    };
    callbacks.onConnectionUpdate(connectionUpdate);

    if (!isLoggedOut && reconnectAttempts < MAX_RECONNECT_RETRIES) {
      reconnectAttempts++;
      console.log(
        `[WhatsApp] 🔄 Reconnecting (attempt ${reconnectAttempts}/${MAX_RECONNECT_RETRIES}) ` +
        `in ${RECONNECT_DELAY_MS / 1000}s...`
      );

      setTimeout(() => {
        if (eventCallbacks) {
          initializeWhatsApp(eventCallbacks).catch((err) => {
            console.error('[WhatsApp] ❌ Reconnection initialization failed:', err);
          });
        }
      }, RECONNECT_DELAY_MS);
    } else if (isLoggedOut) {
      console.log('[WhatsApp] 🚪 Logged out (401) — cleaning sessions directory...');
      
      // Clean sessions directory to trigger fresh QR code on next connect
      try {
        if (fs.existsSync(SESSIONS_DIR)) {
          fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(SESSIONS_DIR, { recursive: true });
        console.log('[WhatsApp] 🧹 Sessions directory successfully cleaned.');
      } catch (err: any) {
        console.error('[WhatsApp] ❌ Error cleaning sessions directory:', err.message);
      }

      // Reset socket state
      sock = null;
      reconnectAttempts = 0;

      // Automatically re-initialize Baileys connection instance right after cleaning up,
      // so a fresh QR code is immediately generated and streamed to the frontend
      if (eventCallbacks) {
        console.log('[WhatsApp] 🔄 Re-initializing connection to generate a fresh QR...');
        initializeWhatsApp(eventCallbacks).catch((err) => {
          console.error('[WhatsApp] ❌ Failed to re-initialize WhatsApp after logout:', err);
        });
      }
    } else {
      console.log('[WhatsApp] 💀 Max reconnection attempts reached. Giving up.');
    }
  }
}

/**
 * Gracefully disconnects the WhatsApp socket.
 * Call this during server shutdown to prevent dangling connections.
 */
export async function disconnectWhatsApp(): Promise<void> {
  if (sock) {
    console.log('[WhatsApp] Disconnecting...');
    await sock.logout().catch(() => {
      // Ignore errors during logout (socket may already be dead)
    });
    sock.end(undefined);
    sock = null;
    reconnectAttempts = 0;
    console.log('[WhatsApp] Disconnected.');
  }
}
