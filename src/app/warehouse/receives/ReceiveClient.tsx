"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    Plus, Eye, Search, ChevronLeft, ChevronRight,
    ChevronDown, AlertCircle
} from "lucide-react";
import * as receiveService from "@/services/receiveService";
import type { ReceiveHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";


// ============ Helpers ============

const TYPE_LABEL: Record<ReceiveType, string> = {
    PURCHASE: "จัดซื้อ",
    DONATION: "บริจาค",
    PURCHASE_ASSET: "ครุภัณฑ์",
    REUSABLE_UNIT: "ของใช้ซ้ำรายชิ้น",
};

const TYPE_COLOR: Record<ReceiveType, string> = {
    PURCHASE: "bg-blue-100 text-blue-700",
    DONATION: "bg-blue-100 text-blue-700",
    PURCHASE_ASSET: "bg-blue-100 text-blue-700",
    REUSABLE_UNIT: "bg-blue-100 text-blue-700",
};

const STATUS_CONFIG: Record<ReceiveStatus, { color: string; label: string; dot: string }> = {
    COMPLETED: { color: "bg-emerald-100 text-emerald-700", label: "เสร็จสมบูรณ์", dot: "bg-emerald-500" },
    PENDING: { color: "bg-amber-100 text-amber-700", label: "รอดำเนินการ", dot: "bg-amber-500" },
    CANCELLED: { color: "bg-red-100 text-red-700", label: "ยกเลิก", dot: "bg-red-500" },
};

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = STATUS_CONFIG[status as ReceiveStatus] ?? { color: "bg-gray-100 text-gray-700", label: status, dot: "bg-gray-400" };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
};

const TypeBadge = ({ type }: { type: string }) => {
    const color = TYPE_COLOR[type as ReceiveType] ?? "bg-gray-100 text-gray-700";
    const label = TYPE_LABEL[type as ReceiveType] ?? type;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
            {label}
        </span>
    );
};

const formatDate = (iso: string) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// ============ Main Component ============

const typeOptions = [
    { value: "", label: "ประเภททั้งหมด" },
    { value: "PURCHASE", label: "จัดซื้อ" },
    { value: "DONATION", label: "บริจาค" },
    { value: "PURCHASE_ASSET", label: "ครุภัณฑ์" },
    { value: "REUSABLE_UNIT", label: "ของใช้ซ้ำรายชิ้น" },
];

const statusOptions = [
    { value: "", label: "สถานะทั้งหมด" },
    { value: "PENDING", label: "รอดำเนินการ" },
    { value: "COMPLETED", label: "เสร็จสมบูรณ์" },
    { value: "CANCELLED", label: "ยกเลิก" },
];

