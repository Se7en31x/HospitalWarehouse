"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  X,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getStockMovements } from "@/services/stockMovementService";
import {
  StockMovement,
  StockMovementFilters,
  StockMovementType,
} from "@/types/stockmovement_type";

// ---- config ----
const typeConfig: Record<
  StockMovementType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  RECEIVE_IN: {
    label: "รับเข้า",
    color: "text-emerald-700 bg-emerald-50",
    icon: <ArrowDownCircle className="w-3.5 h-3.5" />,
  },
  RECEIVE_CANCEL: {
    label: "ยกเลิกรับ",
    color: "text-rose-700 bg-rose-50",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
  },
  OUT: {
    label: "เบิกจ่าย",
    color: "text-orange-700 bg-orange-50",
    icon: <ArrowUpCircle className="w-3.5 h-3.5" />,
  },
  ADJUST_IN: {
    label: "ปรับเพิ่ม",
    color: "text-blue-700 bg-blue-50",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  ADJUST_OUT: {
    label: "ปรับลด",
    color: "text-amber-700 bg-amber-50",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  UPDATE: {
    label: "อัปเดต",
    color: "text-slate-600 bg-slate-100",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
};

const typeOptions: { v: StockMovementType | ""; l: string }[] = [
  { v: "", l: "ทุกประเภท" },
  { v: "RECEIVE_IN", l: "รับเข้า" },
  { v: "RECEIVE_CANCEL", l: "ยกเลิกรับ" },
  { v: "OUT", l: "เบิกจ่าย" },
  { v: "ADJUST_IN", l: "ปรับเพิ่ม" },
  { v: "ADJUST_OUT", l: "ปรับลด" },
  { v: "UPDATE", l: "อัปเดต" },
];

// ---- TypeBadge ----
const TypeBadge = ({ type }: { type: string }) => {
  const cfg = typeConfig[type as StockMovementType];
  if (!cfg) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
        {type}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

// ---- Detail Modal ----
const MovementDetailModal = ({
  movement,
  onClose,
}: {
  movement: StockMovement;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-slate-800">รายละเอียดการเคลื่อนไหว</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Item */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            {movement.item?.image_url ? (
              <img
                src={movement.item.image_url}
                alt={movement.item.name}
                className="w-16 h-16 rounded-lg object-cover border"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center">
                <Package className="w-7 h-7 text-slate-400" />
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-800">
                {movement.item?.name ?? "ไม่ระบุสินค้า"}
              </p>
              <p className="text-xs text-slate-500">
                รหัส: {movement.item?.code ?? "-"}
              </p>
              <p className="text-xs text-slate-500">
                หมวดหมู่: {movement.item?.category ?? "-"} | หน่วย:{" "}
                {movement.item?.unit ?? "-"}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">ประเภท</p>
              <TypeBadge type={movement.type} />
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">จำนวน</p>
              <p
                className={`font-bold text-lg ${
                  ["DISPENSE", "ADJUST_OUT", "TRANSFER_OUT"].includes(movement.type)
                    ? "text-rose-600"
                    : "text-emerald-600"
                }`}
              >
                {["DISPENSE", "ADJUST_OUT", "TRANSFER_OUT"].includes(movement.type)
                  ? "-"
                  : "+"}
                {movement.quantity} {movement.item?.unit ?? ""}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">ผู้ดำเนินการ</p>
              <p className="font-medium text-slate-700">
                {movement.created_by ?? "-"}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-400 mb-1">วันที่/เวลา</p>
              <p className="font-medium text-slate-700">
                {new Date(movement.created_at).toLocaleString("th-TH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          {movement.note && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-amber-600 mb-1 font-medium">หมายเหตุ</p>
              <p className="text-sm text-slate-700">{movement.note}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};

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
          toast.error(result.message || "ไม่สามารถดึงข้อมูลได้");
          setMovements([]);
        }
      } catch {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchData(page);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

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
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>

        {/* Type dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
            className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm min-w-[150px] justify-between"
          >
            <span>
              {selectedType
                ? typeOptions.find((t) => t.v === selectedType)?.l
                : "ทุกประเภท"}
            </span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isTypeDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {isTypeDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-30 min-w-full">
              {typeOptions.map((t) => (
                <button
                  key={t.v}
                  onClick={() => {
                    setSelectedType(t.v);
                    setIsTypeDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50"
                >
                  {t.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
          <span className="text-slate-400 text-sm">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(""); setEndDate(""); }}
              className="text-xs text-slate-400 hover:text-slate-600 underline"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden flex flex-col relative"
        style={{ height: "60vh" }}
      >
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        )}

        <div className="overflow-auto flex-1">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10 border-b">
              <tr className="text-slate-700 font-semibold uppercase">
                <th className="px-6 py-4">#</th>
                <th className="px-4 py-4">รูป</th>
                <th className="px-4 py-4">รหัสสินค้า</th>
                <th className="px-6 py-4">ชื่อสินค้า</th>
                <th className="px-6 py-4 text-center">ประเภท</th>
                <th className="px-6 py-4 text-center">จำนวน</th>
                <th className="px-6 py-4">ผู้ดำเนินการ</th>
                <th className="px-6 py-4">วันที่</th>
                <th className="px-6 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((mv, idx) => {
                const isOut = ["OUT", "RECEIVE_CANCEL", "ADJUST_OUT"].includes(mv.type);
                return (
                  <tr key={mv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-4 py-4">
                      {mv.item?.image_url ? (
                        <img
                          src={mv.item.image_url}
                          alt={mv.item.name}
                          className="w-9 h-9 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500 font-mono">
                      {mv.item?.code ?? "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {mv.item?.name ?? "ไม่ระบุ"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <TypeBadge type={mv.type} />
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      <span className={isOut ? "text-rose-600" : "text-emerald-600"}>
                        {isOut ? "-" : "+"}
                        {mv.quantity} {mv.item?.unit ?? ""}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {mv.created_by ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(mv.created_at).toLocaleString("th-TH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setSelectedMovement(mv)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {movements.length === 0 && !isFetching && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Package className="w-12 h-12 mb-3 opacity-30" />
              <p>ไม่พบข้อมูลการเคลื่อนไหวสต็อก</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <p className="text-sm text-slate-500">
          แสดง {movements.length} จาก {totalItems} รายการ
        </p>
        <div className="flex items-center gap-4">
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            หน้า {currentPage} / {totalPages || 1}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50"
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
