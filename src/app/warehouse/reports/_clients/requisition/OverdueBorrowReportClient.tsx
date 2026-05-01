"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlarmClock, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Inbox, Search, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate, fmtDateLong } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

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

interface OverdueItem {
	id: string;
	itemCode: string;
	itemName: string;
	qty: number;
	issued: number;
	unit: string;
}

interface OverdueRow {
	id: string;
	docNo: string;
	requester: string;
	department: string;
	dueDate: string | null;
	daysOverdue: number | null;
	status: string;
	items: OverdueItem[];
}

interface ApiResponse {
	items: OverdueRow[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

interface Props {
	onBack?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function overdueColor(days: number | null): string {
	if (!days) return "bg-slate-100 text-slate-500 border-slate-200";
	if (days >= 30) return "bg-red-100 text-red-700 border-red-200";
	if (days >= 14) return "bg-orange-50 text-orange-700 border-orange-200";
	return "bg-amber-50 text-amber-700 border-amber-200";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OverdueBorrowReportClient({ onBack }: Props) {
	const { profile } = useUser();

	const [rows,       setRows]       = useState<OverdueRow[]>([]);
	const [total,      setTotal]      = useState(0);
	const [page,       setPage]       = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading,    setLoading]    = useState(false);
	const [search,     setSearch]     = useState("");
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const printDate = fmtDateLong(new Date());

	const fetchData = useCallback(async (p: number, overrideLimit?: number) => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				page:  String(p),
				limit: String(overrideLimit ?? ITEMS_PER_PAGE),
				...(search.trim() ? { search: search.trim() } : {}),
			});
			const res = await apiClient.get<ApiResponse>(`/v1/reports/overdue-borrows?${params}`);
			if (overrideLimit) return res.data?.items ?? [];
			setRows(res.data?.items ?? []);
			setTotal(res.data?.total ?? 0);
			setTotalPages(res.data?.totalPages ?? 1);
		} catch {
			if (!overrideLimit) setRows([]);
		} finally {
			if (!overrideLimit) setLoading(false);
		}
	}, [search]);

	useEffect(() => { setPage(1); fetchData(1); }, [fetchData]);

	const toggleExpand = (id: string) => {
		setExpandedIds(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const fetchAllForExport = async (): Promise<OverdueRow[]> => {
		const res = await apiClient.get<ApiResponse>(
			`/v1/reports/overdue-borrows?page=1&limit=9999${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`
		);
		return res.data?.items ?? [];
	};

	const totalDaysOverdue = rows.reduce((s, r) => s + (r.daysOverdue ?? 0), 0);
	const maxOverdue       = rows.length > 0 ? Math.max(...rows.map(r => r.daysOverdue ?? 0)) : 0;

	const printedByName = [profile?.title?.name, profile?.firstname_th, profile?.lastname_th]
		.filter(Boolean).join("") || undefined;
	const thaiDateShort = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });

	// ── PDF export ────────────────────────────────────────────────────────────
	const handlePdf = async () => {
		const allRows = await fetchAllForExport();
		const columns: PrintColumn[] = [
			{ header: "เลขที่เอกสาร",  key: "docNo",       align: "left"   },
			{ header: "ผู้ยืม",         key: "requester",   align: "left"   },
			{ header: "แผนก",           key: "department",  align: "left"   },
			{ header: "วันครบกำหนด",    key: "dueDate",     align: "center" },
			{ header: "เกินมา (วัน)",   key: "daysOverdue", align: "center" },
			{ header: "รายการพัสดุ",    key: "itemSummary", align: "left"   },
		];
		const pdfRows = allRows.map(r => ({
			docNo:       r.docNo,
			requester:   r.requester,
			department:  r.department,
			dueDate:     r.dueDate ? fmtDate(r.dueDate) : "-",
			daysOverdue: r.daysOverdue ?? 0,
			itemSummary: r.items.map(i => `${i.itemName} (${i.issued}/${i.qty} ${i.unit})`).join(", "),
		}));

		printWarehouseReport({
			reportTitle:   "รายงานการยืมพัสดุเกินกำหนด",
			filterSummary: `ทั้งหมด ${allRows.length.toLocaleString()} รายการ`,
			columns,
			rows:          pdfRows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
			signers: [
				{ role: "ผู้ออกรายงาน", name: printedByName, date: thaiDateShort },
				{ role: "ผู้ตรวจสอบ" },
				{ role: "ผู้อนุมัติ" },
			],
		});
	};

	// ── XLSX export ───────────────────────────────────────────────────────────
	const handleExportXlsx = async () => {
		const allRows = await fetchAllForExport();
		if (allRows.length === 0) return;

		const ExcelJS  = (await import("exceljs")).default;
		const wb       = new ExcelJS.Workbook();
		wb.creator     = "HPK WMS";
		wb.created     = new Date();

		const FONT      = "TH Sarabun New";
		const HEADER_BG = "FF37474F";

		// ── Sheet 1: รายการค้างคืน ─────────────────────────────────────────
		const ws1 = wb.addWorksheet("รายการยืมเกินกำหนด");
		ws1.columns = [
			{ width: 6  },   // #
			{ width: 18 },   // เลขที่เอกสาร
			{ width: 16 },   // วันครบกำหนด
			{ width: 12 },   // เกินมา (วัน)
			{ width: 26 },   // ผู้ยืม
			{ width: 26 },   // แผนก
			{ width: 10 },   // จำนวนรายการ
		];

		const COLS1 = 7;
		const addTitle = (ws: import("exceljs").Worksheet, title: string, cols: number) => {
			const r1 = ws.addRow([title]);
			ws.mergeCells(r1.number, 1, r1.number, cols);
			r1.height = 28;
			r1.getCell(1).style = {
				font:      { name: FONT, size: 16, bold: true, color: { argb: "FFC62828" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE8E8" } },
				alignment: { horizontal: "center", vertical: "middle" },
			};
			const r2 = ws.addRow(["ระบบบริหารคลังสินค้า HPK"]);
			ws.mergeCells(r2.number, 1, r2.number, cols);
			r2.height = 18;
			r2.getCell(1).style = {
				font:      { name: FONT, size: 11, color: { argb: "FF546E7A" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
				alignment: { horizontal: "center", vertical: "middle" },
			};
			const r3 = ws.addRow([`รวม ${allRows.length} รายการ    |    วันที่สร้าง: ${new Date().toLocaleDateString("th-TH")}`]);
			ws.mergeCells(r3.number, 1, r3.number, cols);
			r3.height = 16;
			r3.getCell(1).style = {
				font:      { name: FONT, size: 10, color: { argb: "FF546E7A" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
				alignment: { horizontal: "center", vertical: "middle" },
			};
			ws.addRow([]);
		};

		addTitle(ws1, "รายงานการยืมพัสดุเกินกำหนด", COLS1);
		const h1 = ws1.addRow(["#", "เลขที่เอกสาร", "วันครบกำหนด", "เกินมา (วัน)", "ผู้ยืม", "แผนก", "จำนวนรายการ"]);
		h1.height = 22;
		h1.eachCell(cell => {
			cell.style = {
				font:      { name: FONT, size: 12, bold: true, color: { argb: "FFFFFFFF" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } },
				alignment: { horizontal: "center", vertical: "middle" },
				border: {
					top: { style: "thin", color: { argb: "FF546E7A" } }, left: { style: "thin", color: { argb: "FF546E7A" } },
					bottom: { style: "thin", color: { argb: "FF546E7A" } }, right: { style: "thin", color: { argb: "FF546E7A" } },
				},
			};
		});

		allRows.forEach((r, i) => {
			const days = r.daysOverdue ?? 0;
			const bg   = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
			const dayBg = days >= 30 ? "FFFDE8E8" : days >= 14 ? "FFFFF3E0" : "FFFFFDE7";
			const dr = ws1.addRow([i + 1, r.docNo, r.dueDate ? fmtDate(r.dueDate) : "-", days, r.requester, r.department, r.items.length]);
			dr.height = 18;
			dr.eachCell({ includeEmpty: true }, (cell, col) => {
				cell.font   = { name: FONT, size: 11 };
				cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: col === 4 && days > 0 ? dayBg : bg } };
				cell.border = {
					top: { style: "thin", color: { argb: "FFB0BEC5" } }, left: { style: "thin", color: { argb: "FFB0BEC5" } },
					bottom: { style: "thin", color: { argb: "FFB0BEC5" } }, right: { style: "thin", color: { argb: "FFB0BEC5" } },
				};
				if ([1, 3, 4, 7].includes(col)) cell.alignment = { horizontal: "center" };
				if (col === 4 && days > 0) cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFC62828" } };
			});
		});

		ws1.addRow([]);
		const f1 = ws1.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws1.mergeCells(f1.number, 1, f1.number, COLS1);
		f1.getCell(1).style = { font: { name: FONT, size: 10, italic: true, color: { argb: "FF9E9E9E" } }, alignment: { horizontal: "right" } };

		// ── Sheet 2: รายละเอียดพัสดุ ───────────────────────────────────────
		const ws2 = wb.addWorksheet("รายละเอียดพัสดุ");
		ws2.columns = [
			{ width: 18 },   // เลขที่เอกสาร
			{ width: 26 },   // ผู้ยืม
			{ width: 26 },   // แผนก
			{ width: 12 },   // เกินมา (วัน)
			{ width: 14 },   // รหัสรายการ
			{ width: 38 },   // ชื่อพัสดุ
			{ width: 12 },   // จำนวนขอ
			{ width: 12 },   // จำนวนจ่าย
			{ width: 10 },   // หน่วย
		];

		const COLS2 = 9;
		addTitle(ws2, "รายงานการยืมพัสดุเกินกำหนด — รายละเอียด", COLS2);
		const h2 = ws2.addRow(["เลขที่เอกสาร", "ผู้ยืม", "แผนก", "เกินมา (วัน)", "รหัสรายการ", "ชื่อพัสดุ", "จำนวนขอ", "จำนวนจ่าย", "หน่วย"]);
		h2.height = 22;
		h2.eachCell(cell => {
			cell.style = {
				font:      { name: FONT, size: 12, bold: true, color: { argb: "FFFFFFFF" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } },
				alignment: { horizontal: "center", vertical: "middle" },
				border: {
					top: { style: "thin", color: { argb: "FF546E7A" } }, left: { style: "thin", color: { argb: "FF546E7A" } },
					bottom: { style: "thin", color: { argb: "FF546E7A" } }, right: { style: "thin", color: { argb: "FF546E7A" } },
				},
			};
		});

		let rowIdx = 0;
		allRows.forEach(r => {
			r.items.forEach(it => {
				const bg = rowIdx % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
				const dr = ws2.addRow([r.docNo, r.requester, r.department, r.daysOverdue ?? 0, it.itemCode, it.itemName, it.qty, it.issued, it.unit]);
				dr.height = 18;
				dr.eachCell({ includeEmpty: true }, (cell, col) => {
					cell.font   = { name: FONT, size: 11 };
					cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
					cell.border = {
						top: { style: "thin", color: { argb: "FFB0BEC5" } }, left: { style: "thin", color: { argb: "FFB0BEC5" } },
						bottom: { style: "thin", color: { argb: "FFB0BEC5" } }, right: { style: "thin", color: { argb: "FFB0BEC5" } },
					};
					if ([4, 7, 8].includes(col)) cell.alignment = { horizontal: "center" };
				});
				rowIdx++;
			});
		});

		ws2.addRow([]);
		const f2 = ws2.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws2.mergeCells(f2.number, 1, f2.number, COLS2);
		f2.getCell(1).style = { font: { name: FONT, size: 10, italic: true, color: { argb: "FF9E9E9E" } }, alignment: { horizontal: "right" } };

		const buf  = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href     = url;
		a.download = `รายงานยืมเกินกำหนด_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			{/* ── Header bar ──────────────────────────────────────────────────── */}
			<div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600 shadow">
							<AlarmClock className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานการยืมพัสดุเกินกำหนด</h1>
							<p className="text-sm text-slate-500 mt-0.5">ระบบบริหารคลังสินค้า HPK &nbsp;·&nbsp; พิมพ์วันที่ {printDate}</p>
						</div>
					</div>
					{onBack && (
						<button type="button" onClick={onBack}
							className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
							ย้อนกลับ
						</button>
					)}
				</div>
			</div>

			{/* ── Content ──────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* ── Toolbar ───────────────────────────────────────────────── */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder="ค้นหาเลขที่เอกสาร / ผู้ยืม / แผนก..."
								className="h-10 pl-9 pr-3 w-72 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						{search && (
							<button type="button" onClick={() => setSearch("")}
								className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
								<X className="w-3.5 h-3.5" /> ล้าง
							</button>
						)}
						<div className="ml-auto flex items-center gap-2">
							<button type="button" title="Export XLSX (2 sheets)" onClick={handleExportXlsx}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
								<XlsxIcon />
							</button>
							<button type="button" title="Export PDF" onClick={handlePdf}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
								<PdfIcon />
							</button>
						</div>
					</div>

					{/* ── Summary strip ─────────────────────────────────────────── */}
					<div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-slate-100">
						<span className="text-xs text-slate-500">
							พบ <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> รายการ
						</span>
						<div className="w-px h-4 bg-slate-200" />
						<span className="text-xs text-slate-500">
							รวมเกินกำหนด <span className="font-semibold text-red-600">{totalDaysOverdue.toLocaleString()}</span> วัน
						</span>
						{maxOverdue > 0 && (
							<>
								<div className="w-px h-4 bg-slate-200" />
								<span className="text-xs text-slate-500">
									สูงสุด <span className="font-semibold text-red-600">{maxOverdue}</span> วัน
								</span>
							</>
						)}
					</div>

					{/* ── Table ─────────────────────────────────────────────────── */}
					<div className="relative w-full overflow-x-auto">
						{loading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-red-100 border-t-red-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full text-sm text-left min-w-[700px]">
							<colgroup>
								<col className="w-[148px]" />
								<col className="w-[130px]" />
								<col className="w-[100px]" />
								<col />
								<col className="w-[180px]" />
								<col className="w-[44px]" />
							</colgroup>
							<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">เลขที่เอกสาร</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">วันครบกำหนด</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">เกินมา</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ผู้ยืม</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">แผนก</th>
									<th className="px-4 py-3" />
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{!loading && rows.length === 0 ? (
									<tr>
										<td colSpan={6}>
											<div className="flex flex-col items-center justify-center py-16 gap-2">
												<Inbox className="w-12 h-12 text-slate-200" />
												<p className="text-sm text-slate-400">ไม่พบรายการยืมเกินกำหนด</p>
											</div>
										</td>
									</tr>
								) : rows.map(row => {
									const isExpanded = expandedIds.has(row.id);
									return (
										<React.Fragment key={row.id}>
											{/* ── Main row ─────────────────────── */}
											<tr
												className="bg-white hover:bg-slate-50 transition-colors cursor-pointer"
												onClick={() => toggleExpand(row.id)}
											>
												<td className="px-4 py-3 text-sm font-mono text-slate-700">{row.docNo}</td>
												<td className="px-4 py-3 text-center text-sm text-slate-700 tabular-nums whitespace-nowrap">
													{row.dueDate ? fmtDate(row.dueDate) : "-"}
												</td>
												<td className="px-4 py-3 text-center">
													<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${overdueColor(row.daysOverdue)}`}>
														{row.daysOverdue ?? 0} วัน
													</span>
												</td>
												<td className="px-4 py-3 text-sm text-slate-700 truncate max-w-0">{row.requester}</td>
												<td className="px-4 py-3 text-sm text-slate-600 truncate max-w-0">{row.department}</td>
												<td className="px-4 py-3 text-center text-slate-400">
													{isExpanded
														? <ChevronUp   className="w-4 h-4 mx-auto" />
														: <ChevronDown className="w-4 h-4 mx-auto" />
													}
												</td>
											</tr>

											{/* ── Expanded: items ──────────────── */}
											{isExpanded && (
												<tr>
													<td colSpan={6} className="px-6 py-3 bg-slate-50 border-b border-slate-200">
														<p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
															รายการพัสดุที่ยังไม่คืน ({row.items.length} รายการ)
														</p>
														<div className="overflow-x-auto rounded-lg border border-slate-200">
															<table className="w-full text-sm min-w-[480px]">
																<thead className="bg-slate-100 border-b border-slate-200">
																	<tr>
																		<th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-left">รหัสรายการ</th>
																		<th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 text-left">ชื่อพัสดุ</th>
																		<th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">จำนวนขอ</th>
																		<th className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">จำนวนจ่าย</th>
																		<th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">หน่วย</th>
																	</tr>
																</thead>
																<tbody className="divide-y divide-slate-100 bg-white">
																	{row.items.map(it => (
																		<tr key={it.id} className="hover:bg-slate-50 transition-colors">
																			<td className="px-3 py-2 text-sm font-mono text-slate-600">{it.itemCode}</td>
																			<td className="px-3 py-2 text-sm text-slate-700">{it.itemName}</td>
																			<td className="px-3 py-2 text-center text-sm text-slate-700 tabular-nums">{it.qty}</td>
																			<td className="px-3 py-2 text-center text-sm font-semibold text-blue-600 tabular-nums">{it.issued}</td>
																			<td className="px-3 py-2 text-sm text-slate-500">{it.unit}</td>
																		</tr>
																	))}
																</tbody>
															</table>
														</div>
													</td>
												</tr>
											)}
										</React.Fragment>
									);
								})}
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
								<button type="button" disabled={page <= 1}
									onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs font-medium px-2 text-slate-600">หน้า {page} / {totalPages}</span>
								<button type="button" disabled={page >= totalPages}
									onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors">
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Footer ──────────────────────────────────────────────────────── */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานการยืมพัสดุเกินกำหนด</p>
			</div>
		</div>
	);
}
