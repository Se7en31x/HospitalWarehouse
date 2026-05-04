"use client";

import { SKELETON_PULSE as b } from "./DataTableSkeleton";

/** โครงหน้ารายละเอียดคลัง/คืน (หัวข้อ + การ์ดคู่ + พื้นที่ตาราง) */
export function WarehouseDetailPageSkeleton({
  ariaLabel = "กำลังโหลดรายละเอียด",
}: {
  ariaLabel?: string;
}) {
  return (
    <div
      className="flex flex-col min-h-screen bg-[#fafafa]"
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
      <div className="w-full px-6 py-6 flex flex-col flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-14 w-14 shrink-0 rounded-2xl animate-pulse bg-slate-200/90 ring-2 ring-slate-200/70 ring-offset-2 ring-offset-white" />
            <div className="space-y-2 min-w-0 flex-1">
              <div className={`h-8 w-64 max-w-full ${b}`} />
              <div className={`h-4 w-full max-w-xl ${b}`} />
            </div>
          </div>
          <div className={`h-9 w-24 rounded-lg shrink-0 ${b}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {[0, 1].map((i) => (
            <section key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 space-y-2">
                <div className={`h-5 w-40 ${b}`} />
                <div className={`h-3 w-48 ${b}`} />
              </div>
              <div className="px-5 py-5 grid grid-cols-2 gap-x-6 gap-y-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <div className={`h-3 w-24 ${b}`} />
                    <div className={`h-4 w-full max-w-[10rem] ${b}`} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden flex-1 min-h-[14rem]">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className={`h-5 w-44 ${b}`} />
          </div>
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className={`h-11 w-full rounded-lg ${b}`} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
