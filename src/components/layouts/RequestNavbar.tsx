"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User } from "lucide-react";
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
  const { displayName, roleName, isLoading } = useNavProfile();

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

  const avatarLetter = displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl relative z-[50]">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
        <div className="absolute top-0 right-20 w-32 h-32 bg-blue-400 rounded-full blur-2xl" />
      </div>

      <div className="relative z-10 border-b border-white/5">
        <div className="flex items-center justify-between px-8 py-4">

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
            <div className="flex flex-col gap-2">
              <h1 className="text-base font-semibold tracking-wide text-white/95 leading-none">
                โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม
              </h1>
              <span className="text-sm font-medium text-white tracking-wide">
                ระบบเบิก-ยืม-คืน
              </span>
            </div>
          </div>

          {/* Right: Bell + Avatar */}
          <div className="flex items-center gap-3">
            <NotificationBell title="สถานะใบเบิก-ยืม" viewAllHref="/request/notifications" />

            <div className="h-6 w-[1px] bg-white/10 mx-1" />

            <div className="relative self-stretch flex items-center" ref={profileRef}>
              {isLoading ? (
                <AvatarSkeleton />
              ) : (
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-3 p-1.5 pl-3 hover:bg-white/10 rounded-full transition-all group"
                >
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-sm font-semibold text-white">{displayName}</span>
                    <span className="text-[10px] text-blue-200/70 mt-1 tracking-wide font-medium">
                      {roleName}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-blue-700 ring-2 ring-white/20 group-hover:ring-white/50 transition-all flex items-center justify-center text-sm font-bold text-white">
                      {avatarLetter}
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-blue-900" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-blue-200 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} />
                </button>
              )}

              {showProfileMenu && (
                <div className="absolute right-0 top-full w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in zoom-in duration-200 origin-top-right overflow-hidden">
                  <div className="p-1">
                    <Link
                      href="/request/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4 text-blue-600" /> โปรไฟล์
                    </Link>
                    <div className="h-[1px] bg-gray-100 my-1 mx-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
