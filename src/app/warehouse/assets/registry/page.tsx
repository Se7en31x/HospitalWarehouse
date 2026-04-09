import { Suspense } from "react";
import AssetRegistryClient from "./AssetRegistryClient";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "ทะเบียนครุภัณฑ์รายชิ้น | Hospital Inventory",
  description: "จัดการข้อมูล Serial Number และสถานะครุภัณฑ์รายชิ้น",
};

export default function AssetRegistryPage() {
  return (
    // ต้องหุ้มด้วย Suspense เพราะใน Client มีการใช้ useSearchParams
    <Suspense 
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Loading Registry...
            </p>
          </div>
        </div>
      }
    >
      <AssetRegistryClient />
    </Suspense>
  );
}