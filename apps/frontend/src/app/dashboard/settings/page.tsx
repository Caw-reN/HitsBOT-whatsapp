"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { gsap } from "gsap";
import { 
  Bot, 
  Settings, 
  LogOut, 
  Wifi, 
  WifiOff, 
  Cpu, 
  Save, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Activity,
  Sliders,
  ChevronLeft
} from "lucide-react";

interface BotConfig {
  botName: string;
  waNumber: string | null;
  aiProvider: string;
  aiApiKey: string | null;
  systemInstruction: string | null;
  aiTemperature: number;
}

export default function SettingsPage() {
  const router = useRouter();
  const [config, setConfig] = useState<BotConfig>({
    botName: "HiTsBOT Agent",
    waNumber: "",
    aiProvider: "gemini",
    aiApiKey: "",
    systemInstruction: "",
    aiTemperature: 0.1,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [waStatus, setWaStatus] = useState("DISCONNECTED");
  const [socketConnected, setSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const saveBtnRef = useRef<HTMLButtonElement>(null);

  // Initialize Socket and Load Data
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    
    // Connect socket for sidebar status
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      setSocketConnected(true);
      socket.emit("whatsapp:request-status");
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
    });

    socket.on("whatsapp:status", (data: { status: string }) => {
      setWaStatus(data.status);
    });

    // Fetch initial configuration from backend
    fetch(`${backendUrl}/api/config`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat konfigurasi");
        return res.json();
      })
      .then((data) => {
        setConfig({
          botName: data.botName || "HiTsBOT Agent",
          waNumber: data.waNumber || "",
          aiProvider: data.aiProvider || "gemini",
          aiApiKey: data.aiApiKey || "",
          systemInstruction: data.systemInstruction || "",
          aiTemperature: data.aiTemperature ?? 0.1,
        });
      })
      .catch((err) => {
        setNotification({
          type: "error",
          text: "Gagal menghubungkan ke backend. Menggunakan data demonstrasi lokal."
        });
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      socket.disconnect();
    };
  }, []);

  // GSAP animations on load
  useEffect(() => {
    if (isLoading) return;

    const ctx = gsap.context(() => {
      // Stagger sidebar items
      gsap.fromTo(
        ".sidebar-item",
        { x: -50, opacity: 0 },
        { x: 0, opacity: 1, stagger: 0.06, duration: 0.5, ease: "back.out(1.2)" }
      );

      // Stagger main form cards
      gsap.fromTo(
        ".form-card",
        { y: 30, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, stagger: 0.08, duration: 0.6, ease: "back.out(1.4)" }
      );

      // Simple hover/active micro-animations for the save button
      if (saveBtnRef.current) {
        const btn = saveBtnRef.current;
        
        btn.addEventListener("mouseenter", () => {
          gsap.to(btn, {
            y: -2,
            x: -2,
            boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)",
            duration: 0.15,
            ease: "power1.out"
          });
        });

        btn.addEventListener("mouseleave", () => {
          gsap.to(btn, {
            y: 0,
            x: 0,
            boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)",
            duration: 0.15,
            ease: "power1.out"
          });
        });

        btn.addEventListener("mousedown", () => {
          gsap.to(btn, {
            y: 2,
            x: 2,
            boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)",
            duration: 0.05
          });
        });

        btn.addEventListener("mouseup", () => {
          gsap.to(btn, {
            y: -2,
            x: -2,
            boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)",
            duration: 0.05
          });
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [isLoading]);

  // Form Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    setIsSaving(true);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    try {
      const response = await fetch(`${backendUrl}/api/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui konfigurasi");
      }

      const updated = await response.json();
      setNotification({
        type: "success",
        text: "Konfigurasi bot berhasil diperbarui!"
      });
      
      // Flash the updated values
      setConfig({
        botName: updated.botName,
        waNumber: updated.waNumber,
        aiProvider: updated.aiProvider,
        aiApiKey: updated.aiApiKey || "",
        systemInstruction: updated.systemInstruction || "",
        aiTemperature: updated.aiTemperature,
      });

      // Simple GSAP alert animation
      gsap.fromTo(
        ".alert-box",
        { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.5)" }
      );
    } catch (err: any) {
      setNotification({
        type: "error",
        text: err.message || "Gagal menyimpan konfigurasi ke backend."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    router.push("/login");
  };

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
            <button 
              onClick={() => router.push("/dashboard")}
              className="sidebar-item w-full flex items-center gap-3 bg-neo-white border-[3px] border-black text-black font-black uppercase text-xs tracking-wider p-3.5 shadow-neo-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-neo-active transition-all cursor-pointer"
            >
              <Activity size={18} className="stroke-[2.5px]" />
              Status Monitor
            </button>
            <button className="sidebar-item w-full flex items-center gap-3 bg-neo-mint border-[3px] border-black text-black font-black uppercase text-xs tracking-wider p-3.5 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active transition-all cursor-pointer">
              <Settings size={18} className="stroke-[2.5px]" />
              Bot Configs
            </button>
            <div className="sidebar-item border-[3px] border-black bg-zinc-50 p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-relaxed">
              ⚡ SYSTEM OVERVIEW
              <div className="mt-2 text-black text-xs font-bold flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full border-2 border-black ${waStatus === 'CONNECTED' ? 'bg-neo-mint' : 'bg-neo-pink'}`}></div>
                WhatsApp: {waStatus}
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

      {/* ─── MAIN CONTENT ─── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto p-8">
        
        {/* Header Block */}
        <header className="form-card flex items-center justify-between bg-neo-white border-[4px] border-black p-6 shadow-neo-sm mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push("/dashboard")}
              className="bg-neo-bg border-[3px] border-black p-2 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-sm transition-all cursor-pointer"
              title="Kembali ke Monitor"
            >
              <ChevronLeft size={20} className="stroke-[2.5px]" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-black uppercase tracking-wider mb-1">
                <Sliders size={14} className="stroke-[2.5px]" />
                Dashboard / Pengaturan
              </div>
              <h1 className="text-3xl font-black uppercase tracking-wider text-black">
                Bot Configuration
              </h1>
            </div>
          </div>
        </header>

        {isLoading ? (
          /* Loading State */
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 bg-neo-white border-[4px] border-black p-8 shadow-neo">
              <div className="w-10 h-10 border-[4px] border-black border-t-transparent rounded-full animate-spin"></div>
              <span className="font-black uppercase tracking-wider text-sm">
                Memuat Kredensial...
              </span>
            </div>
          </div>
        ) : (
          /* Settings Form */
          <form onSubmit={handleSave} ref={formRef} className="space-y-8">
            
            {/* Notification Banner */}
            {notification && (
              <div className={`alert-box border-[4px] border-black p-4 shadow-neo-sm flex items-start gap-3 text-sm font-black uppercase tracking-wide leading-tight ${
                notification.type === "success" 
                  ? "bg-neo-mint text-black" 
                  : "bg-neo-pink text-black"
              }`}>
                {notification.type === "success" ? (
                  <CheckCircle size={22} className="shrink-0 stroke-[2.5px]" />
                ) : (
                  <AlertCircle size={22} className="shrink-0 stroke-[2.5px]" />
                )}
                <div>{notification.text}</div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: API Credentials & Suhu */}
              <div className="space-y-8 lg:col-span-1">
                
                {/* Section: Profile */}
                <div className="form-card bg-neo-white border-[4px] border-black p-6 shadow-neo-sm">
                  <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                    <Bot size={18} />
                    Bot Profile
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block font-black uppercase text-xs tracking-wide">
                        Nama Bot
                      </label>
                      <input 
                        type="text"
                        value={config.botName}
                        onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                        className="w-full bg-neo-bg border-[3px] border-black px-3.5 py-2.5 font-bold focus:outline-none focus:bg-neo-white transition-all"
                        placeholder="Nama tampilan bot..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block font-black uppercase text-xs tracking-wide">
                        Provider AI
                      </label>
                      <select 
                        value={config.aiProvider}
                        onChange={(e) => setConfig({ ...config, aiProvider: e.target.value })}
                        className="w-full bg-neo-bg border-[3px] border-black px-3.5 py-2.5 font-bold focus:outline-none focus:bg-neo-white transition-all"
                      >
                        <option value="gemini">Google Gemini AI</option>
                        <option value="openai">OpenAI (Unavailable)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section: Credentials */}
                <div className="form-card bg-neo-white border-[4px] border-black p-6 shadow-neo-sm">
                  <h2 className="font-black text-sm uppercase tracking-wider mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                    <Cpu size={18} />
                    Gemini Credentials
                  </h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block font-black uppercase text-xs tracking-wide">
                        Gemini API Key
                      </label>
                      <div className="relative">
                        <input 
                          type={showApiKey ? "text" : "password"}
                          value={config.aiApiKey || ""}
                          onChange={(e) => setConfig({ ...config, aiApiKey: e.target.value })}
                          className="w-full bg-neo-bg border-[3px] border-black px-3.5 py-2.5 pr-11 font-bold focus:outline-none focus:bg-neo-white transition-all"
                          placeholder="AIzaSy..."
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-black hover:text-zinc-600 focus:outline-none"
                        >
                          {showApiKey ? (
                            <EyeOff size={18} className="stroke-[2.5px]" />
                          ) : (
                            <Eye size={18} className="stroke-[2.5px]" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase leading-normal">
                        Kunci API aman di database MySQL lokal.
                      </p>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between font-black uppercase text-xs">
                        <span>AI Temperature</span>
                        <span className="bg-neo-yellow px-1.5 py-0.5 border-2 border-black text-[10px]">
                          {config.aiTemperature}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={config.aiTemperature}
                        onChange={(e) => setConfig({ ...config, aiTemperature: parseFloat(e.target.value) })}
                        className="w-full h-2 bg-zinc-200 border-2 border-black appearance-none cursor-pointer accent-black"
                      />
                      {config.aiTemperature > 0.2 && (
                        <div className="text-[10px] font-black text-neo-pink bg-neo-bg border-2 border-black p-2 leading-relaxed uppercase">
                          ⚠️ PERINGATAN: Suhu di atas 0.2 diatur ke batas maksimal 0.2 di backend demi ban-protection.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: AI Brain Instructions */}
              <div className="lg:col-span-2 form-card bg-neo-white border-[4px] border-black shadow-neo-sm flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Tab Title */}
                  <div className="bg-black text-white px-5 py-3.5 flex items-center justify-between text-xs font-black uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Settings size={16} />
                      AI Personality Prompt
                    </span>
                    <span className="bg-neo-mint text-black px-1.5 py-0.5 text-[9px] font-extrabold rounded">
                      LONGTEXT
                    </span>
                  </div>

                  <div className="p-6 md:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block font-black uppercase text-xs tracking-wider text-black">
                        System Instructions (Context Prompt)
                      </label>
                      <span className="text-[10px] font-black text-zinc-500 uppercase">
                        {(config.systemInstruction || "").length} Karakter
                      </span>
                    </div>

                    <textarea 
                      rows={14}
                      value={config.systemInstruction || ""}
                      onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
                      placeholder="Masukkan instruksi khusus kepribadian kecerdasan buatan Gemini di sini..."
                      className="w-full bg-neo-bg border-[3px] border-black p-4 font-bold placeholder-zinc-400 focus:outline-none focus:bg-neo-white focus:shadow-neo-active transition-all leading-relaxed resize-none"
                    ></textarea>

                    <div className="text-[10px] font-black text-zinc-500 bg-zinc-50 border-2 border-black p-3 leading-relaxed uppercase">
                      💡 TIPS: Berikan detail peran (misal: 'Kamu adalah CS dari Toko Sepatu X'), batas respons (bahasa Indonesia, ramah), dan instruksi keselamatan agar AI tidak mengalami prompt override.
                    </div>
                  </div>
                </div>

                {/* Footer Save Button */}
                <div className="bg-zinc-50 border-t-[3px] border-black px-6 py-5 flex items-center justify-between bg-neo-white">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Last Saved: Auto-Sync
                  </span>
                  
                  <button
                    ref={saveBtnRef}
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-neo-mint border-[3px] border-black text-black font-black uppercase text-xs tracking-wider px-6 py-3.5 shadow-neo-sm cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                        Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="stroke-[2.5px]" />
                        Simpan Perubahan
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>

          </form>
        )}

      </main>
    </div>
  );
}
