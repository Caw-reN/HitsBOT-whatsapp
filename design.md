# 🎨 HiTsBOT - UI/UX Design System & GSAP Animation Guidelines

This document serves as the absolute visual and behavioral source of truth for the **HiTsBOT** Admin Dashboard. All frontend components, styles, layouts, and animations must strictly follow the rules defined below.

---

## 1. Aesthetic Archetype: Cheerful Neobrutalism

HiTsBOT intentionally rejects modern minimalist web design (no soft gradients, no blurry shadows, no micro-roundness). It embraces high-contrast colors, thick rigid borders, asymmetric structures, and tactile mechanical interactions.

### 🎨 Color Palette Specifications
Register these tokens inside the Tailwind Configuration file (`tailwind.config.js`):

| Token Name  | Hex Code  | Design Application Reference |
| :---        | :---      | :--- |
| `neoBg`     | `#FDFBF7` | Main page body canvas background (Warm Chalk/Cream) |
| `black`     | `#000000` | Applied to all text, structural borders, and hard shadows |
| `neoYellow` | `#FFE600` | AI Module cards, Core Prompts branding, and primary action triggers |
| `neoMint`   | `#00F5A0` | WhatsApp Active status indicators, success notifications, and pair buttons |
| `neoPink`   | `#FF61A6` | Critical warnings, Disconnected badges, and destructive actions (Delete/Logout) |
| `neoOrange` | `#FF9900` | System warnings, pending states, and queue rate-limit indicators |
| `white`     | `#FFFFFF` | Input field backgrounds and standard readable container backdrops |

---

## 2. Core Layout & Tailwind Structural Rules

Every rendered UI element must strictly implement these layout foundations to keep the Neobrutalism theme consistent:

### 🔲 Borders & Outlines
- **Rule:** Every card, button, modal, and input field MUST use a thick black border.
- **Tailwind Utility Classes:** `border-[3px] border-black` or `border-4 border-black`. 
- **Radius:** Do not use full pills or hyper-rounded curves unless specified. Use `rounded-xl` or `rounded-2xl` for containers, and `rounded-lg` for buttons/badges.

### 📐 Hard Drop Shadows (No Blur)
- **Rule:** Shadows must be completely sharp, solid black, and shifted directly to the bottom-right. Never use `shadow-md` or `shadow-lg` which contain blurs.
- **Standard Card Shadow:** `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`
- **Large Container Shadow:** `shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]`

### 🔤 Typography
- **Font Stack:** Clean, heavy geometric Sans-Serif (e.g., `Plus Jakarta Sans`, `Space Grotesk`, or `Lexend`).
- **Headings:** Headers must be thick, punchy, and tracking-wide. Example: `font-black uppercase tracking-wider text-black`.

---

## 3. Component Code Blueprints (Tailwind Reference)

### A. The Interactive Neobrutalism Button
```html
<button class="bg-[#FFE600] text-black font-black py-3 px-6 border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all duration-100">
  SAVE SETTINGS
</button>
B. Standard Dashboard Container Card
HTML
<div class="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
  <div class="bg-[#00F5A0] border-2 border-black rounded-lg px-3 py-1 text-xs font-black inline-block mb-4 uppercase tracking-wider">
    Status: Active
  </div>
  <h3 class="text-xl font-black mb-2 uppercase">Configuration Header</h3>
  <p class="font-medium text-black/80">Card contextual body text goes here.</p>
</div>
4. GSAP Animation Engine Specifications
To prevent the layout from feeling dead or frustratingly rigid, GSAP (GreenSock Animation Platform) must be leveraged to create elastic, snappy, and tactile micro-interactions.

🏎️ Core Animation Curves & Eases
Neobrutalism components must "pop" or "snap" violently into place rather than slowly fading.

Primary Entrance Ease: back.out(1.7) (Produces a snappy elastic bounce overshoot effect).

Secondary Interaction Ease: power2.out (For clean, predictable UI movements).

🎬 Required UI Animation Sequences
1. Page Initialization (Staggered Entrance)
When a dashboard view or card cluster mounts, items must not load instantly. Apply a staggered upward pop sequence:

JavaScript
gsap.from(".neo-card-animate", {
  duration: 0.5,
  y: 40,
  opacity: 0,
  stagger: 0.1,
  ease: "back.out(1.5)"
});
2. WhatsApp Real-Time Connection Alert (Infinite Loop)
If the state drops to DISCONNECTED, the tracking state badge must perform an infinite attention-grabbing vibration cycle to alert the operator:

JavaScript
// Triggers an infinite, subtle mechanical wiggle loop
gsap.to(".badge-disconnected", {
  rotation: 3,
  duration: 0.15,
  repeat: 5,
  yoyo: true,
  ease: "power1.inOut",
  onComplete: () => {
    // Re-trigger every 3 seconds dynamically
    gsap.delayedCall(3, () => myWiggleFunction());
  }
});
3. QR Streaming Overlay & Scan Celebration
Streaming State: While streaming strings over WebSockets into the component canvas, keep an overlay line pacing downward via GSAP infinitely (y: "100%", repeat: -1).

Success Pairing State: Once Socket.io emits CONNECTED, animate the QR canvas container shrinking down dynamically into a small checkbox badge, followed by an elastic scale-up explosion (scale: 1.2 cascading back to scale: 1) using ease: "elastic.out(1, 0.5)".

4. Interactive Tactile Input Focus
When an administrator clicks into an input field or data text area, use GSAP to slightly inflate the targeted elements border layer or slightly shift its container background fill to increase visual responsiveness.

JavaScript
gsap.to(inputRef, {
  scale: 1.01,
  duration: 0.2,
  ease: "power2.out"
});