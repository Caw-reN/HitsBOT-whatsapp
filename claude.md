# 🤖 HiTsBOT - Master System Instructions & Architecture Blueprint

This file serves as the absolute Source of Truth and runtime context for Claude Opus within the IDE. You must strictly adhere to the technical stack, system architecture, Neobrutalism design rules, database schemas, and safety guardrails defined below for all code generation, refactoring, and debugging tasks.

---

## 🏗️ 1. System Overview & Architecture

HiTsBOT is an automated AI Customer Service system integrated with WhatsApp using the `Baileys` library. It features an event-driven infrastructure to handle multi-user chat workloads while maintaining platform stability and ban protection via a decoupled queue system.

### Data & Message Lifecycle Pipeline:
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


### Technical Specifications:
- **Frontend Core:** React.js / Next.js (App Router), Tailwind CSS
- **Frontend Animations:** GSAP (GreenSock Animation Platform) & Custom Eases
- **Backend Core:** Node.js (TypeScript Runtime via Express/NestJS), Socket.io
- **Database Engine:** MySQL (Persistent Configs) via Prisma ORM
- **Cache & Queue:** Redis Server v7+ (BullMQ Core & In-Memory Session Context)
- **WhatsApp Network Gateway:** `@adiwajshing/baileys` (TypeScript Fork)
- **Session Auth Persistence:** Local File System (`useMultiFileAuthState`) stored in `apps/backend-core/sessions/` (Gitignored).

---

## 🎨 2. UI/UX Design System & GSAP Animation Rules

HiTsBOT rejects modern minimalist web design (no soft gradients, no blurry shadows, no micro-roundness). It embraces high-contrast colors, thick rigid borders, asymmetric structures, and tactile mechanical interactions.

### Color Palette Design Tokens
Register these tokens inside the Tailwind Configuration file (`tailwind.config.js`):
- **Main Background (`neoBg`):** `#FDFBF7` (Warm Chalk / Cream)
- **Ink Borders/Text:** `#000000` (Pure Black)
- **AI Accents (`neoYellow`):** `#FFE600` (Cyber Yellow)
- **WhatsApp Accents (`neoMint`):** `#00F5A0` (Neon Mint)
- **Alerts/Critical (`neoPink`):** `#FF61A6` (Electric Pink)
- **Warnings (`neoOrange`):** `#FF9900` (Neon Orange)
- **Surface Backdrop:** `#FFFFFF` (Pure White for input fields/text areas)

### Layout Construction Rules (Tailwind CSS)
- **Borders:** Every card, button, modal, and input field MUST use a thick black border: `border-[3px] border-black` or `border-4 border-black`.
- **Hard Shadows (No Blur):** Shadows must be completely sharp, solid black, and shifted directly to the bottom-right. 
  - Standard Card Shadow: `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
  - Large Container Shadow: `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`
- **Typography:** Bold, heavy geometric Sans-Serif font weights (`Plus Jakarta Sans`, `Space Grotesk`, or `Lexend`). Headings must be uppercase tracking wide: `font-black uppercase tracking-wider text-black`.

### GSAP Animation Mechanics
Animations must complement the mechanical, tactile feel of Neobrutalism using snappy, springy easing curves instead of slow fades.
- **Primary Entrance Ease:** `back.out(1.7)` (Produces a snappy elastic bounce overshoot effect).
- **Staggered Page Load:** When elements mount, apply a staggered upward pop sequence using `gsap.from` with `stagger: 0.1`.
- **Tactile Button Press:** Hovering/clicking buttons must translate the element down-right while reducing the hard shadow offset to simulate a real physical click:
  - Hover/Active state: `transform: translate(2px, 2px)`, `box-shadow: 2px 2px 0px 0px rgba(0,0,0,1)`.
- **Alert Status Loop:** If the WhatsApp status drops to `DISCONNECTED`, trigger an infinite, subtle GSAP wiggle/shake loop on the `neoPink` badge to draw immediate attention.

---

## 🗄️ 3. Database Architecture & Prisma Schema

The application state is split into dynamic caching layers and relational structures. 

### Prisma Model Definitions (MySQL Dialect):
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Admin {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  password  String   // Enforced bcrypt hash storage
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([username])
}

model BotConfig {
  id                Int      @id @default(autoincrement())
  botName           String   @default("HiTsBOT Agent") @db.VarChar(100)
  waNumber          String?  @unique @db.VarChar(20)
  waStatus          String   @default("DISCONNECTED") // CONNECTED, DISCONNECTED, SCANNING
  aiProvider        String   @default("gemini") // gemini or openai
  aiApiKey          String?  @db.VarChar(255)
  systemInstruction String?  @db.Text // Maps directly to MySQL LONGTEXT/TEXT
  aiTemperature     Float    @default(0.1)
  updatedAt         DateTime @updatedAt

  @@index([waNumber])
}
Redis Context Retention Strategy:
Rolling Log Cap: Maximum of 5 messages stored per unique customer phone number (JID) to conserve token usage.

Data Lifecycle (TTL): Set an explicit 24-hour expiration on every context hash key to preserve memory footprint.

Key Scheme: hitsbot:context:{whatsappNumber}:{customerJid}

🔒 4. Safety Guardrails & Performance Metrics
Temperature Threshold: Always default or override model parameters to aiTemperature <= 0.2 to eliminate loose hallucinations and keep responses professional.

Prompt Injection Defense: Implement backend interceptors. If a payload contains semantic override flags (e.g., "ignore previous instructions", "lupakan instruksi"), drop database connection pipelines to the AI model instantly and return a hardcoded static fallback text.

Rate Limiting & Delay Automation: Outbound messages must be passed to BullMQ first. Enforce a random 2-4 second delay, push a sendPresenceUpdate('composing') network packet for 2 seconds to mimic real typing, and then fire the text payload.