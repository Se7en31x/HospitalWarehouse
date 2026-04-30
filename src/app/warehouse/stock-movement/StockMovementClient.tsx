"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  X,
  StickyNote,
} from "lucide-react";
import { fmtDateTime } from "@/utils/dateUtils";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { getAllStockMovements } from "@/services/stockMovementService";
import {
  StockMovement,
  StockMovementType,
} from "@/types/stockmovement_type";

const typeOptions: { v: StockMovementType | ""; l: string }[] = [
  { v: "", l: "ประเภททั้งหมด" },
  { v: "RECEIVE_IN", l: "รับเข้า" },
  { v: "OUT", l: "เบิกจ่าย" },
  { v: "RETURN_IN", l: "รับคืน" },
  { v: "ADJUST_IN", l: "ปรับเพิ่ม" },
  { v: "ADJUST_OUT", l: "ปรับลด" },
  { v: "UPDATE", l: "อัปเดต Lot" },
];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  RECEIVE_IN:     { label: "รับเข้า",    cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  OUT:            { label: "เบิกจ่าย",    cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  RETURN_IN:      { label: "รับคืน",     cls: "bg-teal-100 text-teal-700 border border-teal-200" },
  ADJUST_IN:      { label: "ปรับเพิ่ม",  cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  ADJUST_OUT:     { label: "ปรับลด",    cls: "bg-slate-100 text-slate-600 border border-slate-200" },
  UPDATE:         { label: "อัปเดต Lot",    cls: "bg-indigo-100 text-indigo-700 border border-indigo-200" },
};

const OUT_TYPES = new Set(["OUT", "RECEIVE_CANCEL", "ADJUST_OUT"]);

const PAGE_LIMIT = 10;

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : n.toLocaleString("th-TH");

// ---- Main Client ----
const StockMovementClient = () => {
  const [allMovements, setAllMovements] = useState<StockMovement[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [selectedType, setSelectedType] = useState<StockMovementType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [openPopover, setOpenPopover] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    try {
      const all = await getAllStockMovements({});
      const sorted = [...all].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setAllMovements(sorted);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      console.error("Failed to fetch stock movements:", error);
      SweetAlertUtils.error(errorMessage);
      setAllMovements([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedType, startDate, endDate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filter-type]")) setIsTypeDropdownOpen(false);
    };
    if (isTypeDropdownOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isTypeDropdownOpen]);

  const filteredMovements = allMovements.filter((mv) => {
    if (keyword.trim()) {
      const k = keyword.toLowerCase();
      const matchKw =
        (mv.item?.code || "").toLowerCase().includes(k) ||
        (mv.item?.name || "").toLowerCase().includes(k) ||
        (mv.operator_name || "").toLowerCase().includes(k) ||
        (mv.created_by || "").toLowerCase().includes(k);
      if (!matchKw) return false;
    }
    if (selectedType && mv.type !== selectedType) return false;
    if (startDate) {
      const row = new Date(mv.created_at);
      row.setHours(0, 0, 0, 0);
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      if (row < s) return false;
    }
    if (endDate) {
      const row = new Date(mv.created_at);
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      if (row > e) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredMovements.length / PAGE_LIMIT) || 1;
  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * PAGE_LIMIT,
    currentPage * PAGE_LIMIT
  );
  const pagedCount = paginatedMovements.length;
  const filteredCount = filteredMovements.length;
  const allCount = allMovements.length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">การเคลื่อนไหวสต็อก</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพัสดุ, ผู้ดำเนินการ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Type dropdown */}
        <div className="relative w-full sm:w-auto" data-filter-type>
          <button
            type="button"
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
          >
            <span className="text-slate-800 font-medium">
              {selectedType
                ? typeOptions.find((t) => t.v === selectedType)?.l
                : "ประเภททั้งหมด"}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
              <ul className="py-1">
                {typeOptions.map((t) => (
                  <li key={t.v || "all"}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedType(t.v);
                        setIsTypeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedType === t.v
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {t.l}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Date range */}
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          startDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light" }}
          />
        </div>

        {/* Clear filters */}
        {(keyword || selectedType || startDate || endDate) && (
          <button
            type="button"
            onClick={() => {
              setKeyword("");
              setSelectedType("");
              setStartDate("");
              setEndDate("");
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
          >
            <X className="w-3.5 h-3.5" />
            ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
        {isFetching ? (
          <div className="flex items-center justify-center py-16">
            <DotLottieReact
              src="https://lottie.host/50197ea7-8a57-448a-b3ef-b6bd2722fa07/TBa7UxyEPE.lottie"
              loop
              autoplay
              style={{ width: 160, height: 160 }}
            />
          </div>
        ) : (
          <>
            <div
              data-stock-movement-scroll
              className="flex-1 min-h-0"
              style={{
                overflowX: "auto",
                overflowY: "auto",
                scrollbarWidth: "auto",
                msOverflowStyle: "auto",
              } as CSSProperties}
            >
              <style>{`
            div[data-stock-movement-scroll]::-webkit-scrollbar {
              width: 0;
              height: 8px;
            }
            div[data-stock-movement-scroll]::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div[data-stock-movement-scroll]::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div[data-stock-movement-scroll]::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <table className="w-max min-w-full table-auto border-collapse text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="pl-3 pr-2 py-4 whitespace-nowrap w-10 text-center">#</th>
                <th className="px-2 py-4 whitespace-nowrap">รหัสรายการ</th>
                <th className="px-3 py-4 whitespace-nowrap">ชื่อพัสดุ</th>
                <th className="px-3 py-4 whitespace-nowrap">หมวดหมู่</th>
                <th className="px-2 py-4 whitespace-nowrap">หน่วยนับ</th>
                <th className="px-2 py-4 whitespace-nowrap text-center">จำนวน</th>
                <th className="px-2 py-4 whitespace-nowrap">ยอดคงเหลือ</th>
                <th className="px-2 py-4 whitespace-nowrap">ประเภท</th>
                <th className="px-3 py-4 whitespace-nowrap">ผู้ดำเนินการ</th>
                <th className="px-2 py-4 whitespace-nowrap">วันที่/เวลา</th>
                <th className="pr-3 pl-1 py-4 whitespace-nowrap text-center w-11">ตรวจสอบ</th>
              </tr>
            </thead>
            <tbody className="text-slate-600">
              {paginatedMovements.map((mv, idx) => {
                const isOut = OUT_TYPES.has(mv.type);
                const badge = TYPE_BADGE[mv.type] ?? { label: mv.type, cls: "bg-slate-100 text-slate-600 border border-slate-200" };
                const itemName = mv.item?.name ?? "ไม่ระบุ";
                const categoryText = mv.item?.category ?? "-";
                const operatorDisplay = mv.operator_name ?? mv.created_by ?? "";
                return (
                  <tr key={mv.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                    <td className="pl-3 pr-2 py-3 text-slate-500 tabular-nums text-center">
                      {(currentPage - 1) * PAGE_LIMIT + idx + 1}
                    </td>
                    <td className="px-2 py-3 text-slate-500 font-mono text-sm whitespace-nowrap">
                      {mv.item?.code ?? "-"}
                    </td>
                    <td className="max-w-[min(18rem,28vw)] px-3 py-3 whitespace-nowrap truncate align-middle" title={itemName}>
                      {itemName}
                    </td>
                    <td className="max-w-[min(14rem,22vw)] px-3 py-3 whitespace-nowrap truncate align-middle" title={categoryText}>
                      {categoryText}
                    </td>
                    <td className="max-w-[min(8rem,22vw)] px-2 py-3 truncate align-middle" title={mv.item?.unit ?? undefined}>
                      {mv.item?.unit ?? "-"}
                    </td>
                    <td className="px-2 py-3 text-center whitespace-nowrap align-middle">
                      <span className={`inline-block text-base font-bold tabular-nums ${isOut ? "text-rose-600" : "text-emerald-600"}`}>
                        {isOut ? "-" : "+"}{fmt(mv.quantity)}
                      </span>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap align-middle">
                      {mv.balance_before != null && mv.balance_after != null ? (
                        <div className="inline-flex items-center gap-1.5 text-sm text-slate-400 whitespace-nowrap">
                          <span>ก่อน: <span className="font-medium text-slate-500">{fmt(mv.balance_before)}</span></span>
                          <span className="text-slate-300">→</span>
                          <span>หลัง: <span className="font-medium text-slate-700">{fmt(mv.balance_after)}</span></span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap align-middle">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="max-w-[min(10rem,16vw)] px-3 py-3 whitespace-nowrap truncate align-middle text-sm" title={operatorDisplay || undefined}>
                      {mv.operator_name || mv.created_by ? (
                        operatorDisplay
                      ) : (
                        <span className="text-slate-400 text-xs">ระบบอัตโนมัติ</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-slate-500 text-sm whitespace-nowrap align-middle">
                      {fmtDateTime(mv.created_at)}
                    </td>
                    <td className="pr-3 pl-1 py-3 text-center whitespace-nowrap align-middle">
                      <NotePopover
                        id={mv.id}
                        note={mv.note}
                        isOpen={openPopover === mv.id}
                        onToggle={() => setOpenPopover(prev => prev === mv.id ? null : mv.id)}
                        onClose={() => setOpenPopover(null)}
                      />
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={11}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-medium">ไม่พบข้อมูลการเคลื่อนไหวสต็อก</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
            </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
          <p className="text-sm text-slate-500">
            แสดง {pagedCount} จาก {filteredCount} รายการ
            {filteredCount !== allCount && (
              <span className="text-slate-400"> (ทั้งหมด {allCount} รายการ)</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              หน้า {currentPage} / {totalPages || 1}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors bg-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
          </>
        )}
      </div>

    </div>
  );
};

// ── Note parser ───────────────────────────────────────────────────────────────
// note format: "[action] itemCode itemName qty | ล็อต X | ใบ Y | แผนก Z | หมายเหตุ: ..."
function parseNoteParts(raw: string | null | undefined): { action: string | null; parts: string[] } {
  if (!raw?.trim()) return { action: null, parts: [] };
  const segments = raw.split(" | ").map(s => s.trim()).filter(Boolean);
  const first = segments[0] ?? "";
  const actionMatch = first.match(/^\[(.+?)\]/);
  if (actionMatch) {
    const action = first; // keep full first segment (has item info after action)
    return { action, parts: segments.slice(1) };
  }
  return { action: null, parts: segments };
}

// ── Note Popover ──────────────────────────────────────────────────────────────
function NotePopover({ id, note, isOpen, onToggle, onClose }: {
  id: number;
  note: string | null | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { action, parts } = parseNoteParts(note);
  const allParts = action ? [action, ...parts] : parts;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex p-2 rounded-lg transition-all ${isOpen ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
        title="ดูบันทึก"
      >
        <StickyNote className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {allParts.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400 italic">ไม่มีบันทึก</p>
          ) : (
            <ul className="py-2 max-h-60 overflow-y-auto">
              {allParts.map((part, i) => (
                <li key={i} className="flex items-start gap-2.5 px-4 py-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0 mt-2" />
                  <span className={`text-xs leading-relaxed ${i === 0 ? "text-slate-800 font-medium" : "text-slate-500"}`}>{part}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default StockMovementClient;
