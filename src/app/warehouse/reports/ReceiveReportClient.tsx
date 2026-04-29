"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ChevronDown, ChevronLeft, ChevronRight, Inbox, Search, X,
} from "lucide-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { apiClient } from "@/lib/apiClient";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";

// ── Icons ─────────────────────────────────────────────────────────────────────

const CsvIcon = () => (
    <svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
        <path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
        <rect x="4" y="36" width="48" height="20" rx="4" fill="#4caf6e"/>
        <text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">CSV</text>
    </svg>
);

const PdfIcon = () => (
    <svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
        <path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
        <rect x="4" y="36" width="48" height="20" rx="4" fill="#e53935"/>
        <text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
    </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReceiveRow {
    id: number;
    receiveDate: string | null;
    batchNo: string;
    docNo: string;
    type: string;
    supplier: string;
    itemCode: string;
    itemName: string;
    unit: string;
    expectedQty: number;
    qty: number;
    costPrice: number;
    lotCode: string;
}

interface BatchGroup {
    batchNo: string;
    receiveDate: string | null;
    supplier: string;
    items: ReceiveRow[];
    grandTotal: number;
}

interface ApiResponse {
    items: ReceiveRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface ReceiveReportClientProps {
    onBack?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

const TYPE_LABEL: Record<string, string> = {
    PURCHASE:       "จัดซื้อ",
    DONATION:       "บริจาค",
    PURCHASE_ASSET: "ครุภัณฑ์",
    REUSABLE_UNIT:  "ของใช้ซ้ำ",
};

const TYPE_BADGE: Record<string, string> = {
    PURCHASE:       "bg-blue-50 text-blue-700 border-blue-100",
    DONATION:       "bg-green-50 text-green-700 border-green-100",
    PURCHASE_ASSET: "bg-amber-50 text-amber-700 border-amber-100",
    REUSABLE_UNIT:  "bg-violet-50 text-violet-700 border-violet-100",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (v?: string | null) => {
    if (!v) return "-";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const fmtCurrency = (n: number) =>
    n > 0 ? `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "-";

// ── Component ─────────────────────────────────────────────────────────────────

const ReceiveReportClient: React.FC<ReceiveReportClientProps> = ({ onBack }) => {
    const [rows,       setRows]       = useState<ReceiveRow[]>([]);
    const [total,      setTotal]      = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [isFetching, setIsFetching] = useState(false);

    const [search,     setSearch]     = useState("");
    const [supplier,   setSupplier]   = useState("");
    const [dateFrom,   setDateFrom]   = useState("");
    const [dateTo,     setDateTo]     = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [page,       setPage]       = useState(1);

    const [isTypeOpen,   setIsTypeOpen]   = useState(false);
    const [startFocused, setStartFocused] = useState(false);
    const [endFocused,   setEndFocused]   = useState(false);

    const fetchData = useCallback(async () => {
        setIsFetching(true);
        try {
            const params: Record<string, string | number> = {
                page, limit: ITEMS_PER_PAGE,
            };
            if (search.trim())   params.search   = search.trim();
            if (supplier.trim()) params.supplier  = supplier.trim();
            if (dateFrom)        params.dateFrom  = dateFrom;
            if (dateTo)          params.dateTo    = dateTo;

            const res = await apiClient.get<ApiResponse>("/v1/reports/receives", { params });
            const data = res.data as ApiResponse;
            setRows(data.items ?? []);
            setTotal(data.total ?? 0);
            setTotalPages(data.totalPages ?? 1);
        } catch {
            SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลรายงานการรับเข้า");
            setRows([]);
        } finally {
            setIsFetching(false);
        }
    }, [page, search, supplier, dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [search, supplier, dateFrom, dateTo, typeFilter]);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (!(e.target as HTMLElement).closest("[data-filter-type]")) setIsTypeOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const filtered = useMemo(() => {
        if (!typeFilter) return rows;
        return rows.filter(r => r.type === typeFilter);
    }, [rows, typeFilter]);

    // Group filtered rows by batchNo, preserving order of first appearance
    const groups = useMemo((): BatchGroup[] => {
        const map = new Map<string, ReceiveRow[]>();
        for (const r of filtered) {
            if (!map.has(r.batchNo)) map.set(r.batchNo, []);
            map.get(r.batchNo)!.push(r);
        }
        return Array.from(map.entries()).map(([batchNo, items]) => ({
            batchNo,
            receiveDate: items[0]?.receiveDate ?? null,
            supplier: items[0]?.supplier ?? "-",
            items,
            grandTotal: items.reduce((s, r) => s + r.qty * r.costPrice, 0),
        }));
    }, [filtered]);

    const hasFilter = search || supplier || dateFrom || dateTo || typeFilter;

    const clearFilters = () => {
        setSearch(""); setSupplier(""); setDateFrom(""); setDateTo(""); setTypeFilter(""); setPage(1);
    };

    const typeOptions = [
        { value: "", label: "ประเภททั้งหมด" },
        { value: "PURCHASE",       label: "จัดซื้อ" },
        { value: "DONATION",       label: "บริจาค" },
        { value: "PURCHASE_ASSET", label: "ครุภัณฑ์" },
        { value: "REUSABLE_UNIT",  label: "ของใช้ซ้ำ" },
    ];

    const handleExportCsv = () => {
        const headers = ["วันที่รับ", "Batch No", "เลขที่เอกสาร", "ประเภท", "ผู้จำหน่าย/ผู้บริจาค", "รหัสสินค้า", "ชื่อสินค้า", "หน่วย", "จำนวนในใบกำกับ", "จำนวนรับจริง", "ราคาต่อหน่วย", "ยอดรวม"];
        const csvRows = [
            headers.join(","),
            ...filtered.map(r => [
                fmtDate(r.receiveDate),
                r.batchNo,
                r.docNo,
                TYPE_LABEL[r.type] ?? r.type,
                `"${r.supplier}"`,
                r.itemCode,
                `"${r.itemName}"`,
                r.unit,
                r.expectedQty,
                r.qty,
                r.costPrice,
                r.qty * r.costPrice,
            ].join(",")),
        ].join("\n");
        const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `รายงานการรับเข้า_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportPdf = () => {
        const columns: PdfColumn[] = [
            { header: "วันที่รับ",      key: "receiveDateFmt" },
            { header: "Batch No",       key: "batchNo" },
            { header: "เลขที่เอกสาร",  key: "docNo" },
            { header: "ประเภท",         key: "typeLabel" },
            { header: "ผู้จำหน่าย",    key: "supplier" },
            { header: "ชื่อสินค้า",    key: "itemName" },
            { header: "ใบกำกับ",        key: "expectedQty", align: "center" },
            { header: "รับจริง",        key: "qty",          align: "center" },
            { header: "ราคา/หน่วย",    key: "costPriceFmt", align: "right" },
            { header: "ยอดรวม",         key: "subtotalFmt",  align: "right" },
        ];
        const pdfRows = filtered.map(r => ({
            receiveDateFmt: fmtDate(r.receiveDate),
            batchNo:        r.batchNo,
            docNo:          r.docNo,
            typeLabel:      TYPE_LABEL[r.type] ?? r.type,
            supplier:       r.supplier,
            itemName:       r.itemName,
            expectedQty:    String(r.expectedQty),
            qty:            String(r.qty),
            costPriceFmt:   fmtCurrency(r.costPrice),
            subtotalFmt:    fmtCurrency(r.qty * r.costPrice),
        }));
        printAsPdf(
            "รายงานการรับสินค้าเข้าคลัง",
            `${dateFrom ? `จาก ${fmtDate(dateFrom)} ` : ""}${dateTo ? `ถึง ${fmtDate(dateTo)}` : ""}`.trim() || "ทั้งหมด",
            columns,
            pdfRows,
        );
    };

    return (
        <div className="flex flex-col min-h-screen bg-white p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-800">รายงานการรับสินค้าเข้าคลัง</h2>
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button type="button" onClick={onBack}
                            className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 text-sm font-semibold transition-colors flex items-center gap-1.5">
                            ย้อนกลับ
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">

                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input type="text" placeholder="ค้นหาชื่อสินค้า / Batch / เอกสาร..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
                </div>

                {/* Supplier */}
                <div className="relative w-48">
                    <input type="text" placeholder="ผู้จำหน่าย / ผู้บริจาค..."
                        value={supplier}
                        onChange={e => setSupplier(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none" />
                </div>

                {/* Type dropdown */}
                <div className="relative" data-filter-type>
                    <button type="button"
                        onClick={() => setIsTypeOpen(v => !v)}
                        className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 shadow-sm w-[180px] justify-between">
                        <span className="text-slate-700 font-medium truncate">
                            {typeOptions.find(t => t.value === typeFilter)?.label ?? "ประเภททั้งหมด"}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isTypeOpen && (
                        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 w-full">
                            {typeOptions.map(t => (
                                <button key={t.value} type="button"
                                    onClick={() => { setTypeFilter(t.value); setIsTypeOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm ${typeFilter === t.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Date range */}
                {(["start", "end"] as const).map(which => {
                    const val     = which === "start" ? dateFrom : dateTo;
                    const setVal  = which === "start" ? setDateFrom : setDateTo;
                    const focused = which === "start" ? startFocused : endFocused;
                    const setFoc  = which === "start" ? setStartFocused : setEndFocused;
                    return (
                        <div key={which}
                            className={`relative border rounded-lg px-3 shadow-sm w-[145px] h-[38px] flex items-center bg-white transition-colors ${focused ? "border-blue-500 ring-2 ring-blue-500" : "border-slate-300"}`}>
                            <label className={`absolute left-3 font-medium pointer-events-none transition-all duration-150 ${val || focused ? "-top-2 text-[10px] text-blue-500 bg-white px-1" : "top-1/2 -translate-y-1/2 text-sm text-slate-400"}`}>
                                {which === "start" ? "วันที่เริ่ม" : "วันที่สิ้นสุด"}
                            </label>
                            <input type="date" value={val}
                                onChange={e => setVal(e.target.value)}
                                onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
                                className="w-full text-sm outline-none border-none bg-transparent"
                                style={{ opacity: val || focused ? 1 : 0 }} />
                        </div>
                    );
                })}

                {/* Clear */}
                {hasFilter && (
                    <button type="button" onClick={clearFilters}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm">
                        <X className="w-3.5 h-3.5" /> ล้างตัวกรอง
                    </button>
                )}

                {/* Exports */}
                <button type="button" onClick={handleExportCsv} title="Export CSV"
                    className="ml-auto flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 shadow-sm shrink-0">
                    <CsvIcon />
                </button>
                <button type="button" onClick={handleExportPdf} title="Export PDF"
                    className="flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 shadow-sm shrink-0">
                    <PdfIcon />
                </button>
            </div>

            {/* Table */}
            <div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden relative flex flex-col" style={{ height: "63vh" }}>
                {isFetching && (
                    <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                )}
                <div style={{ overflowX: "auto", overflowY: "auto" }} className="flex-1">
                    <style>{`
                        div::-webkit-scrollbar { width: 0; height: 8px; }
                        div::-webkit-scrollbar-track { background: #f1f5f9; }
                        div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                        div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                    `}</style>
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-4 w-[100px]">ประเภท</th>
                                <th className="px-4 py-4">ชื่อสินค้า</th>
                                <th className="px-4 py-4 w-[80px] text-center">หน่วย</th>
                                <th className="px-4 py-4 w-[90px] text-center">ใบกำกับ</th>
                                <th className="px-4 py-4 w-[90px] text-center">รับจริง</th>
                                <th className="px-4 py-4 w-[120px] text-right">ราคา/หน่วย</th>
                                <th className="px-4 py-4 w-[130px] text-right">ยอดรวม</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-600">
                            {groups.length === 0 && !isFetching ? (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                                            <Inbox className="w-12 h-12 text-slate-200" />
                                            <p className="text-sm font-medium">ไม่พบข้อมูลการรับพัสดุ</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                groups.map((group) => (
                                    <React.Fragment key={group.batchNo}>
                                        {/* Batch header row */}
                                        <tr className="bg-slate-100 border-t-2 border-slate-300">
                                            <td colSpan={5} className="px-4 py-3">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                                        {fmtDate(group.receiveDate)}
                                                    </span>
                                                    <span className="font-mono text-sm font-bold text-slate-800">
                                                        {group.batchNo}
                                                    </span>
                                                    <span className="text-sm text-slate-600 truncate max-w-[280px]">
                                                        {group.supplier}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {group.items.length} รายการ
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right text-xs font-medium text-slate-500">
                                                ยอดรวมทั้งหมด
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                {fmtCurrency(group.grandTotal)}
                                            </td>
                                        </tr>
                                        {/* Sub-rows */}
                                        {group.items.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 bg-white">
                                                <td className="px-4 py-3 pl-6">
                                                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${TYPE_BADGE[r.type] ?? "bg-slate-50 text-slate-600 border-slate-100"}`}>
                                                        {TYPE_LABEL[r.type] ?? r.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-800">{r.itemName}</td>
                                                <td className="px-4 py-3 text-center text-slate-500">{r.unit}</td>
                                                <td className="px-4 py-3 text-center font-medium text-slate-700">{r.expectedQty}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-semibold ${r.qty < r.expectedQty ? "text-amber-600" : "text-slate-700"}`}>
                                                        {r.qty}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtCurrency(r.costPrice)}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">{fmtCurrency(r.qty * r.costPrice)}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-500">
                    แสดง {filtered.length} จาก {total} รายการ ({groups.length} กลุ่ม Batch)
                </p>
                <div className="flex items-center gap-2">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium">หน้า {page} / {totalPages}</span>
                    <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                        className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiveReportClient;
