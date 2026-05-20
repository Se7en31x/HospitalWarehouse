"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowDownUp,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Search,
	X,
} from "lucide-react";
import { fmtDateTime, formatReportPeriod } from "@/utils/dateUtils";
import { apiClient } from "@/lib/apiClient";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { downloadCsv } from "@/utils/downloadCsv";
import { useUser } from "@/context/UserContext";
import { OutlinedDateField } from "../../_components/OutlinedDateField";
import { ReportDetailPageHeader } from "../../_components/ReportDetailPageHeader";

const CsvIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#0ea5e9"/>
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

interface StockBalanceReportClientProps {
	onBack?: () => void;
}

interface MovementRow {
	id: string;
	type: string;
	itemCode: string;
	itemName: string;
	quantity: number;
	unit: string;
	date: string | null;
	operatorName: string;
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
	RETURN_IN:      "รับคืน",
	UPDATE:         "อัปเดต",
};

const TYPE_BADGE: Record<string, string> = {
	RECEIVE_IN:     "bg-emerald-50 text-emerald-700 border-emerald-100",
	RECEIVE_CANCEL: "bg-slate-100 text-slate-500 border-slate-200",
	OUT:            "bg-rose-50 text-rose-700 border-rose-100",
	ADJUST_IN:      "bg-blue-50 text-blue-700 border-blue-100",
	ADJUST_OUT:     "bg-orange-50 text-orange-700 border-orange-100",
	RETURN_IN:      "bg-teal-50 text-teal-700 border-teal-100",
	UPDATE:         "bg-slate-50 text-slate-500 border-slate-200",
};

const IN_TYPES = new Set(["RECEIVE_IN", "ADJUST_IN", "RETURN_IN"]);