export default function ReceiveClient() {
    const router = useRouter();

    const [records, setRecords] = useState<ReceiveHeader[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // Filters
    const [keyword, setKeyword] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;

    // Dropdown open states
    const [isTypeOpen, setIsTypeOpen] = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest("[data-filter-type]")) setIsTypeOpen(false);
            if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
        };
        if (isTypeOpen || isStatusOpen) {
            document.addEventListener("mousedown", handleClickOutside);
            return () => document.removeEventListener("mousedown", handleClickOutside);
        }
    }, [isTypeOpen, isStatusOpen]);

    const fetchData = useCallback(async () => {
        setIsFetching(true);
        setApiError(null);
        try {
            const res = await receiveService.getAllReceives({
                page,
                limit,
                keyword: keyword || undefined,
                type: typeFilter || undefined,
                status: statusFilter || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });

            setRecords(res.items);
            setTotal(res.total);
            setTotalPages(res.totalPages);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            setApiError(msg);
            toast.error("ดึงข้อมูลไม่สำเร็จ: " + msg);
        } finally {
            setIsFetching(false);
        }
    }, [page, keyword, typeFilter, statusFilter, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [keyword, typeFilter, statusFilter, startDate, endDate]);

    return (
        <div className="flex flex-col min-h-screen bg-white p-8">
            <Toaster position="top-right" />

            {/* Error Alert */}
            {apiError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-900">ข้อผิดพลาดในการดึงข้อมูล</h3>
                        <p className="text-sm text-red-700 mt-1">{apiError}</p>
                        <button onClick={fetchData} className="mt-2 text-sm font-semibold text-red-600 hover:text-red-700 underline">
                            ลองอีกครั้ง
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800">รับพัสดุเข้าคลัง</h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push("/warehouse/receives/createform")}
                        className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md"
                    >
                        <Plus className="w-4 h-4" /> สร้างใบรับสินค้า
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหาเลขที่เอกสาร / ผู้จำหน่าย..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
                    />
                </div>

                {/* Type Dropdown */}
                <div className="relative" data-filter-type>
                    <button
                        type="button"
                        onClick={() => { setIsTypeOpen(!isTypeOpen); setIsStatusOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
                    >
                        <span className="text-slate-800 font-medium">{typeOptions.find(t => t.value === typeFilter)?.label || "ประเภททั้งหมด"}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isTypeOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                                {typeOptions.map(t => (
                                    <li key={t.value}>
                                        <button
                                            type="button"
                                            onClick={() => { setTypeFilter(t.value); setIsTypeOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${typeFilter === t.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Status Dropdown */}
                <div className="relative" data-filter-status>
                    <button
                        type="button"
                        onClick={() => { setIsStatusOpen(!isStatusOpen); setIsTypeOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
                    >
                        <span className="text-slate-800 font-medium">{statusOptions.find(s => s.value === statusFilter)?.label || "สถานะทั้งหมด"}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isStatusOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
                            <ul className="py-1">
                                {statusOptions.map(s => (
                                    <li key={s.value}>
                                        <button
                                            type="button"
                                            onClick={() => { setStatusFilter(s.value); setIsStatusOpen(false); }}
                                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                        >
                                            {s.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">วันที่เริ่มต้น</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600 font-medium">วันที่สิ้นสุด</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
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
                    overflowX: 'auto',
                    overflowY: 'auto',
                    scrollbarWidth: 'auto',
                    msOverflowStyle: 'auto',
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
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-[50px]">#</th>
                                <th className="px-6 py-4 w-[200px]">เลขที่เอกสาร</th>
                                <th className="px-6 py-4 w-[110px]">วันที่รับ</th>
                                <th className="px-6 py-4 w-[100px]">ประเภท</th>
                                <th className="px-6 py-4 w-[250px]">ผู้จำหน่าย / ผู้บริจาค</th>
                                <th className="px-6 py-4 w-[100px] text-center">จำนวนรายการ</th>
                                <th className="px-6 py-4 w-[130px]">สถานะ</th>
                                <th className="px-6 py-4 w-[80px] text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {records.map((rec, idx) => (
                                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 w-[50px]">{(page - 1) * limit + idx + 1}</td>
                                    <td className="px-6 py-4 font-mono font-medium text-blue-900 whitespace-nowrap">
                                        {rec.doc_no}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {formatDate(rec.receive_date)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {TYPE_LABEL[rec.type as ReceiveType] ?? rec.type}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="line-clamp-1" title={rec.supplier_name || rec.donor_name || undefined}>
                                            {rec.supplier_name || rec.donor_name || "-"}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center font-semibold">
                                        {rec.receive_item?.length ?? 0}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={rec.status} />
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => {
                                                const idNum = Number(rec.id);
                                                if (idNum && Number.isFinite(idNum) && idNum > 0) {
                                                    router.push(`/warehouse/receives/${idNum}`);
                                                } else {
                                                    toast.error("รหัสเอกสารไม่ถูกต้อง");
                                                }
                                            }}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center justify-center"
                                            title="ดูรายละเอียด"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Empty State */}
                    {records.length === 0 && !isFetching && (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                            </svg>
                            <p className="text-sm font-medium">ไม่พบข้อมูลพัสดุเข้าคลัง</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-500">แสดง {records.length} จาก {total} รายการ</p>
                <div className="flex items-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">หน้า {page} / {totalPages || 1}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
