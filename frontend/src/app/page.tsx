"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// --- Main Icons ---
const HeartCrossIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    <path fill="#fff" d="M11 7h2v3h3v2h-3v3h-2v-3H8v-2h3V7z" />
  </svg>
);

const BoxIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="currentColor" fillOpacity="0.2" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const ClipboardHeartIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" fill="currentColor" fillOpacity="0.1" />
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" fill="currentColor" fillOpacity="0.2" />
    <path d="M12 16.5l-3-3a2.121 2.121 0 0 1 3-3 2.121 2.121 0 0 1 3 3l-3 3z" fill="currentColor" stroke="none" />
  </svg>
);

// --- Background Medical Icons (Pastel SVGs) ---
const PillIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 9.5L9.5 14.5M6 18A4.95 4.95 0 0 1 6 11L11 6A4.95 4.95 0 0 1 18 6A4.95 4.95 0 0 1 18 13L13 18A4.95 4.95 0 0 1 6 18Z"/>
  </svg>
);

const StethoscopeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
  </svg>
);

const SyringeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>
  </svg>
);

const CrossHeartBgIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M9 9h6v2H9z"/><path d="M11 7v6h2V7z"/>
  </svg>
);


export default function HomePage() {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      card.style.transform = `perspective(1200px) rotateY(${x}deg) rotateX(${y}deg)`;
    };
    const handleMouseLeave = () => {
      card.style.transform = `perspective(1200px) rotateY(0deg) rotateX(0deg)`;
    };
    card.addEventListener("mousemove", handleMouseMove);
    card.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      card.removeEventListener("mousemove", handleMouseMove);
      card.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-[#fff0f5]">

      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(#fbcfe8 1px, transparent 1px), linear-gradient(90deg, #fbcfe8 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Soft Glow Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-pink-200 rounded-full opacity-40 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-rose-200 rounded-full opacity-40 blur-[100px] pointer-events-none" />

      {/* --- CUTE MEDICAL BACKGROUND ICONS --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none text-pink-300">
        <StethoscopeIcon className="absolute top-[12%] left-[10%] w-28 h-28 opacity-25 rotate-12" />
        <PillIcon className="absolute top-[20%] right-[12%] w-24 h-24 opacity-25 -rotate-12" />
        <SyringeIcon className="absolute bottom-[20%] left-[15%] w-32 h-32 opacity-20 rotate-45" />
        <CrossHeartBgIcon className="absolute bottom-[25%] right-[10%] w-28 h-28 opacity-25 -rotate-12" />
        <PillIcon className="absolute top-[50%] left-[5%] w-16 h-16 opacity-20 -rotate-45" />
        <StethoscopeIcon className="absolute top-[60%] right-[5%] w-20 h-20 opacity-20 rotate-12" />
      </div>

      {/* Main Card */}
      <div
        ref={cardRef}
        className="relative bg-white/95 backdrop-blur-sm rounded-[32px] w-full max-w-xl shadow-2xl border-4 border-white transition-transform duration-150"
        style={{ boxShadow: "0 20px 60px rgba(244,114,182,0.15), 0 40px 80px rgba(0,0,0,0.04), inset 0 0 0 1px #fce7f3" }}
      >
        {/* Cute Lace/Scallop Top Decoration */}
        <div className="absolute -top-3 left-6 right-6 h-6 flex justify-around overflow-hidden opacity-50 pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="w-4 h-4 rounded-full bg-pink-200" />
          ))}
        </div>

        <div className="p-10 pt-12">

          {/* Top Logo & Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-pink-300 blur-md opacity-40 rounded-full"></div>
              <HeartCrossIcon className="w-16 h-16 text-pink-400 relative z-10" />
            </div>
            
            <h1 className="text-3xl font-extrabold text-slate-700 tracking-tight">
              Hospital <span className="text-pink-500">Inventory</span>
            </h1>
            <p className="mt-3 text-sm text-slate-400 font-medium">
              Welcome to our cute inventory system! ♡<br />
              Please select a module below:
            </p>
          </div>

          {/* Buttons Layout */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Warehouse Button (Solid Pink) */}
            <Link
              href="/warehouse"
              className="group flex flex-col items-center justify-center gap-3 p-8 bg-pink-400 hover:bg-pink-500 rounded-[24px] shadow-lg shadow-pink-200 hover:shadow-xl hover:shadow-pink-300 hover:-translate-y-1 transition-all duration-300 border-2 border-pink-300/50"
            >
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                <BoxIcon className="w-9 h-9" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-white tracking-wide">Warehouse</h3>
                <p className="text-xs text-pink-100 mt-1 font-medium">Manage supplies</p>
              </div>
            </Link>

            {/* Requests Button (White/Outline Pink) */}
            <Link
              href="/request"
              className="group flex flex-col items-center justify-center gap-3 p-8 bg-white hover:bg-pink-50 rounded-[24px] shadow-md shadow-pink-100 hover:shadow-xl hover:shadow-pink-200 hover:-translate-y-1 transition-all duration-300 border-2 border-pink-200"
            >
              <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center text-pink-400 group-hover:scale-110 group-hover:bg-pink-100 transition-all duration-300">
                <ClipboardHeartIcon className="w-9 h-9" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-700 tracking-wide">Requests</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Handle orders</p>
              </div>
            </Link>

          </div>

          {/* Footer */}
          <div className="mt-10 flex items-center justify-center gap-2 text-xs font-medium text-slate-400">
            <span>© 2026 Hospital Lovely IMS</span>
            <span className="text-pink-300">•</span>
            <span>Built with</span>
            <span className="text-pink-400 animate-pulse">♥</span>
          </div>

        </div>
      </div>
    </main>
  );
}