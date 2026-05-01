"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ChevronDown, ChevronLeft, ChevronRight, Inbox, PackagePlus, Search, X,
} from "lucide-react";
import { fmtDate, fmtDateLong } from "@/utils/dateUtils";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { apiClient } from "@/lib/apiClient";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";
import { OutlinedDateField } from "../../_components/OutlinedDateField";

// ── Icons ─────────────────────────────────────────────────────────────────────

const XlsxIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#16a34a"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">XLSX</text>
	</svg>
);

const PdfIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#dc2626"/>
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
	type: string;
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
	PURCHASE:       "bg-blue-50 text-blue-700 border-blue-200",
	DONATION:       "bg-green-50 text-green-700 border-green-200",
	PURCHASE_ASSET: "bg-amber-50 text-amber-700 border-amber-200",
	REUSABLE_UNIT:  "bg-violet-50 text-violet-700 border-violet-200",
};

const TYPE_OPTIONS = [
	{ value: "",               label: "ประเภททั้งหมด" },
	{ value: "PURCHASE",       label: "จัดซื้อ" },
	{ value: "DONATION",       label: "บริจาค" },
	{ value: "PURCHASE_ASSET", label: "ครุภัณฑ์" },
	{ value: "REUSABLE_UNIT",  label: "ของใช้ซ้ำ" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtCurrency = (n: number) =>
	n > 0
		? `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
		: "-";

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
	const [isTypeOpen, setIsTypeOpen] = useState(false);

	const printDate = fmtDateLong(new Date());

	const fetchData = useCallback(async () => {
		setIsFetching(true);
		try {
			const params: Record<string, string | number> = { page, limit: ITEMS_PER_PAGE };
			if (search.trim())   params.search  = search.trim();
			if (supplier.trim()) params.supplier = supplier.trim();
			if (dateFrom)        params.dateFrom = dateFrom;
			if (dateTo)          params.dateTo   = dateTo;

			const res  = await apiClient.get<ApiResponse>("/v1/reports/receives", { params });
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
		if (!isTypeOpen) return;
		const h = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest("[data-filter-type]")) setIsTypeOpen(false);
		};
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [isTypeOpen]);

	const filtered = useMemo(() => {
		if (!typeFilter) return rows;
		return rows.filter(r => r.type === typeFilter);
	}, [rows, typeFilter]);

	const groups = useMemo((): BatchGroup[] => {
		const map = new Map<string, ReceiveRow[]>();
		for (const r of filtered) {
			if (!map.has(r.batchNo)) map.set(r.batchNo, []);
			map.get(r.batchNo)!.push(r);
		}
		return Array.from(map.entries()).map(([batchNo, items]) => ({
			batchNo,
			receiveDate: items[0]?.receiveDate ?? null,
			supplier:    items[0]?.supplier ?? "-",
			type:        items[0]?.type ?? "",
			items,
			grandTotal: items.reduce((s, r) => s + r.qty * r.costPrice, 0),
		}));
	}, [filtered]);

	const hasFilter = !!(search || supplier || dateFrom || dateTo || typeFilter);
	const clearFilters = () => {
		setSearch(""); setSupplier(""); setDateFrom(""); setDateTo(""); setTypeFilter(""); setPage(1);
	};

	const handleExportCsv = () => {
		const headers = ["วันที่รับเข้า", "Batch No", "เลขที่เอกสาร", "ประเภท", "ผู้จำหน่าย/ผู้บริจาค", "รหัสรายการ", "ชื่อพัสดุ", "หน่วย", "จำนวนในใบกำกับ", "จำนวนรับจริง", "ราคาต่อหน่วย", "ยอดรวม"];
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
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href = url;
		a.download = `รายงานการรับเข้า_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "วันที่รับเข้า",   key: "receiveDateFmt" },
			{ header: "Batch No",         key: "batchNo" },
			{ header: "เลขที่เอกสาร",    key: "docNo" },
			{ header: "ประเภท",           key: "typeLabel" },
			{ header: "ผู้จำหน่าย/ผู้บริจาค", key: "supplier" },
			{ header: "ชื่อพัสดุ",       key: "itemName" },
			{ header: "ใบกำกับ",          key: "expectedQty", align: "center" },
			{ header: "รับจริง",          key: "qty",         align: "center" },
			{ header: "ราคา/หน่วย",      key: "costPriceFmt", align: "right" },
			{ header: "ยอดรวม",           key: "subtotalFmt",  align: "right" },
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

	const currentTypeLabel = TYPE_OPTIONS.find(t => t.value === typeFilter)?.label ?? "ประเภททั้งหมด";

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			{/* ── Header bar ──────────────────────────────────────────────────── */}
			<div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow">
							<PackagePlus className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานการรับสินค้าเข้าคลัง</h1>
							<p className="text-sm text-slate-500 mt-0.5">ระบบบริหารคลังสินค้า HPK &nbsp;·&nbsp; พิมพ์วันที่ {printDate}</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{onBack && (
							<button type="button" onClick={onBack}
								className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
								ย้อนกลับ
							</button>
						)}
					</div>
				</div>
			</div>

			{/* ── Content ──────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* ── Toolbar ───────────────────────────────────────────────── */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">

						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหาชื่อพัสดุ / Batch / เอกสาร..."
								value={search}
								onChange={e => setSearch(e.target.value)}
								className="h-10 pl-9 pr-3 w-64 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Supplier */}
						<input
							type="text"
							placeholder="ผู้จำหน่าย / ผู้บริจาค..."
							value={supplier}
							onChange={e => setSupplier(e.target.value)}
							className="h-10 px-3 w-44 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>

						{/* Type dropdown */}
						<div className="relative" data-filter-type>
							<button
								type="button"
								onClick={() => setIsTypeOpen(v => !v)}
								className="flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[160px]"
							>
								<span className="flex-1 text-left text-slate-700 truncate">{currentTypeLabel}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isTypeOpen ? "rotate-180" : ""}`} />
							</button>
							{isTypeOpen && (
								<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-full">
									{TYPE_OPTIONS.map(t => (
										<button
											key={t.value}
											type="button"
											onClick={() => { setTypeFilter(t.value); setIsTypeOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${typeFilter === t.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
										>
											{t.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Date range */}
						<OutlinedDateField label="วันที่เริ่มต้น" value={dateFrom} onChange={setDateFrom} />
						<OutlinedDateField label="วันที่สิ้นสุด"  value={dateTo}   onChange={setDateTo} />

						{/* Clear */}
						{hasFilter && (
							<button
								type="button"
								onClick={clearFilters}
								className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
							>
								<X className="w-3.5 h-3.5" />
								ล้างตัวกรอง
							</button>
						)}

						{/* Export buttons */}
						<div className="ml-auto flex items-center gap-2">
							<button type="button" title="Export CSV (.csv)" onClick={handleExportCsv}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
								<XlsxIcon />
							</button>
							<button type="button" title="Export PDF" onClick={handleExportPdf}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
								<PdfIcon />
							</button>
						</div>
					</div>

					{/* ── Row count strip ────────────────────────────────────────── */}
					<div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-slate-100">
						<span className="text-xs text-slate-500">
							พบ <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> รายการ
							&nbsp;·&nbsp;
							<span className="font-semibold text-slate-700">{groups.length}</span> กลุ่ม Batch
						</span>
					</div>

					{/* ── Table ─────────────────────────────────────────────────── */}
					<div className="relative w-full overflow-x-auto">
						{isFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full text-sm text-left min-w-[760px]">
							<colgroup>
								<col className="w-[108px]" />
								<col />
								<col className="w-[72px]" />
								<col className="w-[80px]" />
								<col className="w-[80px]" />
								<col className="w-[120px]" />
								<col className="w-[126px]" />
							</colgroup>
							<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ประเภท</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ชื่อพัสดุ</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หน่วย</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ใบกำกับ</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">รับจริง</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ราคา/หน่วย</th>
									<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ยอดรวม</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{groups.length === 0 && !isFetching ? (
									<tr>
										<td colSpan={7}>
											<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
												<Inbox className="w-12 h-12 text-slate-200" />
												<p className="text-sm text-slate-400">ไม่พบข้อมูลการรับพัสดุ</p>
											</div>
										</td>
									</tr>
								) : (
									groups.map((group) => (
										<React.Fragment key={group.batchNo}>
											{/* ── Batch header row ─────────────────────── */}
											<tr className="bg-slate-50 border-t border-slate-200">
												<td colSpan={5} className="px-4 py-3">
													<div className="flex items-center gap-3 flex-wrap">
														<span className="text-xs font-medium text-slate-400 whitespace-nowrap tabular-nums">
															{fmtDate(group.receiveDate)}
														</span>
														<span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap">
															{group.batchNo}
														</span>
														<span className="text-sm font-medium text-slate-700 truncate max-w-[260px]">
															{group.supplier}
														</span>
														<span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full whitespace-nowrap">
															{group.items.length} รายการ
														</span>
													</div>
												</td>
												<td className="px-4 py-3 text-right">
													<span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ยอดรวม</span>
												</td>
												<td className="px-4 py-3 text-right font-bold text-slate-800 tabular-nums">
													{fmtCurrency(group.grandTotal)}
												</td>
											</tr>

											{/* ── Item rows ────────────────────────────── */}
											{group.items.map((r) => (
												<tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
													<td className="px-4 py-3 pl-6">
														<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_BADGE[r.type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
															{TYPE_LABEL[r.type] ?? r.type}
														</span>
													</td>
													<td className="px-4 py-3">
														<p className="font-medium text-slate-800 leading-snug truncate" title={r.itemName}>{r.itemName}</p>
														<p className="text-xs text-slate-400 font-mono mt-0.5">{r.itemCode}</p>
													</td>
													<td className="px-4 py-3 text-center text-xs text-slate-500">{r.unit}</td>
													<td className="px-4 py-3 text-center text-slate-600 tabular-nums">{r.expectedQty}</td>
													<td className="px-4 py-3 text-center tabular-nums">
														<span className={`font-semibold ${r.qty < r.expectedQty ? "text-amber-600" : "text-slate-700"}`}>
															{r.qty}
														</span>
														{r.qty < r.expectedQty && (
															<span className="ml-1 text-[10px] text-amber-500">({r.expectedQty - r.qty} ขาด)</span>
														)}
													</td>
													<td className="px-4 py-3 text-right tabular-nums text-slate-600 font-mono text-xs">{fmtCurrency(r.costPrice)}</td>
													<td className="px-4 py-3 text-right tabular-nums font-bold text-slate-700 font-mono text-xs">{fmtCurrency(r.qty * r.costPrice)}</td>
												</tr>
											))}
										</React.Fragment>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* ── Pagination ────────────────────────────────────────────── */}
					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-xs text-slate-500">
							ทั้งหมด <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> รายการ
						</p>
						{totalPages > 1 && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									disabled={page <= 1}
									onClick={() => setPage(p => p - 1)}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs font-medium px-2 text-slate-600">หน้า {page} / {totalPages}</span>
								<button
									type="button"
									disabled={page >= totalPages}
									onClick={() => setPage(p => p + 1)}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors"
								>
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Footer ──────────────────────────────────────────────────────── */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานการรับสินค้าเข้าคลัง</p>
			</div>
		</div>
	);
};

export default ReceiveReportClient;
