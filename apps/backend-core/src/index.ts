import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initializeSocketIO, broadcastQR, broadcastStatus, broadcastMessage } from './socket/index.js';
import { initializeWhatsApp, disconnectWhatsApp } from './whatsapp/index.js';
import { initializeOutboundWorker, shutdownOutboundWorker } from './queue/index.js';
import { handleIncomingMessage, disconnectAI, disconnectContextRedis } from './ai/index.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Create HTTP Server (shared between Express & Socket.io) ────────────────────
const httpServer = createServer(app);

// ─── Initialize Socket.io Gateway ───────────────────────────────────────────────
initializeSocketIO(httpServer);

// ─── Initialize BullMQ Outbound Worker ──────────────────────────────────────────
initializeOutboundWorker();

// ─── Initialize WhatsApp with Socket.io Broadcast Callbacks ─────────────────────
initializeWhatsApp({
  onQR: (qr) => {
    broadcastQR(qr);
  },
  onConnectionUpdate: (update) => {
    broadcastStatus(update);
  },
  onMessageReceived: (message) => {
    broadcastMessage(message);

    // Extract text content and route through AI pipeline
    const text =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text;

    if (text && message.key.remoteJid) {
      handleIncomingMessage(
        message.key.remoteJid,
        text,
        message.key.id || undefined,
      ).catch((err: any) =>
        console.error('[HiTsBOT] AI pipeline error:', err.message)
      );
    }
  },
}).catch((err) => {
  console.error('[HiTsBOT] Failed to initialize WhatsApp:', err);
});

// ─── Start Server ───────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 HiTsBOT Core API + Socket.io + BullMQ running on port ${PORT}`);
});

// ─── Graceful Shutdown ──────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  console.log(`\n[HiTsBOT] ${signal} received — shutting down gracefully...`);
  await shutdownOutboundWorker();
  await disconnectWhatsApp();
  await disconnectAI();
  await disconnectContextRedis();
  httpServer.close(() => {
    console.log('[HiTsBOT] Server closed. Goodbye! 👋');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
