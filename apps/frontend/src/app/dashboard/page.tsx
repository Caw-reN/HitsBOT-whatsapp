"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { gsap } from "gsap";
import { 
  Bot, 
  Terminal, 
  Settings, 
  LogOut, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  MessageSquare, 
  Cpu, 
  Activity, 
  Layers,
  QrCode,
  ShieldCheck,
  Send,
  HelpCircle
} from "lucide-react";

// Types matching backend specifications
interface WAConnectionUpdate {
  status: "CONNECTED" | "DISCONNECTED" | "SCANNING" | "INITIALIZING";
  qr?: string;
  timestamp: string;
  isNewLogin?: boolean;
}

interface IncomingMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message?: {
    conversation?: string;
    extendedTextMessage?: {
      text?: string;
    };
  };
  messageTimestamp?: number;
}

interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: "info" | "success" | "error" | "message";
  text: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<WAConnectionUpdate["status"]>("DISCONNECTED");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [stats, setStats] = useState({
    totalMessages: 142,
    activeUsers: 8,
    uptime: "2d 4h 12m",
    redisStatus: "AKTIF"
  });

  const [consoleLogs, setConsoleLogs] = useState<ConsoleLogEntry[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console logs
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [consoleLogs]);

  // Handle Socket.io connection and listeners
  useEffect(() => {
    setMounted(true);
    setConsoleLogs([
      {
        id: "init-1",
        timestamp: new Date().toLocaleTimeString(),
        type: "info",
        text: "Dashboard initialized. Menghubungkan ke Socket.io..."
      }
    ]);

    const backendUrl = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");
    
    // Initialize Socket.io client
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      addConsoleEntry("success", "Koneksi Socket.io berhasil terhubung ke backend.");
      // Request current status
      socket.emit("whatsapp:request-status");
    });

    socket.on("disconnect", (reason) => {
      setSocketConnected(false);
      setStatus("DISCONNECTED");
      addConsoleEntry("error", `Koneksi Socket.io terputus: ${reason}`);
    });

    // Listen to whatsapp:status changes
    socket.on("whatsapp:status", (data: WAConnectionUpdate) => {
      setStatus(data.status);
      addConsoleEntry(
        data.status === "CONNECTED" ? "success" : "info",
        `WhatsApp status update: ${data.status}`
      );
      
      if (data.status === "CONNECTED") {
        setQrCode(null);
      } else if (data.qr) {
        setQrCode(data.qr);
      }
    });

    // Listen to whatsapp:qr generation
    socket.on("whatsapp:qr", (data: { qr: string }) => {
      setQrCode(data.qr);
      setStatus("SCANNING");
      addConsoleEntry("info", "Kode QR WhatsApp baru berhasil diterima.");
    });

    // Listen to live message events
    socket.on("whatsapp:message", (message: IncomingMessage) => {
      // Increment message stats
      setStats((prev) => ({ ...prev, totalMessages: prev.totalMessages + 1 }));

      const text =
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        "[Media/Lainnya]";
      const sender = message.key.remoteJid.split("@")[0];

      addConsoleEntry(
        "message",
        `Pesan masuk dari ${sender}: "${text}"`
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Snappy GSAP staggered entrance on mount
  useEffect(() => {
    if (!mounted) return;

    const ctx = gsap.context(() => {
      // Stagger entrance for sidebar, header, and grid elements
      const tl = gsap.timeline();
      
      tl.fromTo(
        ".sidebar-item",
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.08, duration: 0.5, ease: "back.out(1.2)" }
      );

      tl.fromTo(
        ".header-item",
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" },
        "-=0.2"
      );

      tl.fromTo(
        ".grid-card",
        { scale: 0.9, y: 30, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, stagger: 0.08, duration: 0.6, ease: "back.out(1.4)" },
        "-=0.3"
      );
    }, containerRef);

    return () => ctx.revert();
  }, [mounted]);

  const addConsoleEntry = (type: ConsoleLogEntry["type"], text: string) => {
    setConsoleLogs((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        type,
        text
      }
    ]);
  };

  const handleLogout = () => {
    addConsoleEntry("info", "Melakukan logout...");
    router.push("/login");
  };

  const handleRefreshStatus = () => {
    if (socketRef.current) {
      addConsoleEntry("info", "Meminta status WhatsApp terbaru...");
      socketRef.current.emit("whatsapp:request-status");
    }
  };

  const handleRequestNewQR = () => {
    if (socketRef.current) {
      addConsoleEntry("info", "Meminta regenerasi Kode QR...");
      socketRef.current.emit("whatsapp:request-qr");
    }
  };

  // Helper to color-code console entries
  const getLogStyle = (type: ConsoleLogEntry["type"]) => {
    switch (type) {
      case "success":
        return "text-neo-mint font-extrabold";
      case "error":
        return "text-neo-pink font-extrabold";
      case "message":
        return "text-neo-yellow font-extrabold";
      default:
        return "text-white font-medium";
    }
  };

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-neo-bg text-black font-sans">
        <div className="flex flex-col items-center gap-4 bg-neo-white border-[4px] border-black p-8 shadow-neo">
          <div className="w-10 h-10 border-[4px] border-black border-t-transparent rounded-full animate-spin"></div>
          <span className="font-black uppercase tracking-wider text-sm">
            Memulai Panel Monitor...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex h-screen bg-neo-bg text-black font-sans overflow-hidden"
    >
      {/* ─── SIDEBAR (Neobrutalism Style) ─── */}
      <aside className="w-64 bg-neo-white border-r-[4px] border-black flex flex-col justify-between p-6 select-none shrink-0 z-10">
        <div>
          {/* Logo Brand */}
          <div className="sidebar-item flex items-center gap-3 bg-neo-yellow border-[3px] border-black p-3 shadow-neo-sm mb-8">
            <Bot className="stroke-[2.5px] text-black" size={24} />
            <span className="font-black text-lg tracking-wider uppercase">
              HiTsBOT
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4">
            <button className="sidebar-item w-full flex items-center gap-3 bg-neo-mint border-[3px] border-black text-black font-black uppercase text-xs tracking-wider p-3.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active transition-all cursor-pointer">
              <Activity size={18} className="stroke-[2.5px]" />
              Status Monitor
            </button>
            <button 
              onClick={() => router.push("/dashboard/settings")}
              className="sidebar-item w-full flex items-center gap-3 bg-neo-white border-[3px] border-black text-black font-black uppercase text-xs tracking-wider p-3.5 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-active active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
            >
              <Settings size={18} className="stroke-[2.5px]" />
              Bot Configs
            </button>
            <div className="sidebar-item border-[3px] border-black bg-zinc-50 p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed">
              ⚡ SYSTEM OVERVIEW
              <div className="mt-2 text-black text-xs font-bold flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full border-2 border-black ${socketConnected ? 'bg-neo-mint' : 'bg-neo-pink'}`}></div>
                Socket: {socketConnected ? 'ONLINE' : 'OFFLINE'}
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <button 
          onClick={handleLogout}
          className="sidebar-item flex items-center justify-center gap-2 bg-neo-pink border-[3px] border-black text-white font-black uppercase text-xs tracking-wider p-3.5 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-active active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all cursor-pointer"
        >
          <LogOut size={16} className="stroke-[2.5px] text-white" />
          Logout
        </button>
      </aside>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8 relative">
        {/* Header Block */}
        <header className="header-item flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-neo-white border-[4px] border-black p-6 shadow-neo-sm mb-8">
          <div>
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-black uppercase tracking-wider mb-1">
              <Layers size={14} className="stroke-[2.5px]" />
              Dashboard / Control Panel
            </div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-black">
              System Monitor
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <div 
              className={`flex items-center gap-2 border-[3px] border-black px-4 py-2 font-black text-xs uppercase shadow-neo-sm transition-colors duration-300 ${
                status === "CONNECTED"
                  ? "bg-neo-mint text-black"
                  : status === "SCANNING"
                  ? "bg-neo-yellow text-black"
                  : "bg-neo-pink text-white"
              }`}
            >
              {status === "CONNECTED" ? (
                <>
                  <Wifi size={16} className="stroke-[2.5px]" />
                  Connected
                </>
              ) : status === "SCANNING" ? (
                <>
                  <QrCode size={16} className="stroke-[2.5px] animate-pulse" />
                  Scanning
                </>
              ) : (
                <>
                  <WifiOff size={16} className="stroke-[2.5px] text-white" />
                  Disconnected
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button 
              onClick={handleRefreshStatus}
              className="bg-neo-yellow border-[3px] border-black p-2.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active transition-all cursor-pointer"
              title="Refresh Connection Status"
            >
              <RefreshCw size={18} className="stroke-[2.5px] text-black" />
            </button>
          </div>
        </header>

        {/* ─── STATS GRID ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card 1 */}
          <div className="grid-card bg-neo-white border-[4px] border-black p-5 shadow-neo-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="font-black uppercase tracking-wider text-xs text-zinc-500">
                Pesan Diproses
              </span>
              <div className="bg-neo-yellow border-2 border-black p-1">
                <MessageSquare size={16} />
              </div>
            </div>
            <div className="text-3xl font-black uppercase text-black">
              {stats.totalMessages}
            </div>
            <p className="text-[10px] font-black text-zinc-500 mt-1.5 uppercase">
              Sejak server dinyalakan
            </p>
          </div>

          {/* Card 2 */}
          <div className="grid-card bg-neo-white border-[4px] border-black p-5 shadow-neo-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="font-black uppercase tracking-wider text-xs text-zinc-500">
                User Aktif (Redis)
              </span>
              <div className="bg-neo-mint border-2 border-black p-1">
                <Cpu size={16} />
              </div>
            </div>
            <div className="text-3xl font-black uppercase text-black">
              {stats.activeUsers}
            </div>
            <p className="text-[10px] font-black text-zinc-500 mt-1.5 uppercase">
              Konteks chat tersimpan
            </p>
          </div>

          {/* Card 3 */}
          <div className="grid-card bg-neo-white border-[4px] border-black p-5 shadow-neo-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="font-black uppercase tracking-wider text-xs text-zinc-500">
                Uptime Server
              </span>
              <div className="bg-neo-orange border-2 border-black p-1">
                <Activity size={16} className="text-black" />
              </div>
            </div>
            <div className="text-3xl font-black uppercase text-black">
              {stats.uptime}
            </div>
            <p className="text-[10px] font-black text-zinc-500 mt-1.5 uppercase">
              Graceful health: OK
            </p>
          </div>

          {/* Card 4 */}
          <div className="grid-card bg-neo-white border-[4px] border-black p-5 shadow-neo-sm">
            <div className="flex justify-between items-start mb-3">
              <span className="font-black uppercase tracking-wider text-xs text-zinc-500">
                Outbound Queue
              </span>
              <div className="bg-neo-pink border-2 border-black p-1 text-white">
                <Layers size={16} className="text-white" />
              </div>
            </div>
            <div className="text-3xl font-black uppercase text-black">
              {stats.redisStatus}
            </div>
            <p className="text-[10px] font-black text-zinc-500 mt-1.5 uppercase text-neo-pink">
              BullMQ Broker Online
            </p>
          </div>
        </div>

        {/* ─── GATEWAY CONTROL & QR SCANNER AREA ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Monitor/Scanner Panel */}
          <div className="grid-card lg:col-span-2 bg-neo-white border-[4px] border-black shadow-neo-sm overflow-hidden flex flex-col justify-between">
            {/* Panel Tab */}
            <div className="bg-black text-white px-5 py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <QrCode size={16} />
                WhatsApp Connection Gateway
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-neo-mint"></div>
                <span>Core.v1</span>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6 md:p-8 flex-1 flex flex-col items-center justify-center min-h-[350px]">
              
              {status === "CONNECTED" ? (
                /* Connected view */
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 rounded-full border-4 border-black bg-neo-mint flex items-center justify-center mx-auto shadow-neo-sm mb-6">
                    <ShieldCheck size={40} className="stroke-[2.5px] text-black" />
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-wider text-black mb-2">
                    Koneksi Aktif & Aman!
                  </h3>
                  <p className="text-sm font-semibold text-zinc-600 mb-6 leading-relaxed">
                    HiTsBOT saat ini terhubung ke WhatsApp. Sistem siap memproses pesan pelanggan dan membalas secara otomatis via AI pipeline.
                  </p>
                  <div className="inline-flex items-center gap-2 bg-zinc-100 border-[3px] border-black px-4 py-2 font-black text-xs uppercase">
                    Status: <span className="text-neo-mint font-extrabold bg-black px-1.5 py-0.5 rounded">CONNECTED</span>
                  </div>
                </div>
              ) : status === "SCANNING" && qrCode ? (
                /* Scanner code view */
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {/* QR Image Box */}
                  <div className="relative border-4 border-black p-4 bg-white shadow-neo-sm overflow-hidden">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrCode)}`}
                      alt="WhatsApp Auth QR Code"
                      width={240}
                      height={240}
                      className="block select-none"
                    />
                    {/* Animated Scanning Line */}
                    <div className="absolute left-0 right-0 h-1 bg-neo-mint shadow-[0_0_8px_#00F5A0] animate-[scan_2.5s_ease-in-out_infinite]" style={{ top: "0" }}></div>
                  </div>

                  {/* QR Scan Info */}
                  <div className="max-w-xs text-center md:text-left">
                    <h3 className="text-xl font-black uppercase tracking-wide mb-2 text-black">
                      Pindai Kode QR
                    </h3>
                    <p className="text-xs font-bold text-zinc-600 leading-relaxed mb-4">
                      Buka aplikasi WhatsApp di HP Anda &gt; Setelan &gt; Perangkat Tertaut &gt; Tautkan Perangkat, lalu arahkan kamera ke kode QR di samping.
                    </p>
                    <button 
                      onClick={handleRequestNewQR}
                      className="inline-flex items-center gap-2 bg-neo-yellow border-[3px] border-black text-black font-black uppercase text-xs tracking-wider px-4 py-2.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                    >
                      <RefreshCw size={14} className="stroke-[2.5px]" />
                      Regenerasi QR
                    </button>
                  </div>
                </div>
              ) : (
                /* Disconnected state / Loading */
                <div className="text-center max-w-sm">
                  <div className="w-16 h-16 rounded-full border-4 border-black bg-neo-pink flex items-center justify-center mx-auto shadow-neo-sm mb-6 animate-bounce">
                    <WifiOff size={28} className="stroke-[2.5px] text-white" />
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-wide text-black mb-2">
                    Menunggu Perangkat
                  </h3>
                  <p className="text-xs font-bold text-zinc-500 mb-6 leading-relaxed">
                    Gateway WhatsApp offline. Klik tombol di bawah untuk meminta Kode QR login dari server.
                  </p>
                  <button 
                    onClick={handleRequestNewQR}
                    className="inline-flex items-center gap-2 bg-neo-yellow border-[3px] border-black text-black font-black uppercase text-xs tracking-wider px-5 py-3 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
                  >
                    <QrCode size={16} className="stroke-[2.5px]" />
                    Hubungkan WhatsApp
                  </button>
                </div>
              )}
            </div>

            {/* Scanning Scan animation styles */}
            <style jsx>{`
              @keyframes scan {
                0%, 100% { top: 16px; }
                50% { top: 256px; }
              }
            `}</style>

            {/* Footer status */}
            <div className="bg-zinc-50 border-t-[3px] border-black px-6 py-4 flex items-center justify-between text-xs font-black text-zinc-500 uppercase tracking-wider bg-neo-white">
              <span>Host IP: 127.0.0.1</span>
              <span>Session: useMultiFileAuthState</span>
            </div>
          </div>

          {/* ─── LIVE SYSTEM CONSOLE LOGS ─── */}
          <div className="grid-card bg-black text-white border-[4px] border-black shadow-neo-sm flex flex-col justify-between h-[450px] lg:h-auto overflow-hidden">
            {/* Console Tab */}
            <div className="bg-neo-yellow text-black border-b-[3px] border-black px-5 py-3 flex items-center justify-between text-xs font-black uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Terminal size={16} className="stroke-[2.5px]" />
                Live System CLI
              </div>
              <span className="bg-black text-neo-yellow px-1 text-[10px] font-extrabold rounded">
                LIVE
              </span>
            </div>

            {/* Logs Area */}
            <div className="p-4 flex-1 overflow-y-auto font-mono text-[11px] space-y-2.5 bg-black">
              {consoleLogs.map((log) => (
                <div key={log.id} className="leading-relaxed break-words">
                  <span className="text-zinc-500 font-extrabold">[{log.timestamp}]</span>{" "}
                  <span className={getLogStyle(log.type)}>&gt;&gt;</span>{" "}
                  <span className={getLogStyle(log.type)}>{log.text}</span>
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>

            {/* Console footer */}
            <div className="border-t-[2px] border-zinc-800 p-3 bg-zinc-950 flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase">
              <span>Auto-Scroll Active</span>
              <button 
                onClick={() => setConsoleLogs([{ id: "clear", timestamp: new Date().toLocaleTimeString(), type: "info", text: "Console logs cleared." }])}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Clear Log
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
