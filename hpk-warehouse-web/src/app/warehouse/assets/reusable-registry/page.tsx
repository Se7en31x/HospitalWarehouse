import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ReusableRegistryClient from "./ReusableRegistryClient";

export const metadata = {
  title: "ทะเบียนของใช้ซ้ำรายชิ้น | Hospital Inventory",
  description: "ตรวจสอบรายการรายชิ้นสำหรับของใช้ซ้ำ",
};

export default function ReusableRegistryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Loading Registry...</p>
          </div>
        </div>
      }
    >
      <ReusableRegistryClient />
    </Suspense>
  );
}
