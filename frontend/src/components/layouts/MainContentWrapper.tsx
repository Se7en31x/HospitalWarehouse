// components/MainContentWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";

export default function MainContentWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Log เพื่อ debug (เปิด DevTools Console ดู)
  useEffect(() => {
    console.log("Current pathname:", pathname);
  }, [pathname]);

  // ปรับเงื่อนไขให้ยืดหยุ่นที่สุด (ครอบคลุม sub-path และ case-insensitive)
  const isNoScrollPage = 
    pathname?.toLowerCase().includes('/items') ||  // ถ้ามีหน้า /items ตรงไหนก็ได้
    pathname?.toLowerCase().startsWith('/items/')||
    pathname?.toLowerCase().includes('/settings') ||  // ถ้ามีหน้า /settings ตรงไหนก็ได้
    pathname?.toLowerCase().startsWith('/settings/');


  console.log("isNoScrollPage:", isNoScrollPage); // ดูว่าตรวจจับถูกไหม

  return (
    <main 
      className={`flex-1 ${isNoScrollPage ? "" : "overflow-y-auto"}`}
    >
      <div className="max-w-8xl mx-auto">
        {children}
      </div>
    </main>
  );
}