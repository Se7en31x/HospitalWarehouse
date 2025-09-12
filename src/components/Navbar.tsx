"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Settings, LogOut, User, Package, AlertCircle, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);

  // หาชื่อโมดูล
  let moduleTitle = "แดชบอร์ดหลัก";
  if (pathname.startsWith("/warehouse")) {
    moduleTitle = "ระบบคลังหลักโรงพยาบาล";
  } else if (pathname.startsWith("/procurement")) {
    moduleTitle = "ระบบการจัดซื้อ";
  } else if (pathname.startsWith("/requests")) {
    moduleTitle = "ระบบเบิก-ยืม-คืน";
  }

  // mock user data
  const userRole = "เจ้าหน้าที่คลังพัสดุ";
  const userName = "สมชาย ใจดี";
  const userImage: string | null = null;

  // avatar fallback
  const avatarUrl =
    userImage ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userName
    )}&background=F59E0B&color=fff&rounded=true&size=128`;

  // Mock notification data with type for icons
  const notifications = [
    { id: 1, message: "มีการเบิกพัสดุใหม่ #1234", time: "10 นาทีที่แล้ว", type: "info" },
    { id: 2, message: "สต็อกยาครบกำหนดตรวจสอบ", time: "1 ชั่วโมงที่แล้ว", type: "warning" },
    { id: 3, message: "คำสั่งซื้อ #5678 ได้รับการอนุมัติ", time: "2 ชั่วโมงที่แล้ว", type: "success" },
  ];

  return (
    <header className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white shadow-lg relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        <div className="absolute top-4 right-4 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between px-6 py-3">
          {/* โลโก้และชื่อระบบ */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md">
                <Image
                  src="/logo/logo.png"
                  alt="Hospital Logo"
                  width={32}
                  height={32}
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-2xl">🏥</span>';
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-xl font-semibold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                ระบบบริหารจัดการโรงพยาบาล
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-lg"></span>
                <p className="text-sm text-blue-100 font-medium">{moduleTitle}</p>
              </div>
            </div>
          </div>

          {/* ไอคอนและโปรไฟล์ */}
          <div className="flex items-center gap-4">
            {/* กระดิ่งแจ้งเตือน */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                className="relative p-2 hover:bg-white/10 rounded-lg transition-all duration-300 group"
                aria-label="เปิดการแจ้งเตือน"
              >
                <Bell className="w-5 h-5 group-hover:scale-105 transition-transform duration-300" />
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
              </button>

              {/* Notification Popover */}
              {showNotificationMenu && (
                <div className="fixed right-6 top-[4rem] w-80 bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-100/50 z-50 animate-slide-in">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-base font-semibold text-gray-900">การแจ้งเตือน</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 px-4 py-3 text-gray-800 hover:bg-indigo-50/50 transition-all duration-200 border-b border-gray-100/50 last:border-b-0"
                      >
                        {notification.type === "info" && <Package className="w-4 h-4 text-blue-600 mt-0.5" />}
                        {notification.type === "warning" && <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />}
                        {notification.type === "success" && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                        <div>
                          <p className="text-sm font-medium">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{notification.time}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="px-4 py-4 text-gray-600 text-sm text-center">
                        ไม่มีการแจ้งเตือน
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* โปรไฟล์ */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg transition-all duration-300 group"
                aria-label="เปิดเมนูโปรไฟล์"
              >
                <div className="flex flex-col text-right">
                  <span className="text-sm font-medium text-white group-hover:text-blue-100 transition-colors">
                    {userName}
                  </span>
                  <span className="text-xs text-blue-100/80">
                    {userRole}
                  </span>
                </div>
                
                <div className="relative">
                  <Image
                    src={avatarUrl}
                    alt="User Avatar"
                    width={36}
                    height={36}
                    className="rounded-full border-2 border-white/50 object-cover shadow-sm group-hover:border-white transition-all duration-300"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                </div>
                
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown */}
              {showProfileMenu && (
                <div className="fixed right-6 top-[4rem] w-64 bg-white/90 backdrop-blur-md rounded-lg shadow-xl border border-gray-100/50 z-50 animate-slide-in">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Image
                        src={avatarUrl}
                        alt="User Avatar"
                        width={32}
                        height={32}
                        className="rounded-full shadow-sm"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{userName}</p>
                        <p className="text-xs text-gray-500">{userRole}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-1">
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-800 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>โปรไฟล์</span>
                    </button>
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-800 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all duration-200">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      <span>ตั้งค่า</span>
                    </button>
                    <hr className="my-1 mx-4 border-gray-100/50" />
                    <button className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50/50 hover:text-red-700 transition-all duration-200">
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showProfileMenu || showNotificationMenu) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowProfileMenu(false);
            setShowNotificationMenu(false);
          }}
        />
      )}
    </header>
  );
}