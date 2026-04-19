"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowDownUp,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	RefreshCcw,
	Search,
	X,
} from "lucide-react";

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
import { apiClient } from "@/lib/apiClient";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";

interface StockBalanceReportClientProps {
	onBack?: () => void;
}

interface MovementRow {
	id: string;
	type: string;
	itemCode: string;
	itemName: string;
	warehouse: string;
	quantity: number;
	unit: string;
	date: string | null;
	operatorName: string;
	departmentName: string;
	note: string;
}

interface ApiResponse {
	items: MovementRow[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

const ITEMS_PER_PAGE = 10;

const TYPE_LABEL: Record<string, string> = {
	RECEIVE_IN:     "รับเข้า",
	RECEIVE_CANCEL: "ยกเลิกรับ",
	OUT:            "เบิกจ่าย",
	ADJUST_IN:      "ปรับเพิ่ม",
	ADJUST_OUT:     "ปรับลด",
	UPDATE:         "อัปเดต",
};

const TYPE_BADGE: Record<string, string> = {
	RECEIVE_IN:     "bg-emerald-50 text-emerald-700 border-emerald-100",
	RECEIVE_CANCEL: "bg-slate-100 text-slate-500 border-slate-200",
	OUT:            "bg-rose-50 text-rose-700 border-rose-100",
	ADJUST_IN:      "bg-blue-50 text-blue-700 border-blue-100",
	ADJUST_OUT:     "bg-orange-50 text-orange-700 border-orange-100",
	UPDATE:         "bg-slate-50 text-slate-500 border-slate-200",
};

const IN_TYPES = new Set(["RECEIVE_IN", "ADJUST_IN"]);

const fmtDateTime = (v?: string | null) => {
	if (!v) return "-";
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	return `${d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })} ${d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}`;
};

const typeOptions = [
	{ value: "", label: "ทุกประเภท" },
	...Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l })),
];

