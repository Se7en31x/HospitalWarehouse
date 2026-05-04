"use client";

import { SKELETON_PULSE as b } from "./DataTableSkeleton";

export function NotificationListSkeleton() {
  return (
    <div className="space-y-3 py-4 px-2" aria-busy="true" aria-live="polite" aria-label="กำลังโหลดการแจ้งเตือน">
      <span className="sr-only">กำลังโหลดการแจ้งเตือน</span>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className={`h-10 w-10 rounded-full shrink-0 ${b}`} />
          <div className="flex-1 space-y-2 pt-0.5 min-w-0">
            <div className={`h-3 w-full max-w-[14rem] ${b}`} />
            <div className={`h-2.5 w-full max-w-md ${b}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
