"use client";

import React from "react";
import {
  LIST_TABLE_HEAD_ROW,
  LIST_TABLE_TD_COMPACT,
  LIST_TABLE_TH_COMPACT,
} from "@/lib/tableUi";

const bar = "animate-pulse rounded-md bg-slate-200/90";

/** ตาราง + footer แบบหน้ารายการคำขอ — ใช้ในการ์ดหลักขณะโหลดครั้งแรก */
export function RequestListTableSkeleton() {
  return (
    <>
      <div
        className="flex-1"
        style={
          {
            overflowX: "auto",
            overflowY: "auto",
            scrollbarWidth: "auto",
            msOverflowStyle: "auto",
          } as React.CSSProperties
        }
      >
        <style>{`
          div::-webkit-scrollbar { width: 0; height: 8px; }
          div::-webkit-scrollbar-track { background: #f1f5f9; }
          div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
        <table className="w-full text-sm text-left table-fixed border-collapse">
          <colgroup>
            <col className="w-10 min-w-[2rem]" />
            <col className="min-w-[7rem]" />
            <col className="min-w-[7rem]" />
            <col className="min-w-[7rem]" />
            <col className="min-w-[7rem]" />
            <col className="min-w-[7rem]" />
            <col className="w-[4.5rem] min-w-[4.5rem]" />
            <col className="min-w-[1rem]" />
          </colgroup>
          <thead className={LIST_TABLE_HEAD_ROW}>
            <tr>
              <th className={`${LIST_TABLE_TH_COMPACT} text-center`}>#</th>
              <th className={LIST_TABLE_TH_COMPACT}>เลขที่คำขอ</th>
              <th className={LIST_TABLE_TH_COMPACT}>วันที่/เวลา</th>
              <th className={LIST_TABLE_TH_COMPACT}>ผู้ทำรายการ</th>
              <th className={LIST_TABLE_TH_COMPACT}>แผนก</th>
              <th className={LIST_TABLE_TH_COMPACT}>ประเภท</th>
              <th className={LIST_TABLE_TH_COMPACT}>สถานะ</th>
              <th className={`${LIST_TABLE_TH_COMPACT} px-2 text-center`}>ตรวจสอบ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-600" aria-hidden>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="bg-white">
                <td className="px-3 py-3 text-center">
                  <div className={`h-3.5 w-4 mx-auto ${bar}`} />
                </td>
                <td className="px-3 py-3">
                  <div className={`h-3.5 w-[85%] max-w-[6.5rem] ${bar}`} />
                </td>
                <td className="px-3 py-3">
                  <div className={`h-3.5 w-[90%] max-w-[7rem] ${bar}`} />
                </td>
                <td className="px-3 py-3">
                  <div className={`h-3.5 w-full max-w-[8rem] ${bar}`} />
                </td>
                <td className="px-3 py-3">
                  <div className={`h-3.5 w-full max-w-[5.5rem] ${bar}`} />
                </td>
                <td className="px-3 py-3">
                  <div className={`h-3.5 w-10 ${bar}`} />
                </td>
                <td className="px-3 py-3">
                  <div className={`h-6 w-20 rounded-full ${bar}`} />
                </td>
                <td className="px-2 py-3 text-center">
                  <div className={`h-8 w-8 rounded-md mx-auto ${bar}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
        <div className={`h-4 w-48 max-w-full ${bar}`} />
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-lg ${bar}`} />
          <div className={`h-4 w-24 ${bar}`} />
          <div className={`h-9 w-9 rounded-lg ${bar}`} />
        </div>
      </div>
    </>
  );
}

/** โครงหน้ารายละเอียดคำขอ — ขณะโหลดรายละเอียด */
export function RequisitionDetailPageSkeleton() {
  return (
    <div
      className="flex flex-col bg-[#fafafa]"
      aria-busy="true"
      aria-live="polite"
      aria-label="กำลังโหลดรายละเอียดคำขอ"
    >
      <span className="sr-only">กำลังโหลดรายละเอียดคำขอ</span>
      <div className="flex-1 flex flex-col gap-5 p-3 sm:p-4 md:p-6">
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-11 w-11 shrink-0 rounded-lg ${bar}`} />
            <div className="space-y-2 min-w-0 flex-1">
              <div className={`h-8 w-full max-w-md ${bar}`} />
              <div className={`h-4 w-full max-w-xl ${bar}`} />
            </div>
          </div>
          <div className={`h-9 w-24 rounded-lg ${bar} shrink-0`} />
        </div>

        <section className="flex-shrink-0 rounded-xl bg-white border border-slate-200 shadow-sm p-5">
          <div className="mb-4 flex items-center gap-2.5 border-l-4 border-slate-200 pl-3 pb-0">
            <div className={`h-4 w-4 rounded ${bar}`} />
            <div className={`h-5 w-40 ${bar}`} />
          </div>
          <div className="border-b border-gray-100 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className={`h-3 w-24 ${bar}`} />
                <div className={`h-4 w-full max-w-[8rem] ${bar}`} />
              </div>
            ))}
          </div>
        </section>

        <div className="flex-1 min-h-0 flex overflow-hidden gap-5">
          <div className="flex-[3_1_0%] min-w-0 flex flex-col rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-200 flex-shrink-0">
              <div className={`h-4 w-56 max-w-full ${bar}`} />
            </div>
            <div className="flex-1 p-3 space-y-2 bg-white">
              <div className="flex gap-2 pb-2 border-b border-slate-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 min-w-0 ${bar} ${i === 2 ? "flex-[2]" : "flex-1"}`}
                  />
                ))}
              </div>
              {Array.from({ length: 6 }).map((_, r) => (
                <div key={r} className="flex gap-2 items-center py-2">
                  <div className={`h-11 w-11 rounded-lg shrink-0 ${bar}`} />
                  <div className={`h-3 flex-1 min-w-0 max-w-[4rem] ${bar}`} />
                  <div className={`h-3 flex-[2] min-w-0 ${bar}`} />
                  <div className={`h-3 flex-1 min-w-0 ${bar}`} />
                  <div className={`h-3 w-8 shrink-0 ${bar}`} />
                  <div className={`h-3 w-8 shrink-0 ${bar}`} />
                  <div className={`h-3 w-8 shrink-0 ${bar}`} />
                  <div className={`h-6 w-6 shrink-0 rounded-full ${bar}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex-[2_1_0%] min-w-0 flex flex-col rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b space-y-3">
              <div className={`h-2.5 w-24 ${bar}`} />
              <div className={`h-5 w-full max-w-[14rem] ${bar}`} />
              <div className="flex gap-2 rounded-lg border border-slate-100 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex-1 space-y-2 text-center py-1 border-r border-slate-100 last:border-0">
                    <div className={`h-2 w-12 mx-auto ${bar}`} />
                    <div className={`h-6 w-10 mx-auto ${bar}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 p-4 space-y-3">
              <div className={`h-24 w-full rounded-xl ${bar}`} />
              <div className={`h-32 w-full rounded-xl ${bar}`} />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-slate-200 px-4 py-3.5 flex justify-end gap-3 rounded-b-xl bg-white/80">
          <div className={`h-10 w-24 rounded-xl ${bar}`} />
          <div className={`h-10 w-28 rounded-xl ${bar}`} />
        </div>
      </div>
    </div>
  );
}
