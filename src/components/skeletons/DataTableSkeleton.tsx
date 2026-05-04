"use client";

import type { CSSProperties } from "react";
import { LIST_TABLE_HEAD_ROW, LIST_TABLE_TD, LIST_TABLE_TH } from "@/lib/tableUi";

export const SKELETON_PULSE = "animate-pulse rounded-md bg-slate-200/90";

const scrollBoxStyle: CSSProperties = {
  overflowX: "auto",
  overflowY: "auto",
  scrollbarWidth: "auto",
  msOverflowStyle: "auto",
};

const scrollbarCss = `
  div[data-sk-scroll]::-webkit-scrollbar { width: 0; height: 8px; }
  div[data-sk-scroll]::-webkit-scrollbar-track { background: #f1f5f9; }
  div[data-sk-scroll]::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
  div[data-sk-scroll]::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
`;

type DataTableSkeletonProps = {
  headers: string[];
  rowCount?: number;
  showPaginationFooter?: boolean;
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  thClassName?: string;
  tdClassName?: string;
  ariaLabel?: string;
  minHeight?: string;
};

/** ตารางโหลดแบบมีหัวคอลัมน์จริง — ใช้ร่วมหน้ารายการในคลัง/คำขอ */
export function DataTableSkeleton({
  headers,
  rowCount = 10,
  showPaginationFooter = false,
  className = "",
  tableClassName = "w-full table-fixed text-sm text-left border-collapse",
  theadClassName = LIST_TABLE_HEAD_ROW,
  thClassName = LIST_TABLE_TH,
  tdClassName = LIST_TABLE_TD,
  ariaLabel = "กำลังโหลดข้อมูล",
  minHeight,
}: DataTableSkeletonProps) {
  const b = SKELETON_PULSE;
  const n = headers.length;
  return (
    <div
      className={`flex flex-col flex-1 ${minHeight ?? ""} ${className}`.trim()}
      aria-busy="true"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
      <div className="flex-1" style={scrollBoxStyle} data-sk-scroll>
        <style>{scrollbarCss}</style>
        <table className={tableClassName}>
          <thead className={theadClassName}>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={`${h}-${i}`}
                  className={`${thClassName} ${i === 0 ? "text-center" : ""} ${i === n - 1 ? "text-center" : ""}`.trim()}
                >
                  {h.trim() ? h : "\u00a0"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600" aria-hidden>
            {Array.from({ length: rowCount }).map((_, ri) => (
              <tr key={ri} className="bg-white">
                {headers.map((_, ci) => {
                  const isFirst = ci === 0;
                  const isLast = ci === n - 1;
                  let inner = <div className={`h-3.5 w-[88%] max-w-[9rem] ${b}`} />;
                  if (isFirst) inner = <div className={`h-3.5 w-5 mx-auto ${b}`} />;
                  else if (isLast) inner = <div className={`h-8 w-8 rounded-md mx-auto ${b}`} />;
                  return (
                    <td key={ci} className={tdClassName}>
                      {inner}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showPaginationFooter && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
          <div className={`h-4 w-48 max-w-full ${b}`} />
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-lg ${b}`} />
            <div className={`h-4 w-24 ${b}`} />
            <div className={`h-9 w-9 rounded-lg ${b}`} />
          </div>
        </div>
      )}
    </div>
  );
}
