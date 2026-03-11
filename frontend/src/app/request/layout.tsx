'use client';

import RequestNavbar from "@/components/layouts/RequestNavbar";
import RequestSidebar from "@/components/layouts/RequestSidebar";
import MainContentWrapper from "@/components/layouts/MainContentWrapper";

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      
      <RequestNavbar />
      
      <div className="flex flex-1 overflow-hidden w-full">
        <RequestSidebar />
        
         <MainContentWrapper>{children}</MainContentWrapper>
      </div>

    </div>
  );
}