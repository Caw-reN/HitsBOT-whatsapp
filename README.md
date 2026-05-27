# 🤖 HiTsBOT - Intelligent AI WhatsApp Gateway & CS Assistant

HiTsBOT is a robust, production-ready AI-powered Customer Service automation platform integrated directly with WhatsApp. Powered by the **Baileys** library, **MySQL**, and **Gemini/OpenAI APIs**, HiTsBOT features a highly engaging web management console styled in vibrant **Cheerful Neobrutalism** and animated with **GSAP**.

---

## 🏗️ 1. Architecture & Message Lifecycle

HiTsBOT utilizes a decoupled, event-driven infrastructure to handle multi-user chat workloads while maintaining maximum platform stability and bypass protection.

[Customer WhatsApp]
│
▼
[WhatsApp Worker (Baileys)]
│
▼ (Webhook Layer)
[Core API Server (Express/NestJS)] <───> [Redis: Chat Session Memory]
│
▼ (Prompt Injection Guardrails)
[AI Engine (Gemini / OpenAI API)]
│
▼ (JSON Clean Payload)
[BullMQ Outbound Queue]
│
▼ (2-4s Human Delay & 'composing' state)
[WhatsApp Worker (Baileys)] ───────► [Customer Response Received]


### Deep-Dive Flow:
1. **Ingestion:** A customer message is caught by the `whatsapp-worker` via active WebSockets mimicking a WhatsApp Web client.
2. **Context Assembly:** The Backend intercepts the event, fetching exactly the last 5 chat logs from **Redis** to construct a dynamic, token-efficient memory thread.
3. **Guardrail Check:** System filters incoming text against hardcoded injection keywords (e.g., *"ignore previous instructions"*). If triggered, the AI is bypassed, and a static rejection template fires.
4. **AI Inference:** Cleansed context + `systemInstruction` are sent out to the AI Provider using an absolute strict temperature framework (`0.1`).
5. **Throttled Queueing:** The output payload enters **BullMQ**. Instead of instant robotic dispatching, it enforces a randomized 2-4 second delay, fires a `sendPresenceUpdate('composing')` typing network packet for 2 seconds, and then relays the text out via Baileys.

---

## 🛠️ 2. Tech Stack

- **Frontend Core:** React.js / Next.js (App Router), Tailwind CSS
- **Frontend Animations:** GSAP (GreenSock Animation Platform) & Custom Eases
- **Backend Core:** Node.js (TypeScript Runtime via Express/NestJS), Socket.io
- **Database Engine:** MySQL (Persistent Configs) via Prisma ORM
- **Cache & Queue:** Redis Server v7+ (BullMQ Core & In-Memory Sess Context)
- **WhatsApp Network Gateway:** `@adiwajshing/baileys` (TypeScript Fork)

---

## ⚙️ 3. Environment Variables Configuration

Create a `.env` file inside your core backend/root workspace:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
JWT_SECRET=your_ultra_secure_neobrutalism_secret_key

# Database Connection (MySQL Dialect)
DATABASE_URL="mysql://root:password@localhost:3306/hitsbot_db"

# Cache & Message Broker Infrastructure
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Fallback AI Keys (Can also be overridden dynamically via MySQL Admin Dashboard)
GEMINI_API_KEY=AIzaSyYourGeminiKeyHere
OPENAI_API_KEY=sk-proj-YourOpenAIKeyHere
📂 4. Project Directory Structure
Plaintext
hitsbot-monorepo/
├── apps/
│   ├── frontend/                 # React/Next.js UI (Dashboard)
│   │   ├── src/
│   │   │   ├── components/       # Custom Neobrutalism UI Blocks
│   │   │   ├── hooks/            # GSAP Hook wrappers & Socket triggers
│   │   │   └── pages/            # Viewports (Login, Dashboard, Core Settings)
│   │   └── tailwind.config.js    # Custom Theme Configuration Mapping
│   │
│   └── backend-core/             # Mono Backend API & WhatsApp Engine
│       ├── prisma/
│       │   └── schema.prisma     # Prisma Data Model Declarations
│       ├── src/
│       │   ├── config/           # Redis, Prisma, and Provider Init
│       │   ├── guards/           # Injection Filters & Security Checkpoints
│       │   ├── queues/           # BullMQ Outbound Worker Definitions
│       │   ├── sockets/          # Socket.io instance for Real-time QR Broadcast
│       │   └── whatsapp/         # Baileys client setup & Event Listeners
│       └── sessions/             # gitignored MultiFileAuth local storage directory
🚀 5. Quick-Start Guide (Development Installation)
Prerequisites:
Node.js v18 or higher installed.

MySQL Server instance running.

Redis Server active locally (redis-server).

Step-by-Step Setup:
Clone and Install dependencies:

Bash
   git clone [https://github.com/yourusername/hitsbot.git](https://github.com/yourusername/hitsbot.git)
   cd hitsbot
   npm install
Database Migration Pipeline:
Configure your DATABASE_URL within .env, then run Prisma migration models:

Bash
   npx prisma migrate dev --name init_hitsbot_models
   npx prisma generate
Start Core Services (Development Mode):

Bash
   # Terminal 1 - Backend Server & Worker Engines
   cd apps/backend-core
   npm run dev

   # Terminal 2 - Frontend Dashboard Interface
   cd apps/frontend
   npm run dev
Pairing Instance:
Navigate to http://localhost:3000, log in using default seed admin configs, navigate to WhatsApp Devices, wait for the real-time Neobrutalism card component to display the QR string code stream via WebSockets, and scan using your desired secondary WhatsApp mobile device client.

🔒 6. System Safety Guardrails (Prompt Isolation Blueprint)
To maintain contextual accuracy, any prompt evaluated must strictly be enclosed and enforced within our dual-layer design layout system:

Temperature Cap: BotConfig.aiTemperature is strictly hard-capped to <= 0.2.

System Bypass Defense: If the incoming string text payload matches phrases like "forget everything", "lupakan instruksi", "ignore previous instructions", or "reset role", backend components immediately drop connection pipes to the API Provider, mutating the transaction to a local fallback notice output string.