'use client';

import WarehouseNavbar from "@/components/layouts/WarehouseNavbar";
import WarehouseSidebar from "@/components/layouts/WarehouseSidebar";
import MainContentWrapper from "@/components/layouts/MainContentWrapper"; 

export default function WarehouseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      
      <WarehouseNavbar />
      
      <div className="flex flex-1 overflow-hidden w-full">
        <WarehouseSidebar />
        
         <MainContentWrapper>{children}</MainContentWrapper>
      </div>

    </div>
  );
}
