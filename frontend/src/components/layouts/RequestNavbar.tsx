"use client";

import Image from "next/image";
import { Bell, ChevronDown, Settings, LogOut, User, Package } from "lucide-react";
import { useState } from "react";

export default function RequestNavbar() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  const moduleTitle = "ระบบเบิก-ยืม-คืน";
  const moduleColor = "bg-purple-500/20 text-purple-100 border-purple-400/30";
  const userName = "นพ. รักษา ดีเยี่ยม";
  const userRole = "แผนกอายุรกรรม";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4F46E5&color=fff&rounded=true&size=128`;

  const notifications = [
    { id: 1, message: "ใบเบิก #REQ-001 อนุมัติแล้ว", time: "5 นาทีที่แล้ว", type: "info" },
  ];

  return (
    <header className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-xl relative z-[50]">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-20 w-32 h-32 bg-blue-400 rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10 border-b border-white/5">
        <div className="flex items-center justify-between px-6 py-2.5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-inner text-xl">
              🏥
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-white/95">
                HOSPITAL <span className="text-blue-400 font-medium text-sm ml-1 uppercase tracking-widest">InveSys</span>
              </h1>
              <div className={`mt-0.5 px-2 py-0.5 rounded border text-[10px] font-semibold w-fit uppercase ${moduleColor}`}>
                {moduleTitle}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => setShowNotificationMenu(!showNotificationMenu)} className="p-2 hover:bg-white/10 rounded-full transition-colors relative group">
                <Bell className="w-5 h-5 text-blue-100 group-hover:text-white" />
                <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-blue-900"></span>
              </button>
              {showNotificationMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in zoom-in duration-200 origin-top-right overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-900">สถานะใบเบิกยืม</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0">
                        <div className="mt-0.5 p-1.5 rounded-full bg-blue-100 text-blue-600">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

            <div className="relative">
              <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 p-1.5 pl-3 hover:bg-white/10 rounded-full transition-all group">
                <div className="flex flex-col items-end leading-none">
                  <span className="text-sm font-semibold text-white">{userName}</span>
                  <span className="text-[10px] text-blue-200/70 mt-1 uppercase tracking-tighter font-medium">{userRole}</span>
                </div>
                <div className="relative">
                  <Image src={avatarUrl} alt="User" width={32} height={32} className="rounded-full ring-2 ring-white/20 group-hover:ring-white/50 transition-all" />
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-blue-900"></div>
                </div>
                <ChevronDown className={`w-4 h-4 text-blue-200 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-in fade-in zoom-in duration-200 origin-top-right overflow-hidden">
                  <div className="p-1">
                    <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-lg transition-colors"><User className="w-4 h-4 text-blue-600" /> โปรไฟล์</button>
                    <div className="h-[1px] bg-gray-100 my-1 mx-2"></div>
                    <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"><LogOut className="w-4 h-4" /> ออกจากระบบ</button>
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