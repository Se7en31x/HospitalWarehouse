"use client";

/**
 * โหลดระดับแอป (เช่น รีเฟรช / เปลี่ยน segment ที่มี loading.tsx)
 * ไม่ใช้ skeleton — จุดคลื่นโปร่ง กระพริบเบาๆ
 */
export default function Loading() {
  return (
    <>
      <style>{`
        @keyframes app-loading-wave {
          0%, 70%, 100% { transform: translateY(0) scale(0.92); opacity: 0.35; }
          35% { transform: translateY(-5px) scale(1); opacity: 1; }
        }
        .app-loading-dot {
          animation: app-loading-wave 1.25s ease-in-out infinite;
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/92 backdrop-blur-[3px] p-6"
        aria-busy="true"
        aria-live="polite"
        aria-label="กำลังโหลด"
      >
        <span className="sr-only">กำลังโหลด</span>
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="app-loading-dot h-2.5 w-2.5 shrink-0 rounded-full bg-[#2d8ec6]"
              style={{ animationDelay: `${i * 0.11}s` }}
            />
          ))}
        </div>
        <p className="mt-8 text-sm font-medium text-slate-500">กรุณารอสักครู่...</p>
      </div>
    </>
  );
}
