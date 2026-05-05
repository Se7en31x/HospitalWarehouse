"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertCircle, ChevronDown, ChevronLeft, ChevronRight,
    Eye, Plus, Search, X, PackagePlus,
} from "lucide-react";

import { DataTableSkeleton } from "@/components/skeletons/DataTableSkeleton";
import { PageHeadingIconBox } from "@/components/PageHeadingIconBox";
import { LIST_TABLE_HEAD_ROW, LIST_TABLE_TH_WIDE, LIST_TABLE_TBODY } from "@/lib/tableUi";
import * as receiveService from "@/services/receiveService";
import { socket } from "@/lib/socket";
import type { ReceiveBatch, ReceiveBatchHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { fmtDate } from "@/utils/dateUtils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ReceiveType, string> = {
    PURCHASE:       "จัดซื้อ",
    DONATION:       "รับบริจาค",
    PURCHASE_ASSET: "ซื้อครุภัณฑ์",
    REUSABLE_UNIT:  "รับพัสดุนำกลับมาใช้",
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
    const label = TYPE_LABEL[type as ReceiveType] ?? type;
    return <span>{label}</span>;
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

    const [allRecords,  setAllRecords]  = useState<ReceiveBatch[]>([]);
    const [isFetching,  setIsFetching]  = useState(true);
    const [apiError,    setApiError]    = useState<string | null>(null);

    const [keyword,      setKeyword]      = useState("");
    const [typeFilter,   setTypeFilter]   = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [startDate,    setStartDate]    = useState("");
    const [endDate,      setEndDate]      = useState("");
    const [page,         setPage]         = useState(1);
    const limit = 10;

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

    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRefreshingRef = useRef(false);
    const isVisibleRef = useRef(true);

    const fetchAll = useCallback(async (silent = false) => {
        if (!silent) { setIsFetching(true); setApiError(null); }
        try {
            const all = await receiveService.getAllReceivesAll();
            const sorted = [...all].sort((a, b) =>
                new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
            setAllRecords(sorted);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
            if (!silent) setApiError(msg);
        } finally {
            if (!silent) setIsFetching(false);
        }
    }, []);

    const refreshData = useCallback(async () => {
        fetchAll(true);
    }, [fetchAll]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        isVisibleRef.current = document.visibilityState === "visible";
        const onVisibilityChange = () => {
            isVisibleRef.current = document.visibilityState === "visible";
            if (isVisibleRef.current) refreshData();
        };
        document.addEventListener("visibilitychange", onVisibilityChange);
        if (!socket.connected) socket.connect();

        const scheduleRefresh = () => {
            if (!isVisibleRef.current || isRefreshingRef.current) return;
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(async () => {
                isRefreshingRef.current = true;
                try { await refreshData(); }
                finally { isRefreshingRef.current = false; refreshTimerRef.current = null; }
            }, 220);
        };

        const handleRefreshSignal = (message: string) => {
            if (message === "RECEIVES" || message === "LOTS") scheduleRefresh();
        };

        socket.on("REFRESH_DATA", handleRefreshSignal);
        return () => {
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            socket.off("REFRESH_DATA", handleRefreshSignal);
        };
    }, [refreshData]);

    // Reset to page 1 when filters change
    useEffect(() => { setPage(1); }, [keyword, typeFilter, statusFilter, startDate, endDate]);

    // Client-side filtering
    const filteredRecords = allRecords.filter(batch => {
        if (keyword) {
            const kw = keyword.toLowerCase();
            const matches =
                (batch.batch_no || "").toLowerCase().includes(kw) ||
                (batch.delivery_doc_no || "").toLowerCase().includes(kw) ||
                (batch.supplier_name || "").toLowerCase().includes(kw) ||
                (batch.donor_name || "").toLowerCase().includes(kw);
            if (!matches) return false;
        }
        if (typeFilter) {
            const hasType = batch.headers.some(h => h.type === typeFilter) ||
                batch.acquisition_type === typeFilter;
            if (!hasType) return false;
        }
        if (statusFilter) {
            if (batchStatus(batch.headers) !== statusFilter) return false;
        }
        if (startDate && batch.created_at) {
            if (batch.created_at < startDate) return false;
        }
        if (endDate && batch.created_at) {
            if (batch.created_at > endDate + "T23:59:59") return false;
        }
        return true;
    });

    const totalPages  = Math.ceil(filteredRecords.length / limit) || 1;
    const records     = filteredRecords.slice((page - 1) * limit, page * limit);

    const viewBatch = (id: number) => {
        if (id > 0) router.push(`/warehouse/receives/${id}`);
        else SweetAlertUtils.error("ข้อผิดพลาด", "รหัส Batch ไม่ถูกต้อง");
    };

    return (
        <div className="flex flex-col bg-[#fafafa] p-3 sm:p-4 md:p-6">

            {apiError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="font-semibold text-red-900 text-sm">ข้อผิดพลาดในการดึงข้อมูล</p>
                        <p className="text-sm text-red-700 mt-0.5">{apiError}</p>
                        <button onClick={() => fetchAll()} className="mt-1 text-xs font-semibold text-red-600 underline">ลองอีกครั้ง</button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <PageHeadingIconBox icon={PackagePlus} tone="inbound" />
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">รับพัสดุเข้าคลัง</h2>
                        <p className="text-sm text-slate-500 mt-0.5">บันทึกการรับพัสดุเข้าคลังและสร้างใบรับพัสดุ</p>
                    </div>
                </div>
                <button onClick={() => router.push("/warehouse/receives/createform")}
                    className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-800 text-sm font-semibold flex items-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4" /> สร้างใบรับสินค้า
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหา Batch / ใบส่งสินค้า / ผู้จำหน่าย..."
                        value={keyword}
                        onChange={e => setKeyword(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                    />
                </div>

                {/* Type dropdown */}
                <div className="relative w-full sm:w-auto" data-filter-type>
                    <button
                        type="button"
                        onClick={() => { setIsTypeOpen(!isTypeOpen); setIsStatusOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
                    >
                        <span className="text-slate-700 font-medium truncate">{typeOptions.find(t => t.value === typeFilter)?.label}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isTypeOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 min-w-full">
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
                <div className="relative w-full sm:w-auto" data-filter-status>
                    <button
                        type="button"
                        onClick={() => { setIsStatusOpen(!isStatusOpen); setIsTypeOpen(false); }}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-full sm:w-[200px] justify-between"
                    >
                        <span className="text-slate-700 font-medium truncate">{statusOptions.find(s => s.value === statusFilter)?.label}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isStatusOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 min-w-full">
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
                <div className={`relative border rounded-lg px-4 shadow-sm w-full sm:w-[160px] h-[38px] flex items-center bg-white transition-colors ${
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
                <div className={`relative border rounded-lg px-4 shadow-sm w-full sm:w-[160px] h-[38px] flex items-center bg-white transition-colors ${
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
                    <button
                        type="button"
                        onClick={() => { setKeyword(""); setTypeFilter(""); setStatusFilter(""); setStartDate(""); setEndDate(""); setPage(1); }}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
                    >
                        <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col">
                {isFetching ? (
                    <div className="flex flex-col flex-1 min-h-[22rem]">
                        <span className="sr-only">กำลังโหลดรายการรับเข้า</span>
                        <DataTableSkeleton
                            headers={["#", "เลขที่นำเข้า", "วันที่รับเข้า", "ประเภท", "ผู้จำหน่าย / ผู้บริจาค", "รายการ", "สถานะ", "ตรวจสอบ"]}
                            rowCount={10}
                            showPaginationFooter
                            ariaLabel="กำลังโหลดรายการรับเข้า"
                            thClassName="px-4 py-4 whitespace-nowrap text-base font-semibold"
                            tdClassName="px-4 py-3"
                        />
                    </div>
                ) : (
                    <>
                        <div
                            className="flex-1"
                            style={{ overflowX: "auto", overflowY: "auto", scrollbarWidth: "auto", msOverflowStyle: "auto" } as React.CSSProperties}
                        >
                            <style>{`
                                div::-webkit-scrollbar { width: 0; height: 8px; }
                                div::-webkit-scrollbar-track { background: #f1f5f9; }
                                div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                                div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                            `}</style>
                            <table className="w-full text-sm text-left table-fixed">
                                <colgroup>
                                    <col className="w-[50px]" />
                                    <col className="w-[13%]" />
                                    <col className="w-[16%]" />
                                    <col className="w-[15%]" />
                                    <col className="w-[20%]" />
                                    <col className="w-[8%]" />
                                    <col className="w-[12%]" />
                                    <col className="w-[9%]" />
                                </colgroup>
                                <thead className={LIST_TABLE_HEAD_ROW}>
                                    <tr>
                                        <th className={`${LIST_TABLE_TH_WIDE} pl-6`}>#</th>
                                        <th className={LIST_TABLE_TH_WIDE}>เลขที่นำเข้า</th>
                                        <th className={LIST_TABLE_TH_WIDE}>วันที่รับเข้า</th>
                                        <th className={LIST_TABLE_TH_WIDE}>ประเภท</th>
                                        <th className={LIST_TABLE_TH_WIDE}>ผู้จำหน่าย / ผู้บริจาค</th>
                                        <th className={`${LIST_TABLE_TH_WIDE} text-center`}>รายการ</th>
                                        <th className={LIST_TABLE_TH_WIDE}>สถานะ</th>
                                        <th className={`${LIST_TABLE_TH_WIDE} text-center`}>ตรวจสอบ</th>
                                    </tr>
                                </thead>
                                <tbody className={`${LIST_TABLE_TBODY} text-slate-700`}>
                                    {records.map((batch, idx) => {
                                        const uniqueTypes = [batch.acquisition_type];
                                        const itemCount   = batchItemCount(batch.headers);
                                        const status      = batchStatus(batch.headers);
                                        return (
                                            <tr key={batch.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                                                <td className="px-6 py-3">{(page - 1) * limit + idx + 1}</td>
                                                <td className="px-6 py-3 truncate">{batch.batch_no}</td>
                                                <td className="px-6 py-3 whitespace-nowrap">{fmtDate(batch.created_at)}</td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {uniqueTypes.map(t => <TypeBadge key={t} type={t} />)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 truncate">
                                                    {batch.supplier_name || batch.donor_name || "-"}
                                                </td>
                                                <td className="px-6 py-3 text-center">{itemCount}</td>
                                                <td className="px-6 py-3"><StatusBadge status={status} /></td>
                                                <td className="px-6 py-3 text-center">
                                                    <button
                                                        onClick={() => viewBatch(batch.id)}
                                                        className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 shadow-sm transition-colors"
                                                    >
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {records.length === 0 && !isFetching && (
                                        <tr>
                                            <td colSpan={8}>
                                                <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-16">
                                                    <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                                                    </svg>
                                                    <p className="text-sm font-medium">ไม่พบข้อมูล</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-slate-200 gap-3 bg-white">
                            <p className="text-sm text-slate-500">
                                แสดง {records.length} จาก {filteredRecords.length} รายการ
                                {filteredRecords.length !== allRecords.length && (
                                    <span className="text-slate-400"> (ทั้งหมด {allRecords.length} รายการ)</span>
                                )}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm font-medium text-slate-700">หน้า {page} / {totalPages || 1}</span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition-colors"
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
}