const StockBalanceReportClient: React.FC<StockBalanceReportClientProps> = ({ onBack }) => {
	const [allRows, setAllRows] = useState<MovementRow[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);

	// Server-side filters (trigger re-fetch)
	const [selectedType, setSelectedType] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	// Client-side filters (instant)
	const [searchTerm, setSearchTerm] = useState("");
	const [warehouseFilter, setWarehouseFilter] = useState("");

	// Dropdown open states
	const [isTypeOpen, setIsTypeOpen] = useState(false);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);

	const loadData = useCallback(async () => {
		setIsFetching(true);
		setWarehouseFilter("");
		try {
			const params: Record<string, unknown> = { limit: 10, page: 1 };
			if (selectedType) params.type = selectedType;
			if (startDate)    params.dateFrom = startDate;
			if (endDate)      params.dateTo   = endDate;

			const res = await apiClient.get<ApiResponse>("/v1/reports/stock-movement", { params });
			setAllRows((res.data as ApiResponse).items ?? []);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลการเคลื่อนไหวสต็อก");
			setAllRows([]);
		} finally {
			setIsFetching(false);
		}
	}, [selectedType, startDate, endDate]);

	useEffect(() => { loadData(); }, [loadData]);

	// Unique warehouse list from loaded data
	const warehouseOptions = useMemo(() => {
		const names = Array.from(new Set(allRows.map((r) => r.warehouse).filter(Boolean)));
		return [{ value: "", label: "ทุกคลัง/แผนก" }, ...names.map((n) => ({ value: n, label: n }))];
	}, [allRows]);

	// Client-side search + warehouse filter
	const filtered = useMemo(() => {
		const kw = searchTerm.trim().toLowerCase();
		return allRows.filter((r) => {
			const matchKw =
				!kw ||
				r.itemCode.toLowerCase().includes(kw) ||
				r.itemName.toLowerCase().includes(kw) ||
				(r.operatorName ?? "").toLowerCase().includes(kw) ||
				(r.departmentName ?? "").toLowerCase().includes(kw) ||
				(r.note ?? "").toLowerCase().includes(kw);
			const matchWh = !warehouseFilter || r.warehouse === warehouseFilter;
			return matchKw && matchWh;
		});
	}, [allRows, searchTerm, warehouseFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
	const paginated  = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, warehouseFilter]);

	const handleExportCsv = () => {
		const header = ["วันที่/เวลา", "ประเภท", "รหัสสินค้า", "ชื่อสินค้า", "คลัง", "จำนวน", "หน่วย", "ผู้ดำเนินการ", "แผนก", "หมายเหตุ"];
		const rows = filtered.map((r) => [
			fmtDateTime(r.date),
			TYPE_LABEL[r.type] ?? r.type,
			r.itemCode,
			r.itemName,
			r.warehouse,
			(IN_TYPES.has(r.type) ? "+" : "-") + r.quantity,
			r.unit,
			r.operatorName,
			r.departmentName,
			r.note,
		].map((v) => `"${v}"`).join(","));
		const blob = new Blob(["\uFEFF" + [header.join(","), ...rows].join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `รายงานความเคลื่อนไหวสต็อก_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",             key: "_no",         align: "center" },
			{ header: "วันที่/เวลา",    key: "dateFmt" },
			{ header: "ประเภท",        key: "typeLabel",   align: "center" },
			{ header: "รหัสสินค้า",    key: "itemCode" },
			{ header: "ชื่อสินค้า",    key: "itemName" },
			{ header: "คลัง",          key: "warehouse" },
			{ header: "จำนวน",         key: "qtyFmt",      align: "right" },
			{ header: "ผู้ดำเนินการ",   key: "operatorName" },
			{ header: "แผนก",          key: "departmentName" },
		];
		const pdfRows = filtered.map((r, i) => ({
			_no:            String(i + 1),
			dateFmt:        fmtDateTime(r.date),
			typeLabel:      TYPE_LABEL[r.type] ?? r.type,
			itemCode:       r.itemCode,
			itemName:       r.itemName,
			warehouse:      r.warehouse,
			qtyFmt:         (IN_TYPES.has(r.type) ? "+" : "-") + r.quantity.toLocaleString() + " " + r.unit,
			operatorName:   r.operatorName,
			departmentName: r.departmentName,
		}));
		const subtitle = [
			selectedType ? `ประเภท: ${TYPE_LABEL[selectedType]}` : "ทุกประเภท",
			startDate ? `ตั้งแต่: ${startDate}` : null,
			endDate   ? `ถึง: ${endDate}`        : null,
			warehouseFilter ? `คลัง: ${warehouseFilter}` : null,
		].filter(Boolean).join(" | ");
		printAsPdf("รายงานความเคลื่อนไหวสต็อก", subtitle, columns, pdfRows);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<h2 className="text-3xl font-bold text-gray-800">รายงานความเคลื่อนไหวสต็อก</h2>
				</div>
				<div className="flex items-center gap-3">

					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 text-sm font-semibold transition-colors"
						>
							ย้อนกลับ
						</button>
					)}
				</div>
			</div>

			{/* Filters row */}
			<div className="flex flex-wrap gap-3 mb-6 items-center">
				{/* Search (client-side) */}
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหารหัส / ชื่อสินค้า / ผู้ดำเนินการ..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
					/>
				</div>

				{/* Transaction type (server-side) */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsTypeOpen((o) => !o); setIsWarehouseOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[150px]"
					>
						<span className="flex-1 text-left">
							{typeOptions.find((o) => o.value === selectedType)?.label ?? "ทุกประเภท"}
						</span>
						<ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
					</button>
					{isTypeOpen && (
						<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px]">
							{typeOptions.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => { setSelectedType(o.value); setIsTypeOpen(false); }}
									className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedType === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
								>
									{o.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Warehouse / Department (client-side) */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsWarehouseOpen((o) => !o); setIsTypeOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[170px]"
					>
						<span className="flex-1 text-left">{warehouseOptions.find((o) => o.value === warehouseFilter)?.label ?? "ทุกคลัง/แผนก"}</span>
						<ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
					</button>
					{isWarehouseOpen && (
						<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[190px] max-h-56 overflow-y-auto">
							{warehouseOptions.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => { setWarehouseFilter(o.value); setIsWarehouseOpen(false); }}
									className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${warehouseFilter === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
								>
									{o.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Date range (server-side) */}
				<div className="flex items-center gap-2">
					<label className="text-xs font-medium text-slate-500">ตั้งแต่</label>
					<input
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
					className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
					<label className="text-xs font-medium text-slate-500">ถึง</label>
					<input
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
					className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				<div className="ml-auto flex items-center gap-2">
					{(searchTerm || selectedType || warehouseFilter || startDate || endDate) && (
						<button
							type="button"
							onClick={() => {
								setSearchTerm("");
								setSelectedType("");
								setWarehouseFilter("");
								setStartDate("");
								setEndDate("");
								setCurrentPage(1);
							}}
							className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
						>
							<X className="w-3.5 h-3.5" />
							ล้างตัวกรอง
						</button>
					)}
					<button
						type="button"
						title="Export PDF"
						onClick={handleExportPdf}
						className="relative flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-all shadow-sm"
					>
						<PdfIcon />
					</button>
					<button
						type="button"
						title="Export CSV"
						onClick={handleExportCsv}
						className="relative flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-all shadow-sm"
					>
						<CsvIcon />
					</button>
				</div>
			</div>

			{/* Table */}
			<div
				className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col"
				style={{ height: "63vh" }}
				onClick={() => { setIsTypeOpen(false); setIsWarehouseOpen(false); }}
			>
				{isFetching && (
					<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
						<div className="animate-spin">
							<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
						</div>
					</div>
				)}
				<div className="flex-1 overflow-auto">
					<table className="w-full text-sm text-left table-fixed">
						<thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
							<tr className="text-[12px]">
								<th className="px-4 py-4 w-[46px] text-center">#</th>
								<th className="px-4 py-4 w-[150px]">วันที่/เวลา</th>
								<th className="px-4 py-4 w-[110px]">ประเภท</th>
								<th className="px-4 py-4 w-[110px]">รหัสสินค้า</th>
								<th className="px-4 py-4 w-[200px]">ชื่อสินค้า</th>
								<th className="px-4 py-4 w-[120px]">คลัง</th>
								<th className="px-4 py-4 w-[90px] text-right">จำนวน</th>
								<th className="px-4 py-4 w-[150px]">ผู้ดำเนินการ</th>
								<th className="px-4 py-4 w-[130px]">แผนก</th>

							</tr>
						</thead>
						<tbody className="text-slate-600 text-sm">
							{paginated.length > 0 ? (
								paginated.map((r, idx) => {
									const isIn = IN_TYPES.has(r.type);
									return (
										<tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
											<td className="px-4 py-4 text-center text-slate-600">
												{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
											</td>
											<td className="px-4 py-4 text-slate-600 whitespace-nowrap text-xs">
												{fmtDateTime(r.date)}
											</td>
											<td className="px-4 py-4">
											{TYPE_LABEL[r.type] ?? r.type}
											</td>
											<td className="px-4 py-4 text-slate-600">{r.itemCode}</td>
											<td className="px-4 py-4 text-slate-600">{r.itemName}</td>
											<td className="px-4 py-4 text-slate-600">{r.warehouse}</td>
											<td className={`px-4 py-4 text-right font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
												{isIn ? "+" : "-"}{r.quantity.toLocaleString()}
												<span className="text-slate-500 font-normal ml-1 text-[11px]">{r.unit}</span>
											</td>
											<td className="px-4 py-4 text-slate-600">{r.operatorName || "-"}</td>
											<td className="px-4 py-4 text-slate-600">{r.departmentName || "-"}</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={9} className="text-center py-16">
										<ArrowDownUp className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบรายการความเคลื่อนไหวสต็อก</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between mt-5">
				<p className="text-sm text-slate-500">
					แสดง {paginated.length} จาก {filtered.length.toLocaleString()} รายการ
					{allRows.length >= 500 && (
						<span className="ml-2 text-amber-600 text-xs">(แสดงสูงสุด 500 รายการล่าสุด)</span>
					)}
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => p - 1)}
						className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium px-2">หน้า {currentPage} / {totalPages}</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setCurrentPage((p) => p + 1)}
						className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default StockBalanceReportClient;
