import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initializeSocketIO, broadcastQR, broadcastStatus, broadcastMessage } from './socket/index.js';
import { initializeWhatsApp } from './whatsapp/index.js';

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
  },
}).catch((err) => {
  console.error('[HiTsBOT] Failed to initialize WhatsApp:', err);
});

// ─── Start Server ───────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`🚀 HiTsBOT Core API + Socket.io running on port ${PORT}`);
});
