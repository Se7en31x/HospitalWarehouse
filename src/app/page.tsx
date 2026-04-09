"use client";

import { MouseEvent } from "react";
import Link from "next/link";

// --- Minimalist Modern Icons ---
const HexagonBoxIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const FolderSyncIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    <path d="M12 10v4h4" />
    <path d="M12 14 9.5 11.5" />
  </svg>
);

export default function HomePage() {
  // ฟังก์ชันสร้าง Effect แสงวิ่งตามเมาส์บนการ์ด
  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    const card = document.getElementById(id);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans overflow-x-hidden relative justify-center">
      
      {/* Background Creative Elements */}
      <div className="absolute top-0 right-0 w-[50vw] h-[100vh] bg-gradient-to-bl from-sky-100/60 to-transparent pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-100 rounded-full blur-[100px] opacity-60 pointer-events-none" />
      
      {/* เส้น Grid แบบล้ำๆ */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: `linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)`, backgroundSize: '4rem 4rem' }} 
      />

      {/* Main Content Area */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 relative z-10">
        
        {/* Left Typography Section */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-8">
          <div>
            <p className="text-blue-600 font-bold tracking-wide text-sm mb-4">ระบบบริหารจัดการโรงพยาบาล</p>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.2] tracking-tight">
              วัดห้วยปลากั้ง <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-blue-500">
                เพื่อสังคม
              </span>
            </h1>
          </div>
          
          <p className="text-slate-600 text-lg max-w-md font-normal leading-relaxed">
            ศูนย์กลางการบริหารจัดการคลังสินค้า ยกระดับระบบโลจิสติกส์ของโรงพยาบาล ติดตามเวชภัณฑ์และควบคุมการเบิกจ่ายได้อย่างแม่นยำ
          </p>

          <div className="pt-4 flex items-center gap-6">
            <div className="flex -space-x-3">
              {[1,2,3].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 shadow-sm" />
              ))}
            </div>
            <p className="text-sm text-slate-500">
              มีผู้ใช้งานระบบ <strong className="text-blue-600">14 คน</strong> ในขณะนี้
            </p>
          </div>
        </div>

        {/* Right Interactive Cards Section */}
        {/* แก้ไขตรงนี้: ใช้ flex column ในจอมือถือ และใช้ relative block ในหน้าจอ lg ขึ้นไป */}
        <div className="lg:col-span-7 flex flex-col gap-6 lg:block lg:relative lg:min-h-[580px] mt-8 lg:mt-0">
          
          {/* Card 1: ระบบจัดการคลังหลัก */}
          <Link
            href="/warehouse"
            id="card-warehouse"
            onMouseMove={(e) => handleMouseMove(e, "card-warehouse")}
            // เปลี่ยน absolute เป็น lg:absolute ให้มันซ้อนกันเฉพาะจอใหญ่
            className="group relative lg:absolute lg:top-0 lg:right-0 xl:right-10 w-full lg:w-[400px] xl:w-[420px] bg-gradient-to-br from-blue-600 to-indigo-600 p-8 rounded-3xl shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 hover:-translate-y-2 overflow-hidden z-10"
          >
            {/* Hover Spotlight Effect */}
            <div className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition duration-300"
                 style={{ background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.2), transparent 40%)` }}
            />
            
            <div className="relative z-10 flex justify-between items-start">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform duration-500">
                <HexagonBoxIcon className="w-8 h-8 text-white" />
              </div>
              <span className="text-white font-mono text-xs tracking-widest border border-white/30 px-3 py-1 rounded-full">MOD-01</span>
            </div>
            
            <div className="relative z-10 mt-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">คลังหลักโรงพยาบาล</h2>
              <p className="text-white font-normal text-sm leading-relaxed">
                เข้าถึงพื้นที่จัดเก็บหลัก ตรวจสอบสินค้าคงคลัง และติดตามจำนวนเวชภัณฑ์ได้แบบเรียลไทม์
              </p>
            </div>
            
            {/* Decorative background number */}
            <div className="absolute -bottom-10 -right-4 text-[120px] font-black text-white/[0.05] select-none pointer-events-none">
              01
            </div>
          </Link>

          {/* Card 2: ระบบเบิกยืมคืน */}
          <Link
            href="/request"
            id="card-request"
            onMouseMove={(e) => handleMouseMove(e, "card-request")}
            // ปรับระยะทิ้งตัวลงมาที่ lg:top-[280px] ให้พ้นตัวหนังสือของการ์ดบน
            className="group relative lg:absolute lg:top-[280px] lg:left-0 xl:left-4 w-full lg:w-[400px] xl:w-[420px] bg-white p-8 rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] border border-slate-200 hover:border-sky-300 hover:shadow-xl transition-all duration-500 hover:-translate-y-2 overflow-hidden z-20"
          >
             {/* Hover Spotlight Effect */}
             <div className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition duration-300"
                 style={{ background: `radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(14,165,233,0.06), transparent 40%)` }}
            />

            <div className="relative z-10 flex justify-between items-start">
              <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center border border-sky-100 group-hover:bg-blue-500 transition-colors duration-500">
                <FolderSyncIcon className="w-8 h-8 text-blue-500 group-hover:text-white transition-colors duration-500" />
              </div>
              <span className="text-slate-400 font-mono text-xs tracking-widest border border-slate-200 px-3 py-1 rounded-full">MOD-02</span>
            </div>
            
            <div className="relative z-10 mt-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">ระบบเบิก-ยืม-คืน</h2>
              <p className="text-slate-600 font-normal text-sm leading-relaxed">
                จัดการคำขอเบิกจ่ายจากหน่วยงาน อนุมัติการเบิกวัสดุอุปกรณ์ และควบคุมประวัติการยืม-คืน
              </p>
            </div>

            {/* Decorative background number */}
            <div className="absolute -bottom-10 -right-4 text-[120px] font-black text-slate-900/[0.03] select-none pointer-events-none">
              02
            </div>
          </Link>

        </div>
      </main>
      
    </div>
  );
}