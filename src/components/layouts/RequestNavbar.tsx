"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "./NotificationBell";
import { useNavProfile } from "@/hooks/useNavProfile";
import { createClient } from "@/lib/supabase/client";

function AvatarSkeleton() {
  return (
    <div className="flex items-center gap-3 p-1.5 pl-3">
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-3 w-24 rounded bg-white/20 animate-pulse" />
        <div className="h-2 w-16 rounded bg-white/10 animate-pulse" />
      </div>
      <div className="w-8 h-8 rounded-full bg-white/20 animate-pulse" />
    </div>
  );
}

export default function RequestNavbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router     = useRouter();
  const { profile, displayName, roleName, isLoading } = useNavProfile();

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="w-full bg-gradient-to-r from-[#001E5D] via-[#003399] to-[#0A1931] text-white shadow-2xl relative z-[50]">
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-400 rounded-full blur-[100px]" />
        <div className="absolute top-0 right-20 w-48 h-48 bg-indigo-500 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 border-b border-white/10">
        <div className="flex items-center justify-between px-8 py-3.5">

          {/* Logo + Title */}
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center shadow-md overflow-hidden">
              <Image
                src="https://res.cloudinary.com/dgoxbpj1j/image/upload/v1773921237/logo-removebg-preview_frzye8.png"
                alt="Logo"
                width={56}
                height={56}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[17px] font-bold tracking-tight text-white leading-none">
                โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม
              </h1>
              <span className="text-[13px] font-semibold text-blue-100/90 tracking-wide uppercase">
                ระบบเบิก-ยืม-คืน
              </span>
            </div>
          </div>

          {/* Right: Bell + Avatar */}
          <div className="flex items-center gap-4">
            <NotificationBell title="สถานะใบเบิก-ยืม" viewAllHref="/request/notifications" />

            <div className="h-8 w-[1px] bg-white/20 mx-1" />

            <div className="relative self-stretch flex items-center" ref={profileRef}>
              {isLoading ? (
                <AvatarSkeleton />
              ) : (
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 p-1.5 pl-3 hover:bg-white/10 rounded-full transition-all group"
                >
                  <div className="flex flex-col items-end leading-tight">
                    <span className="text-[14px] font-bold text-white group-hover:text-blue-200 transition-colors">{displayName}</span>
                    <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
                      {roleName}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 ring-2 ring-white/30 group-hover:ring-white/60 transition-all flex items-center justify-center text-sm font-extrabold text-white shadow-lg">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#002A75]" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-blue-200 transition-transform duration-300 ${showProfileMenu ? "rotate-180" : ""}`} />
                </button>
              )}

              {showProfileMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-60 bg-white rounded-xl border border-slate-100 shadow-2xl z-50 overflow-hidden transition-all duration-200 ease-out">
                  <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">บัญชีผู้ใช้งาน</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
                    <p className="text-[11px] font-semibold text-blue-600 mt-0.5">{roleName}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      href="/request/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4 text-blue-600" /> โปรไฟล์ส่วนตัว
                    </Link>
                    <Link
                      href="/request/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4 text-blue-600" /> ตั้งค่า
                    </Link>
                    <div className="h-[1px] bg-slate-100 my-1.5 mx-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
