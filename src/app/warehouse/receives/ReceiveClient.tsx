"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import {
    AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
    Eye, Plus, Search, X,
} from "lucide-react";
import * as receiveService from "@/services/receiveService";
import type { ReceiveBatch, ReceiveBatchHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ReceiveType, string> = {
    PURCHASE:       "จัดซื้อ",
    DONATION:       "รับบริจาคมา",
    PURCHASE_ASSET: "ครุภัณฑ์",
    REUSABLE_UNIT:  "ของใช้ซ้ำ",
};

const TYPE_BADGE: Record<ReceiveType, string> = {
    PURCHASE:       "bg-blue-100 text-blue-700",
    DONATION:       "bg-green-100 text-green-700",
    PURCHASE_ASSET: "bg-amber-100 text-amber-700",
    REUSABLE_UNIT:  "bg-violet-100 text-violet-700",
};

const STATUS_CFG: Record<ReceiveStatus, { color: string; label: string }> = {
    COMPLETED: { color: "bg-emerald-100 text-emerald-700", label: "เสร็จสมบูรณ์" },
    PENDING:   { color: "bg-amber-100 text-amber-600",    label: "รอดำเนินการ" },
    CANCELLED: { color: "bg-red-100 text-red-600",        label: "ยกเลิก" },
};

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CFG[status as ReceiveStatus] ?? { color: "bg-slate-100 text-slate-600", label: status };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
            {cfg.label}
        </span>
    );
}

function TypeBadge({ type }: { type: string }) {
    const cls   = TYPE_BADGE[type as ReceiveType] ?? "bg-slate-100 text-slate-600";
    const label = TYPE_LABEL[type as ReceiveType] ?? type;
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{label}</span>;
}

