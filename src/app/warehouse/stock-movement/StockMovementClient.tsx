"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  UserRound,
  X,
} from "lucide-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { getStockMovements } from "@/services/stockMovementService";
import {
  StockMovement,
  StockMovementFilters,
  StockMovementType,
} from "@/types/stockmovement_type";

const typeOptions: { v: StockMovementType | ""; l: string }[] = [
  { v: "", l: "ประเภททั้งหมด" },
  { v: "RECEIVE_IN", l: "รับเข้า" },
  { v: "RECEIVE_CANCEL", l: "ยกเลิกรับ" },
  { v: "OUT", l: "เบิกจ่าย" },
  { v: "ADJUST_IN", l: "ปรับเพิ่ม" },
  { v: "ADJUST_OUT", l: "ปรับลด" },
  { v: "UPDATE", l: "อัปเดต Lot" },
];

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  RECEIVE_IN:     { label: "รับเข้า",    cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  RECEIVE_CANCEL: { label: "ยกเลิกรับ",  cls: "bg-rose-100 text-rose-700 border border-rose-200" },
  OUT:            { label: "เบิกออก",    cls: "bg-amber-100 text-amber-700 border border-amber-200" },
  ADJUST_IN:      { label: "ปรับเพิ่ม",  cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  ADJUST_OUT:     { label: "ปรับลด",    cls: "bg-slate-100 text-slate-600 border border-slate-200" },
  UPDATE:         { label: "อัปเดต Lot",    cls: "bg-indigo-100 text-indigo-700 border border-indigo-200" },
};

const OUT_TYPES = new Set(["OUT", "RECEIVE_CANCEL", "ADJUST_OUT"]);

const fmt = (n: number | null | undefined) =>
  n == null ? "-" : n.toLocaleString("th-TH");

// ---- Main Client ----
const StockMovementClient = () => {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedMovement, setSelectedMovement] =
    useState<StockMovement | null>(null);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [selectedType, setSelectedType] = useState<StockMovementType | "">("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [startDateFocused, setStartDateFocused] = useState(false);
  const [endDateFocused, setEndDateFocused] = useState(false);

  // Pagination (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const fetchData = useCallback(
    async (page = 1) => {
      setIsFetching(true);
      try {
        const filters: StockMovementFilters = {
          page,
          limit: itemsPerPage,
          keyword: keyword || undefined,
          type: selectedType || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        };

        const result = await getStockMovements(filters);
        if (result.success) {
          setMovements(result.data);
          setTotalPages(result.meta.totalPages);
          setTotalItems(result.meta.total);
        } else {
          SweetAlertUtils.error(result.message || "ไม่สามารถดึงข้อมูลได้");
          setMovements([]);
        }
      } catch (error: any) {
        const errorMessage = error?.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        console.error("Failed to fetch stock movements:", error);
        SweetAlertUtils.error(errorMessage);
        setMovements([]);
      } finally {
        setIsFetching(false);
      }
    },
    [keyword, selectedType, startDate, endDate]
  );

  // reset page & fetch on filter change
  useEffect(() => {
    setCurrentPage(1);
    fetchData(1);
  }, [fetchData]);

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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchData(page);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">การเคลื่อนไหวสต็อก</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า, ผู้ดำเนินการ..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Type dropdown */}
        <div className="relative" data-filter-type>
          <button
            type="button"
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
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
                  <li key={t.v}>
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
          <label className={`absolute left-3 font-medium pointer-events-none transition-all duration-150 ${
            startDate || startDateFocused
              ? "-top-2 text-[10px] text-blue-500 bg-white px-1"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
          }`}>วันที่เริ่มต้น</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            onFocus={() => setStartDateFocused(true)}
            onBlur={() => setStartDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light", opacity: startDate || startDateFocused ? 1 : 0 }}
          />
        </div>
        <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
          endDateFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
        }`}>
          <label className={`absolute left-3 font-medium pointer-events-none transition-all duration-150 ${
            endDate || endDateFocused
              ? "-top-2 text-[10px] text-blue-500 bg-white px-1"
              : "top-1/2 -translate-y-1/2 text-sm text-slate-400"
          }`}>วันที่สิ้นสุด</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            onFocus={() => setEndDateFocused(true)}
            onBlur={() => setEndDateFocused(false)}
            className="w-full text-sm outline-none border-none bg-transparent"
            style={{ colorScheme: "light", opacity: endDate || endDateFocused ? 1 : 0 }}
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
      <div
        className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col"
        style={{ height: "65vh" }}
      >
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="animate-spin">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
            </div>
          </div>
        )}
        <div
          className="flex-1"
          style={{
            overflowX: "auto",
            overflowY: "auto",
            scrollbarWidth: "auto",
            msOverflowStyle: "auto",
          } as React.CSSProperties}
        >
          <style>{`
            div::-webkit-scrollbar {
              width: 0;
              height: 8px;
            }
            div::-webkit-scrollbar-track {
              background: #f1f5f9;
            }
            div::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 4px;
            }
            div::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4  w-[50px]">#</th>
                <th className="px-6 py-4 w-[150px]">รหัสสินค้า</th>
                <th className="px-6 py-4 w-[200px]">ชื่อสินค้า</th>
                <th className="px-6 py-4 w-[180px]">หมวดหมู่</th>
                <th className="px-6 py-4 w-[120px]">หน่วยนับ</th>
                <th className="px-6 py-4 w-[100px]">จำนวน</th>
                <th className="px-6 py-4 w-[180px]">ยอดคงเหลือ</th>
                <th className="px-6 py-4 w-[120px]">ประเภท</th>
                <th className="px-6 py-4 w-[200px]">ผู้ดำเนินการ</th>
                <th className="px-6 py-4 w-[160px]">วันที่และเวลา</th>
              </tr>
            </thead>
            <tbody className="">
              {movements.map((mv, idx) => {
                const isOut = OUT_TYPES.has(mv.type);
                const badge = TYPE_BADGE[mv.type] ?? { label: mv.type, cls: "bg-slate-100 text-slate-600 border border-slate-200" };
                return (
                  <tr key={mv.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                    <td className="px-6 py-[18px] text-slate-500 text-center">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-6 py-[18px] text-slate-500 font-mono">
                      {mv.item?.code ?? "-"}
                    </td>
                    <td className="px-6 py-[18px] text-slate-700 font-medium">
                      {mv.item?.name ?? "ไม่ระบุ"}
                    </td>
                    <td className="px-6 py-[18px] text-slate-500">
                      {mv.item?.category ?? "-"}
                    </td>
                    <td className="px-6 py-[18px] text-slate-500">
                      {mv.item?.unit ?? "-"}
                    </td>
                    <td className="px-6 py-[18px]">
                      <div className={`text-base font-bold ${isOut ? "text-rose-600" : "text-emerald-600"}`}>
                        {isOut ? "-" : "+"}{fmt(mv.quantity)}
                      </div>
                    </td>
                    <td className="px-6 py-[18px]">
                      {mv.balance_before != null && mv.balance_after != null ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-400 whitespace-nowrap">
                          <span>ก่อน: <span className="font-medium text-slate-500">{fmt(mv.balance_before)}</span></span>
                          <span className="text-slate-300">→</span>
                          <span>หลัง: <span className="font-medium text-slate-700">{fmt(mv.balance_after)}</span></span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-6 py-[18px]">
                      <span className="text-slate-700 text-sm">{badge.label}</span>
                    </td>
                    <td className="px-6 py-[18px] text-slate-600">
                      {mv.operator_name || mv.created_by ? (
                        <span className="text-sm">
                          {mv.operator_name ?? mv.created_by}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">ระบบอัตโนมัติ</span>
                      )}
                    </td>
                    <td className="px-6 py-[18px] text-slate-500">
                      {new Date(mv.created_at).toLocaleString("th-TH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {movements.length === 0 && !isFetching && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
              <Package className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-medium">ไม่พบข้อมูลการเคลื่อนไหวสต็อก</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">
          แสดง {movements.length} จาก {totalItems} รายการ
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed bg-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          onClose={() => setSelectedMovement(null)}
        />
      )}
      
    </div>
  );
};

export default StockMovementClient;
