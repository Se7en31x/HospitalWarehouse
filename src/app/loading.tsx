"use client";

import { SKELETON_PULSE as b } from "@/components/skeletons/DataTableSkeleton";

export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6"
      aria-busy="true"
      aria-live="polite"
      aria-label="กำลังโหลด"
    >
      <span className="sr-only">กำลังโหลด</span>
      <div className="w-full max-w-xs space-y-4">
        <div className={`mx-auto h-12 w-12 rounded-xl ${b}`} />
        <div className={`h-4 w-full rounded-md ${b}`} />
        <div className={`mx-auto h-4 w-full max-w-[12rem] rounded-md ${b}`} />
        <div className={`mx-auto h-3 w-full max-w-[8rem] rounded-md ${b}`} />
      </div>
      <p className="mt-10 text-xs text-slate-400">กรุณารอสักครู่...</p>
    </div>
  );
}