const StockBalanceReportClient: React.FC<StockBalanceReportClientProps> = ({ onBack }) => {
	const { profile } = useUser();
	const [allRows, setAllRows] = useState<MovementRow[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [currentPage, setCurrentPage] = useState(1);

	const typeOptions = [
		{ value: "", label: "ทุกประเภท" },
		...Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l })),
	];

	// Server-side filters (trigger re-fetch)
	const [selectedType, setSelectedType] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");

	// Client-side filters (instant)
	const [searchTerm, setSearchTerm] = useState("");

	// Dropdown open state
	const [isTypeOpen, setIsTypeOpen] = useState(false);

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const params: Record<string, unknown> = { limit: 500, page: 1 };
			if (selectedType) params.type     = selectedType;
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

	// Client-side keyword search only
	const filtered = useMemo(() => {
		const kw = searchTerm.trim().toLowerCase();
		if (!kw) return allRows;
		return allRows.filter((r) =>
			r.itemCode.toLowerCase().includes(kw) ||
			r.itemName.toLowerCase().includes(kw) ||
			(r.operatorName ?? "").toLowerCase().includes(kw) ||
			(r.note ?? "").toLowerCase().includes(kw)
		);
	}, [allRows, searchTerm]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

	const movementSummary = useMemo(() => {
		let inQty = 0;
		let outQty = 0;
		let inCount = 0;
		let outCount = 0;
		for (const r of filtered) {
			if (IN_TYPES.has(r.type)) { inQty += r.quantity; inCount++; }
			else { outQty += r.quantity; outCount++; }
		}
		return { inQty, outQty, net: inQty - outQty, inCount, outCount };
	}, [filtered]);
	const paginated  = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedType]);

	const handleExportCsv = () => {
		downloadCsv({
			headers: ["#", "วันที่/เวลา", "ประเภท", "รหัสรายการ", "ชื่อพัสดุ", "จำนวน", "หน่วย", "ผู้ดำเนินการ", "หมายเหตุ"],
			rows: filtered.map((r, i) => {
				const signedQty = IN_TYPES.has(r.type) ? r.quantity : -r.quantity;
				return [
					i + 1,
					fmtDateTime(r.date),
					TYPE_LABEL[r.type] ?? r.type,
					r.itemCode,
					r.itemName,
					signedQty,
					r.unit,
					r.operatorName ?? "",
					r.note ?? "",
				];
			}),
			filename: `รายงานความเคลื่อนไหวสต็อก_${new Date().toISOString().slice(0, 10)}.csv`,
		});
	};

	const handleExportPdf = () => {
		const columns: PrintColumn[] = [
			{ header: "#",             key: "_no",         align: "center" },
			{ header: "วันที่/เวลา",    key: "dateFmt" },
			{ header: "ประเภท",        key: "typeLabel",   align: "center" },
			{ header: "รหัสรายการ",    key: "itemCode" },
			{ header: "ชื่อพัสดุ",    key: "itemName" },
			{ header: "จำนวน",         key: "qtyFmt",      align: "right" },
			{ header: "ผู้ดำเนินการ",   key: "operatorName" },
			{ header: "หมายเหตุ",      key: "note" },
		];
		const pdfRows = filtered.map((r, i) => ({
			_no:            String(i + 1),
			dateFmt:        fmtDateTime(r.date),
			typeLabel:      TYPE_LABEL[r.type] ?? r.type,
			itemCode:       r.itemCode,
			itemName:       r.itemName,
			qtyFmt:         (IN_TYPES.has(r.type) ? "+" : "-") + r.quantity.toLocaleString() + " " + r.unit,
			operatorName:   r.operatorName,
			note:           r.note || "-",
		}));
		const period = formatReportPeriod(startDate, endDate);
		printWarehouseReport({
			reportTitle:   "รายงานความเคลื่อนไหวสต็อก",
			period,
			filterSummary: selectedType ? `ประเภท: ${TYPE_LABEL[selectedType]}` : undefined,
			columns,
			rows: pdfRows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
		});
	};

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			<ReportDetailPageHeader
				reportPage="stock-balance"
				title="รายงานความเคลื่อนไหวสต็อก"
				subtitle="ระบบบริหารคลังสินค้า HPK"
				onBack={onBack}
			/>

			{/* Content */}
			<div className="flex-1 px-8 py-6">

				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
			onClick={() => { setIsTypeOpen(false); }}>

			{/* Toolbar */}
			<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
				{/* Search (client-side) */}
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหารหัส / ชื่อพัสดุ / ผู้ดำเนินการ..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full h-10 rounded-lg border border-slate-300 py-0 pl-9 pr-4 text-sm leading-none shadow-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 box-border"
					/>
				</div>

				{/* Transaction type (server-side) */}
				<div className="relative" onClick={(e) => e.stopPropagation()}>
					<button
						type="button"
						onClick={() => setIsTypeOpen((o) => !o)}
						className="flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 py-0 text-sm leading-none bg-white shadow-sm hover:bg-slate-50 min-w-[150px] box-border"
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

	
			<div className="flex flex-wrap items-center gap-3">
				<OutlinedDateField label="วันที่เริ่มต้น" value={startDate} onChange={setStartDate} />
				<OutlinedDateField label="วันที่สิ้นสุด" value={endDate} onChange={setEndDate} />
			</div>

				<div className="ml-auto flex items-center gap-2">
					{(searchTerm || selectedType || startDate || endDate) && (
						<button
							type="button"
							onClick={() => {
								setSearchTerm("");
								setSelectedType("");
								setStartDate("");
								setEndDate("");
								setCurrentPage(1);
							}}
							className="flex h-10 items-center gap-1.5 px-3 text-sm leading-none text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm box-border"
						>
							<X className="w-3.5 h-3.5" />
							ล้างตัวกรอง
						</button>
					)}
					<button
						type="button"
						title="Export PDF"
						onClick={handleExportPdf}
						className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm"
					>
						<PdfIcon />
					</button>
					<button
						type="button"
						title="Export CSV (.csv)"
						onClick={handleExportCsv}
						className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-sky-50 transition-all shadow-sm"
					>
						<CsvIcon />
					</button>
				</div>
			</div>

				{/* Summary strip — same rhythm as ItemsReportClient */}
				<div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 bg-white border-b border-slate-100 text-sm">
					<span className="text-slate-500">
						พบ <span className="font-semibold text-slate-800">{filtered.length.toLocaleString()}</span> รายการ
					</span>
					<span className="text-slate-300">·</span>
					<span className="text-emerald-700">เข้า <span className="font-semibold">{movementSummary.inCount.toLocaleString()}</span> รายการ ({movementSummary.inQty.toLocaleString()} หน่วย)</span>
					<span className="text-rose-700">ออก <span className="font-semibold">{movementSummary.outCount.toLocaleString()}</span> รายการ ({movementSummary.outQty.toLocaleString()} หน่วย)</span>
					<span className="text-slate-300">·</span>
					<span className={`font-semibold ${movementSummary.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
						สุทธิ {movementSummary.net >= 0 ? "+" : ""}{movementSummary.net.toLocaleString()} หน่วย
					</span>
					{allRows.length >= 500 && (
						<span className="ml-2 text-amber-600 text-xs">(จากข้อมูลสูงสุด 500 รายการล่าสุด)</span>
					)}
				</div>

		{/* Table — สูงตามเนื้อหา ไม่ล็อคความสูง; เลื่อนแนวนอนเมื่อตารางกว้าง */}
			<div className="relative w-full overflow-x-auto">
		{isFetching && (
				<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
					<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
				</div>
			)}
					<table className="w-full table-fixed text-sm text-left min-w-[1020px]">
					<thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
						<tr>
							<th className="px-4 py-4 w-[50px] text-center">#</th>
							<th className="px-6 py-4 w-[154px] whitespace-nowrap">วันที่/เวลา</th>
							<th className="px-6 py-4 w-[118px] whitespace-nowrap">ประเภท</th>
							<th className="px-3 py-4 w-[126px] whitespace-nowrap">รหัสรายการ</th>
							<th className="px-3 py-4 w-[200px] whitespace-nowrap">ชื่อพัสดุ</th>
							<th className="px-6 py-4 w-[100px] whitespace-nowrap">จำนวน</th>
							<th className="px-6 py-4 w-[76px] whitespace-nowrap">หน่วย</th>
							<th className="px-6 py-4 w-[168px] whitespace-nowrap">ผู้ดำเนินการ</th>
							<th className="px-6 py-4 w-[200px] whitespace-nowrap">หมายเหตุ</th>
						</tr>
					</thead>
					<tbody className="text-slate-600">
						{paginated.length > 0 ? (
							paginated.map((r, idx) => {
								const isIn = IN_TYPES.has(r.type);
								return (
									<tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
										<td className="px-4 py-3 text-center text-slate-500">
											{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
										</td>
										<td className="px-6 py-3 whitespace-nowrap" title={fmtDateTime(r.date)}>
											{fmtDateTime(r.date)}
										</td>
										<td className="px-6 py-3">
											<span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap border ${TYPE_BADGE[r.type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
												{TYPE_LABEL[r.type] ?? r.type}
											</span>
										</td>
										<td className="px-3 py-3">{r.itemCode}</td>
										<td className="px-3 py-3 truncate min-w-0" title={r.itemName}>
											{r.itemName}
										</td>
										<td className={`px-6 py-3 font-bold text-base tabular-nums ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
											{isIn ? "+" : "-"}{r.quantity.toLocaleString()}
										</td>
										<td className="px-6 py-3 truncate max-w-0" title={r.unit}>{r.unit}</td>
										<td className="px-6 py-3 truncate" title={r.operatorName || "-"}>
											{r.operatorName || "-"}
										</td>
										<td className="px-6 py-3 truncate text-xs text-slate-500" title={r.note || ""}>
											{r.note || "-"}
										</td>
									</tr>
								);
							})
						) : (
							<tr>
								<td colSpan={9} className="text-center py-16">
									<ArrowDownUp className="w-10 h-10 text-slate-200 mx-auto mb-2" />
									<p className="text-sm text-slate-400">ไม่พบรายการความเคลื่อนไหวสต็อก</p>
								</td>
							</tr>
						)}
					</tbody>
				</table>
		</div>

		{/* Pagination */}
		<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
			<p className="text-sm text-slate-500">
				แสดง {paginated.length.toLocaleString()} จาก {filtered.length.toLocaleString()} รายการ
				{allRows.length >= 500 && (
					<span className="ml-2 text-amber-600 text-xs">(จากข้อมูลสูงสุด 500 รายการล่าสุด)</span>
				)}
			</p>
			<div className="flex items-center gap-2">
				<button
					type="button"
					disabled={currentPage === 1}
					onClick={() => setCurrentPage((p) => p - 1)}
					className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-sm font-medium px-2 text-slate-600">
					หน้า {currentPage} / {totalPages}
				</span>
				<button
					type="button"
					disabled={currentPage >= totalPages}
					onClick={() => setCurrentPage((p) => p + 1)}
					className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
		</div>
		</div>{/* end card */}
		</div>{/* end content */}
	</div>
	);
};

export default StockBalanceReportClient;
