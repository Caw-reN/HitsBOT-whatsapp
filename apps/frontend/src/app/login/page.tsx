"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { 
  Bot, 
  Lock, 
  User, 
  Sparkles, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  ArrowRight, 
  Terminal, 
  ShieldCheck 
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs for animations
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<HTMLDivElement>(null);

  // Snappy GSAP entrance animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Entrance animation for the login card
      gsap.fromTo(
        cardRef.current,
        {
          scale: 0.8,
          y: 100,
          rotation: -4,
          opacity: 0,
        },
        {
          scale: 1,
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: 0.85,
          ease: "back.out(1.7)",
        }
      );

      // 2. Staggered fade/slide-up for form elements
      if (elementsRef.current) {
        const animItems = elementsRef.current.querySelectorAll(".animate-item");
        gsap.fromTo(
          animItems,
          {
            y: 30,
            opacity: 0,
            rotation: 2,
          },
          {
            y: 0,
            opacity: 1,
            rotation: 0,
            stagger: 0.08,
            duration: 0.6,
            ease: "power3.out",
            delay: 0.35,
          }
        );
      }

      // 3. Floating background elements micro-animation
      gsap.to(".floating-shape-1", {
        y: -15,
        rotation: 10,
        repeat: -1,
        yoyo: true,
        duration: 3,
        ease: "sine.inOut"
      });
      gsap.to(".floating-shape-2", {
        y: 15,
        rotation: -10,
        repeat: -1,
        yoyo: true,
        duration: 3.5,
        ease: "sine.inOut",
        delay: 0.5
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // GSAP Shake animation for validation errors
  const triggerErrorShake = () => {
    gsap.fromTo(
      cardRef.current,
      { x: -12 },
      {
        x: 0,
        duration: 0.08,
        repeat: 5,
        yoyo: true,
        ease: "power1.inOut"
      }
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!username.trim() || !password.trim()) {
      setError("Semua kolom input wajib diisi!");
      triggerErrorShake();
      return;
    }

    setIsLoading(true);

    try {
      // Simulate endpoint call
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        }
      ).catch(() => {
        // Fallback for network error / development without backend running
        return {
          ok: false,
          status: 404,
          json: async () => ({ message: "Backend offline. Mengaktifkan mode demonstrasi local..." })
        };
      });

      if (response.ok) {
        // Successful login path
        const data = await response.json();
        // Save token in cookie for middleware route guard
        document.cookie = `token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
        router.push("/dashboard");
      } else {
        const errData = await response.json().catch(() => ({}));
        
        // Demo Bypass: If in development mode (404 backend offline) and credentials match demo values
        // or just bypass for testing, let the user know.
        if (response.status === 404 && username === "admin" && password === "admin123") {
          setIsLoading(true);
          // Set a mock cookie for the demo session
          document.cookie = "token=mock-demo-token; path=/; max-age=86400; SameSite=Lax";
          setTimeout(() => {
            router.push("/dashboard");
          }, 1500);
          return;
        }

        setError(errData.message || "Username atau password salah!");
        triggerErrorShake();
      }
    } catch (err: any) {
      setError("Terjadi kesalahan sistem. Silakan coba lagi.");
      triggerErrorShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative flex flex-col flex-1 min-h-screen items-center justify-center bg-neo-bg px-4 py-12 select-none overflow-hidden"
      style={{
        backgroundImage: "radial-gradient(circle at 2px 2px, #000000 2px, transparent 0)",
        backgroundSize: "24px 24px"
      }}
    >
      {/* Dynamic Background Floating Badges (Cheerful Neobrutalism style) */}
      <div className="floating-shape-1 absolute top-[15%] left-[8%] hidden md:flex items-center gap-2 bg-neo-mint border-4 border-black px-4 py-2 font-black uppercase text-sm tracking-wider shadow-neo-sm transform -rotate-6">
        <Bot size={18} />
        Baileys Connection
      </div>

      <div className="floating-shape-2 absolute bottom-[15%] right-[8%] hidden md:flex items-center gap-2 bg-neo-pink border-4 border-black px-4 py-2 font-black uppercase text-sm tracking-wider shadow-neo-sm transform rotate-6 text-white">
        <Sparkles size={18} />
        Gemini AI Integrated
      </div>

      {/* Main Container */}
      <div 
        ref={cardRef}
        className="login-card w-full max-w-md bg-neo-white border-[4px] border-black shadow-neo overflow-hidden opacity-0"
      >
        {/* Card Header (Neobrutalist window style) */}
        <div className="bg-neo-yellow border-b-[4px] border-black px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal size={20} className="stroke-[2.5px]" />
            <span className="font-black uppercase tracking-wider text-sm">
              HiTsBOT / LOGIN_PORTAL
            </span>
          </div>
          {/* Mock Window Controls */}
          <div className="flex gap-2">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black bg-neo-pink"></div>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black bg-neo-orange"></div>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-black bg-neo-mint"></div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 md:p-8" ref={elementsRef}>
          {/* Welcome Info */}
          <div className="animate-item mb-6">
            <div className="inline-flex items-center gap-1.5 bg-neo-mint border-[3px] border-black px-3 py-1 font-bold text-xs uppercase shadow-neo-sm mb-3">
              <ShieldCheck size={14} />
              Secure Admin Console
            </div>
            <h1 className="text-3xl font-black uppercase tracking-wide text-black mb-1">
              Selamat Datang
            </h1>
            <p className="text-sm font-medium text-zinc-600">
              Masukkan kredensial admin untuk masuk ke dashboard HiTsBOT.
            </p>
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="animate-item bg-neo-pink border-[3px] border-black text-black font-bold p-3.5 mb-6 flex items-start gap-2.5 shadow-neo-sm leading-tight">
              <AlertCircle size={20} className="shrink-0 stroke-[2.5px]" />
              <div className="text-sm font-black">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username Input */}
            <div className="animate-item space-y-2">
              <label 
                htmlFor="username"
                className="block font-black uppercase text-xs tracking-wider text-black"
              >
                Username / Admin ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <User size={18} className="stroke-[2.5px] text-black" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username..."
                  className="w-full bg-neo-white border-[3px] border-black px-4 py-3.5 pl-11 font-bold placeholder-zinc-400 focus:outline-none focus:bg-neo-bg focus:shadow-neo-active transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="animate-item space-y-2">
              <label 
                htmlFor="password"
                className="block font-black uppercase text-xs tracking-wider text-black"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock size={18} className="stroke-[2.5px] text-black" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neo-white border-[3px] border-black px-4 py-3.5 pl-11 pr-11 font-bold placeholder-zinc-400 focus:outline-none focus:bg-neo-bg focus:shadow-neo-active transition-all"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-black hover:text-zinc-600 focus:outline-none"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff size={18} className="stroke-[2.5px]" />
                  ) : (
                    <Eye size={18} className="stroke-[2.5px]" />
                  )}
                </button>
              </div>
            </div>

            {/* Hint / Helper Tip */}
            <div className="animate-item text-[11px] font-bold text-zinc-500 bg-zinc-100 border-2 border-black p-2 bg-neo-white">
              💡 Demo credentials: <span className="font-extrabold text-black bg-neo-yellow px-1">admin</span> / <span className="font-extrabold text-black bg-neo-yellow px-1">admin123</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="animate-item w-full flex items-center justify-center gap-2 bg-neo-mint border-[3px] border-black text-black font-black uppercase tracking-wide py-4 shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-neo-active active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-100 cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-[3px] border-black border-t-transparent rounded-full animate-spin"></div>
                  Menghubungkan...
                </>
              ) : (
                <>
                  Masuk Ke Dashboard
                  <ArrowRight size={18} className="stroke-[2.5px]" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Card Footer (Mock Terminal info) */}
        <div className="bg-zinc-50 border-t-[3px] border-black px-6 py-3.5 flex items-center justify-between text-[11px] font-black text-zinc-500 uppercase tracking-wider bg-neo-white">
          <span>Sys: OK</span>
          <span>Port: 3001</span>
          <span>v1.0.0-Beta</span>
        </div>
      </div>
    </div>
  );
}
