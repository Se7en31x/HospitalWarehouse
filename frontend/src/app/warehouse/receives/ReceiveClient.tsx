"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    Plus, Eye, Search, ChevronLeft, ChevronRight,
    Loader2, AlertCircle,
} from "lucide-react";
import * as receiveService from "@/services/receiveService";
import type { ReceiveHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";

// ============ Helpers ============

const TYPE_LABEL: Record<ReceiveType, string> = {
    PURCHASE: "จัดซื้อ",
    DONATION: "บริจาค",
    PURCHASE_ASSET: "ครุภัณฑ์",
};

const TYPE_COLOR: Record<ReceiveType, string> = {
    PURCHASE: "bg-blue-100 text-blue-700",
    DONATION: "bg-purple-100 text-purple-700",
    PURCHASE_ASSET: "bg-orange-100 text-orange-700",
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
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-800">รับพัสดุเข้าคลัง</h2>
                <button
                    onClick={() => router.push("/warehouse/receives/createform")}
                    className="px-4 py-2 rounded-xl bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-md"
                >
                    <Plus className="w-4 h-4" /> สร้างใบรับสินค้า
                </button>
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
                        className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">ทุกประเภท</option>
                    <option value="PURCHASE">จัดซื้อ</option>
                    <option value="DONATION">บริจาค</option>
                    <option value="PURCHASE_ASSET">ครุภัณฑ์</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    <option value="">ทุกสถานะ</option>
                    <option value="PENDING">รอดำเนินการ</option>
                    <option value="COMPLETED">เสร็จสมบูรณ์</option>
                    <option value="CANCELLED">ยกเลิก</option>
                </select>

                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <span className="text-slate-400 text-sm">ถึง</span>
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>

            {/* Table */}
            <div className="h-[65vh] rounded-xl bg-white shadow-lg overflow-hidden relative border border-slate-100">
                {isFetching && (
                    <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    </div>
                )}
                <div className="overflow-x-auto h-full flex flex-col">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-4 w-[50px] text-center">#</th>
                                <th className="px-4 py-4 w-[220px]">เลขที่เอกสาร</th>
                                <th className="px-4 py-4 w-[110px]">วันที่รับ</th>
                                <th className="px-4 py-4 w-[100px]">ประเภท</th>
                                <th className="px-4 py-4 min-w-[250px]">ผู้จำหน่าย / ผู้บริจาค</th>
                                <th className="px-4 py-4 w-[100px] text-center">จำนวนรายการ</th>
                                <th className="px-4 py-4 w-[130px] text-center">สถานะ</th>
                                <th className="px-4 py-4 w-[80px] text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {records.map((rec, idx) => (
                                <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-4 text-center">{(page - 1) * limit + idx + 1}</td>
                                    <td className="px-4 py-4 font-mono font-medium text-blue-900 whitespace-nowrap">
                                        {rec.doc_no}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {formatDate(rec.receive_date)}
                                    </td>
                                    <td className="px-4 py-4">
                                        <TypeBadge type={rec.type} />
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="line-clamp-1" title={rec.supplier_name || rec.donor_name || undefined}>
                                            {rec.supplier_name || rec.donor_name || "-"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center font-semibold">
                                        {rec.receive_item?.length ?? 0}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <StatusBadge status={rec.status} />
                                    </td>
                                    <td className="px-4 py-4 text-center">
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
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Empty State */}
                    {records.length === 0 && !isFetching && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 py-10">
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
                <p className="text-sm text-slate-500">
                    แสดง {records.length} จาก {total} รายการ
                </p>
                <div className="flex items-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">หน้า {page} / {totalPages || 1}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-2 border rounded-lg disabled:opacity-30 hover:bg-slate-50"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
