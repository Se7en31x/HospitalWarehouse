// components/MainContentWrapper.tsx
"use client";

import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export default function MainContentWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isAllowScroll, setIsAllowScroll] = useState(false);

  useEffect(() => {
    console.log("Current pathname:", pathname);
  }, [pathname]);

  // Check window size to force scrolling on zoomed/small screens
  useEffect(() => {
    const handleResize = () => {
      // 1536 corresponds to 125% zoom on a 1920px screen
      setIsAllowScroll(window.innerWidth <= 1745);
    };

    handleResize(); // Check immediately on mount
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isNoScrollPage = 
    pathname?.toLowerCase().includes('/settings') ||  
    pathname?.toLowerCase().startsWith('/settings/');

  // If zoomed (isAllowScroll) or if it's not a restricted page, allow scrolling
  const shouldScroll = isAllowScroll || !isNoScrollPage;

  return (
    <main 
      className={`flex-1 min-w-0 min-h-0 bg-[#fafafa] ${shouldScroll ? "overflow-y-auto" : ""}`}
    >
      <div className="w-full min-w-0 min-h-full">
        {children}
      </div>
    </main>
  );
}