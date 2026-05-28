import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initializeSocketIO, broadcastQR, broadcastStatus, broadcastMessage } from './socket/index.js';
import { initializeWhatsApp, disconnectWhatsApp } from './whatsapp/index.js';
import { initializeOutboundWorker, shutdownOutboundWorker } from './queue/index.js';
import { handleIncomingMessage, disconnectAI, disconnectContextRedis } from './ai/index.js';
import { getPrisma, disconnectPrisma } from './prisma.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Bot Settings API Endpoints ──────────────────────────────────────────────────
app.get('/api/settings', async (_req, res) => {
  try {
    const prisma = getPrisma();
    let config = await prisma.botConfig.findFirst();
    if (!config) {
      config = await prisma.botConfig.create({
        data: {
          botName: 'HiTsBOT Agent',
          aiProvider: 'gemini',
          aiTemperature: 0.1,
          systemInstruction: 'Kamu adalah HiTsBOT Agent, asisten customer service AI...',
        },
      });
    }
    res.json(config);
  } catch (err: any) {
    console.error('[API] Error fetching bot settings:', err.message);
    res.status(500).json({ error: 'Gagal mengambil konfigurasi bot' });
  }
});

const handleSaveSettings = async (req: express.Request, res: express.Response) => {
  try {
    const prisma = getPrisma();
    
    // Explicitly parse the fields: const { aiApiKey, systemInstruction, aiTemperature } = req.body;
    const { aiApiKey, systemInstruction, aiTemperature } = req.body;

    // Convert temperature safely: const temp = parseFloat(aiTemperature) || 0.7;
    const temp = parseFloat(aiTemperature) || 0.7;

    // First, try to find if ANY configuration row exists using const existing = await prisma.botConfig.findFirst();
    const existing = await prisma.botConfig.findFirst();

    if (existing) {
      // If an existing row is found, update it using its actual ID:
      await prisma.botConfig.update({
        where: { id: existing.id },
        data: {
          aiApiKey,
          systemInstruction,
          aiTemperature: temp,
        },
      });
    } else {
      // If NO row exists, create the very first row:
      await prisma.botConfig.create({
        data: {
          aiApiKey,
          systemInstruction,
          aiTemperature: temp,
        },
      });
    }

    // Wrap it in a proper response so it returns status(200).json({ success: true }) if successful
    res.status(200).json({ success: true });
  } catch (err: any) {
    // and logs the exact error to the terminal if it fails.
    console.error('[API] Error saving bot settings:', err);
    res.status(500).json({ error: 'Gagal menyimpan konfigurasi bot', details: err.message });
  }
};

app.post('/api/settings', handleSaveSettings);
app.put('/api/settings', handleSaveSettings);

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
  await disconnectPrisma();
  httpServer.close(() => {
    console.log('[HiTsBOT] Server closed. Goodbye! 👋');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