function fmtDate(iso: string | null | undefined) {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

function batchStatus(headers: ReceiveBatchHeader[]): ReceiveStatus {
    if (headers.some(h => h.status === "PENDING"))    return "PENDING";
    if (headers.some(h => h.status === "COMPLETED"))  return "COMPLETED";
    return "CANCELLED";
}

function batchItemCount(headers: ReceiveBatchHeader[]): number {
    return headers.reduce((sum, h) => sum + (h.receive_item?.length ?? 0), 0);
}

// ── Filter options ────────────────────────────────────────────────────────────

const typeOptions  = [
    { value: "", label: "ประเภททั้งหมด" },
    { value: "PURCHASE",       label: "จัดซื้อ" },
    { value: "DONATION",       label: "บริจาค" },
    { value: "PURCHASE_ASSET", label: "ครุภัณฑ์" },
    { value: "REUSABLE_UNIT",  label: "ของใช้ซ้ำ" },
];
const statusOptions = [
    { value: "", label: "สถานะทั้งหมด" },
    { value: "PENDING",   label: "รอดำเนินการ" },
    { value: "COMPLETED", label: "เสร็จสมบูรณ์" },
    { value: "CANCELLED", label: "ยกเลิก" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReceiveClient() {
    const router = useRouter();

    const [records,    setRecords]    = useState<ReceiveBatch[]>([]);
    const [total,      setTotal]      = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isFetching, setIsFetching] = useState(false);
    const [apiError,   setApiError]   = useState<string | null>(null);

    const [keyword,      setKeyword]      = useState("");
    const [typeFilter,   setTypeFilter]   = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [startDate,    setStartDate]    = useState("");
    const [endDate,      setEndDate]      = useState("");
    const [page,         setPage]         = useState(1);
    const limit = 20;

    const [isTypeOpen,   setIsTypeOpen]   = useState(false);
    const [isStatusOpen, setIsStatusOpen] = useState(false);
    const [startFocused, setStartFocused] = useState(false);
    const [endFocused,   setEndFocused]   = useState(false);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest("[data-filter-type]"))   setIsTypeOpen(false);
            if (!t.closest("[data-filter-status]")) setIsStatusOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const fetchData = useCallback(async () => {
        setIsFetching(true);
        setApiError(null);
        try {
            const res = await receiveService.getAllReceives({
                page, limit,
                keyword:    keyword    || undefined,
                type:       typeFilter || undefined,
                status:     statusFilter || undefined,
                start_date: startDate  || undefined,
                end_date:   endDate    || undefined,
            });
            // Sort by created_at in descending order (most recent first)
            const sortedItems = res.items.sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateB - dateA;
            });
            setRecords(sortedItems);
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

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [keyword, typeFilter, statusFilter, startDate, endDate]);

    const viewBatch = (id: number) => {
        if (id > 0) router.push(`/warehouse/receives/${id}`);
        else toast.error("รหัส Batch ไม่ถูกต้อง");
    };

    return (
        <div className="flex flex-col min-h-screen bg-white p-8">
            <Toaster position="top-right" />

            {apiError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-semibold text-red-900 text-sm">ข้อผิดพลาดในการดึงข้อมูล</p>
                        <p className="text-sm text-red-700 mt-0.5">{apiError}</p>
                        <button onClick={fetchData} className="mt-1 text-xs font-semibold text-red-600 underline">ลองอีกครั้ง</button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">รับพัสดุเข้าคลัง</h2>
                <button onClick={() => router.push("/warehouse/receives/createform")}
                    className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> สร้างใบรับสินค้า
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative w-60">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="ค้นหา Batch / เลขที่ / ผู้จำหน่าย..." value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                </div>

                {/* Type dropdown */}
                <div className="relative" data-filter-type>
                    <button type="button" onClick={() => { setIsTypeOpen(!isTypeOpen); setIsStatusOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between">
                        <span className="text-slate-700 font-medium truncate">{typeOptions.find(t => t.value === typeFilter)?.label}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isTypeOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-full">
                            {typeOptions.map(t => (
                                <button key={t.value} type="button"
                                    onClick={() => { setTypeFilter(t.value); setIsTypeOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${typeFilter === t.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Status dropdown */}
                <div className="relative" data-filter-status>
                    <button type="button" onClick={() => { setIsStatusOpen(!isStatusOpen); setIsTypeOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between">
                        <span className="text-slate-700 font-medium truncate">{statusOptions.find(s => s.value === statusFilter)?.label}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isStatusOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-full">
                            {statusOptions.map(s => (
                                <button key={s.value} type="button"
                                    onClick={() => { setStatusFilter(s.value); setIsStatusOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === s.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Date range */}
                <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
                  startFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
                }`}>
                  <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันที่เริ่มต้น</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onFocus={() => setStartFocused(true)}
                    onBlur={() => setStartFocused(false)}
                    className="w-full text-sm outline-none border-none bg-transparent"
                    style={{ colorScheme: "light" }}
                  />
                </div>
                <div className={`relative border rounded-lg px-4 shadow-sm w-[160px] h-[38px] flex items-center bg-white transition-colors ${
                  endFocused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"
                }`}>
                  <label className="absolute left-3 -top-2 text-[10px] text-slate-700 bg-white px-1 font-medium pointer-events-none">วันที่สิ้นสุด</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onFocus={() => setEndFocused(true)}
                    onBlur={() => setEndFocused(false)}
                    className="w-full text-sm outline-none border-none bg-transparent"
                    style={{ colorScheme: "light" }}
                  />
                </div>

                {(keyword || typeFilter || statusFilter || startDate || endDate) && (
                    <button type="button"
                        onClick={() => { setKeyword(""); setTypeFilter(""); setStatusFilter(""); setStartDate(""); setEndDate(""); setPage(1); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm">
                        <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col flex-1 max-h-[65vh]">
                {isFetching && (
                    <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
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
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-[50px]">#</th>
                                <th className="px-6 py-4 w-[140px]">Batch No.</th>
                                <th className="px-6 py-4 w-[180px]">วันที่รับ</th>
                                <th className="px-6 py-4 w-[200px]">ประเภท</th>
                                <th className="px-6 py-4 w-[200px]">ผู้จำหน่าย / ผู้บริจาค</th>
                                <th className="px-6 py-4 w-[100px] text-center">รายการ</th>
                                <th className="px-6 py-4 w-[150px]">สถานะ</th>
                                <th className="px-6 py-4 w-[100px] text-center">ดู</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-600">
                            {records.map((batch, idx) => {
                                const uniqueTypes = [batch.acquisition_type];
                                const itemCount   = batchItemCount(batch.headers);
                                const status      = batchStatus(batch.headers);

                                return (
                                    <tr key={batch.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                                        <td className="px-6 py-3 text-slate-400 text-sm">{(page - 1) * limit + idx + 1}</td>
                                        <td className="px-6 py-3 font-mono text-sm text-slate-700 font-semibold">{batch.batch_no}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600 whitespace-nowrap">{fmtDate(batch.created_at)}</td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {uniqueTypes.map(t => <TypeBadge key={t} type={t} />)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-sm text-slate-700 truncate">
                                            {batch.supplier_name || batch.donor_name || "-"}
                                        </td>
                                        <td className="px-6 py-3 text-center text-sm font-medium">{itemCount}</td>
                                        <td className="px-6 py-3"><StatusBadge status={status} /></td>
                                        <td className="px-6 py-3 text-center">
                                            <button onClick={() => viewBatch(batch.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {records.length === 0 && !isFetching && (
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
                            <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                            </svg>
                            <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-500">แสดง {records.length} จาก {total} รายการ</p>
                <div className="flex items-center gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-slate-700">หน้า {page} / {totalPages || 1}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                        className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
