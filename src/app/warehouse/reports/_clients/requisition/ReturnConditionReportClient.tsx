"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Inbox, RotateCcw, Search, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate, fmtDateLong } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
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

interface ReturnRow {
	id: string;
	returnDate: string | null;
	itemCode: string;
	itemName: string;
	unit: string;
	category: string;
	qty: number;
	condition: string;
	note: string;
}

interface ApiResponse {
	items: ReturnRow[];
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

const PERIOD_PRESETS = [
	{ label: "1 เดือน",  months: 1  },
	{ label: "3 เดือน",  months: 3  },
	{ label: "6 เดือน",  months: 6  },
	{ label: "9 เดือน",  months: 9  },
	{ label: "12 เดือน", months: 12 },
];

const CONDITION_META: Record<string, { label: string; badge: string }> = {
	GOOD:    { label: "สภาพดี",   badge: "bg-green-50 text-green-700 border-green-200"   },
	DAMAGED: { label: "ชำรุด",    badge: "bg-red-50 text-red-700 border-red-200"         },
	LOST:    { label: "สูญหาย",   badge: "bg-slate-100 text-slate-500 border-slate-200"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthsAgo(n: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() - n);
	return d.toISOString().split("T")[0];
}

function todayStr(): string {
	return new Date().toISOString().split("T")[0];
}

function thaiDate(): string {
	return new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReturnConditionReportClient({ onBack }: Props) {
	const { profile } = useUser();

	const [rows,       setRows]       = useState<ReturnRow[]>([]);
	const [total,      setTotal]      = useState(0);
	const [page,       setPage]       = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading,    setLoading]    = useState(false);

	const [search,         setSearch]         = useState("");
	const [condFilter,     setCondFilter]     = useState("");
	const [selectedPreset, setSelectedPreset] = useState(3);
	const [dateFrom,       setDateFrom]       = useState(monthsAgo(3));
	const [dateTo,         setDateTo]         = useState(todayStr());
	const [useCustom,      setUseCustom]      = useState(false);

	const printDate = fmtDateLong(new Date());

	const periodLabel = useCustom
		? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`
		: `${PERIOD_PRESETS.find(p => p.months === selectedPreset)?.label ?? ""} ย้อนหลัง`;

	const buildParams = useCallback((p: number, overrideLimit?: number) => {
		const params = new URLSearchParams({
			page: String(p),
			limit: String(overrideLimit ?? ITEMS_PER_PAGE),
			dateFrom, dateTo,
		});
		if (search.trim())  params.set("search", search.trim());
		if (condFilter)     params.set("condition", condFilter);
		return params;
	}, [dateFrom, dateTo, search, condFilter]);

	const fetchData = useCallback(async (p: number) => {
		setLoading(true);
		try {
			const res = await apiClient.get<ApiResponse>(`/v1/reports/return-condition?${buildParams(p)}`);
			setRows(res.data?.items ?? []);
			setTotal(res.data?.total ?? 0);
			setTotalPages(res.data?.totalPages ?? 1);
		} catch {
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [buildParams]);

	useEffect(() => { setPage(1); fetchData(1); }, [fetchData]);

	const handlePreset = (months: number) => {
		setSelectedPreset(months);
		setUseCustom(false);
		setDateFrom(monthsAgo(months));
		setDateTo(todayStr());
	};

	const clearCustom = () => handlePreset(selectedPreset);

	const hasFilter = !!(search || condFilter || useCustom);
	const clearAll  = () => {
		setSearch(""); setCondFilter("");
		handlePreset(3);
	};

	// Fetch all pages for export
	const fetchAllForExport = async (): Promise<ReturnRow[]> => {
		const res = await apiClient.get<ApiResponse>(`/v1/reports/return-condition?${buildParams(1, 9999)}`);
		return res.data?.items ?? [];
	};

	// Summary counts (from current page — full counts come from `total`)
	const good    = rows.filter(r => r.condition === "GOOD").length;
	const damaged = rows.filter(r => r.condition === "DAMAGED").length;
	const lost    = rows.filter(r => r.condition === "LOST").length;

	const printedByName = [profile?.title?.name, profile?.firstname_th, profile?.lastname_th]
		.filter(Boolean).join("") || undefined;

	// ── PDF export ────────────────────────────────────────────────────────────
	const handlePdf = async () => {
		const allRows = await fetchAllForExport();
		const columns: PrintColumn[] = [
			{ header: "วันที่คืน",  key: "returnDate", align: "center" },
			{ header: "รหัสรายการ", key: "itemCode",   align: "left"   },
			{ header: "ชื่อพัสดุ",  key: "itemName",   align: "left"   },
			{ header: "หมวดหมู่",   key: "category",   align: "left"   },
			{ header: "จำนวนคืน",   key: "qty",        align: "center" },
			{ header: "หน่วย",      key: "unit",       align: "left"   },
			{ header: "สภาพ",       key: "condition",  align: "center" },
			{ header: "หมายเหตุ",   key: "note",       align: "left"   },
		];
		const pdfRows = allRows.map(r => ({
			returnDate: r.returnDate ? fmtDate(r.returnDate) : "-",
			itemCode:   r.itemCode,
			itemName:   r.itemName,
			category:   r.category || "-",
			qty:        r.qty,
			unit:       r.unit,
			condition:  CONDITION_META[r.condition]?.label ?? r.condition,
			note:       r.note || "-",
		}));

		const filterParts: string[] = [];
		if (condFilter) filterParts.push(`สภาพ: ${CONDITION_META[condFilter]?.label ?? condFilter}`);
		if (search)     filterParts.push(`คำค้น: ${search}`);

		printWarehouseReport({
			reportTitle:   "รายงานสภาพพัสดุที่คืน",
			period:        periodLabel,
			filterSummary: filterParts.length ? filterParts.join(" | ") : undefined,
			columns,
			rows:          pdfRows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
			signers: [
				{ role: "ผู้ออกรายงาน", name: printedByName, date: thaiDate() },
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
		const COLS      = 8;

		const ws = wb.addWorksheet("สภาพพัสดุที่คืน");
		ws.columns = [
			{ width: 14 },  // วันที่คืน
			{ width: 14 },  // รหัส
			{ width: 38 },  // ชื่อพัสดุ
			{ width: 22 },  // หมวดหมู่
			{ width: 10 },  // จำนวนคืน
			{ width: 10 },  // หน่วย
			{ width: 12 },  // สภาพ
			{ width: 28 },  // หมายเหตุ
		];

		// Title block
		const r1 = ws.addRow(["รายงานสภาพพัสดุที่คืน"]);
		ws.mergeCells(r1.number, 1, r1.number, COLS);
		r1.height = 28;
		r1.getCell(1).style = {
			font:      { name: FONT, size: 16, bold: true, color: { argb: "FF0D47A1" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r2 = ws.addRow(["ระบบบริหารคลังสินค้า HPK"]);
		ws.mergeCells(r2.number, 1, r2.number, COLS);
		r2.height = 18;
		r2.getCell(1).style = {
			font:      { name: FONT, size: 11, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const meta = [
			`ช่วงเวลา: ${periodLabel}`,
			`รวม ${allRows.length.toLocaleString()} รายการ`,
			`วันที่สร้าง: ${new Date().toLocaleDateString("th-TH")}`,
		].join("    |    ");

		const r3 = ws.addRow([meta]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 16;
		r3.getCell(1).style = {
			font:      { name: FONT, size: 10, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		ws.addRow([]);

		// Header row
		const hr = ws.addRow(["วันที่คืน", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "จำนวนคืน", "หน่วย", "สภาพ", "หมายเหตุ"]);
		hr.height = 22;
		hr.eachCell(cell => {
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

		// Condition color map for fill
		const condFill: Record<string, string> = {
			GOOD:    "FFD1FAE5",
			DAMAGED: "FFFEE2E2",
			LOST:    "FFF1F5F9",
		};

		allRows.forEach((r, i) => {
			const bg  = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
			const cBg = condFill[r.condition] ?? bg;
			const dr  = ws.addRow([
				r.returnDate ? fmtDate(r.returnDate) : "-",
				r.itemCode,
				r.itemName,
				r.category || "-",
				r.qty,
				r.unit,
				CONDITION_META[r.condition]?.label ?? r.condition,
				r.note || "-",
			]);
			dr.height = 18;
			dr.eachCell({ includeEmpty: true }, (cell, col) => {
				cell.font   = { name: FONT, size: 11 };
				cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: col === 7 ? cBg : bg } };
				cell.border = {
					top: { style: "thin", color: { argb: "FFB0BEC5" } }, left: { style: "thin", color: { argb: "FFB0BEC5" } },
					bottom: { style: "thin", color: { argb: "FFB0BEC5" } }, right: { style: "thin", color: { argb: "FFB0BEC5" } },
				};
				if (col === 1 || col === 5 || col === 7) cell.alignment = { horizontal: "center" };
				if (col === 5) cell.font = { name: FONT, size: 11, bold: true };
			});
		});

		// Summary rows
		const goodCount    = allRows.filter(r => r.condition === "GOOD").length;
		const damagedCount = allRows.filter(r => r.condition === "DAMAGED").length;
		const lostCount    = allRows.filter(r => r.condition === "LOST").length;

		ws.addRow([]);
		const summaryData = [
			["สรุป", `สภาพดี: ${goodCount}`, `ชำรุด: ${damagedCount}`, `สูญหาย: ${lostCount}`, `รวมทั้งหมด: ${allRows.length} รายการ`],
		];
		summaryData.forEach(cols => {
			const sr = ws.addRow(cols);
			sr.height = 20;
			sr.eachCell({ includeEmpty: true }, cell => {
				cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FF0D47A1" } };
				cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
			});
		});

		ws.addRow([]);
		const fr = ws.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws.mergeCells(fr.number, 1, fr.number, COLS);
		fr.getCell(1).style = {
			font:      { name: FONT, size: 10, italic: true, color: { argb: "FF9E9E9E" } },
			alignment: { horizontal: "right" },
		};

		const buf  = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href     = url;
		a.download = `รายงานสภาพพัสดุที่คืน_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// ── Condition filter tabs ─────────────────────────────────────────────────
	const condTabs = [
		{ value: "",        label: "ทั้งหมด",  count: total },
		{ value: "GOOD",    label: "สภาพดี",   count: good    },
		{ value: "DAMAGED", label: "ชำรุด",    count: damaged },
		{ value: "LOST",    label: "สูญหาย",   count: lost    },
	];

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			{/* ── Header bar ──────────────────────────────────────────────────── */}
			<div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow">
							<RotateCcw className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานสภาพพัสดุที่คืน</h1>
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

				{/* Condition tabs in header bottom */}
				<div className="flex gap-1 mt-5">
					{condTabs.map(tab => (
						<button
							key={tab.value}
							type="button"
							onClick={() => setCondFilter(tab.value)}
							className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${
								condFilter === tab.value
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
							}`}
						>
							{tab.label}
							{tab.value !== "" && (
								<span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
									condFilter === tab.value ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
								}`}>
									{tab.count}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* ── Content ──────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* ── Toolbar ───────────────────────────────────────────────── */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">

						{/* Period presets */}
						<div className="flex items-center gap-1.5 flex-wrap">
							{PERIOD_PRESETS.map(p => (
								<button
									key={p.months}
									type="button"
									onClick={() => handlePreset(p.months)}
									className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors ${
										!useCustom && selectedPreset === p.months
											? "bg-blue-600 text-white shadow-sm"
											: "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
									}`}
								>
									{p.label}
								</button>
							))}
							<button
								type="button"
								onClick={() => setUseCustom(true)}
								className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors ${
									useCustom ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
								}`}
							>
								กำหนดเอง
							</button>
						</div>

						{/* Custom date range */}
						{useCustom && (
							<>
								<OutlinedDateField label="วันที่เริ่มต้น" value={dateFrom} onChange={setDateFrom} />
								<OutlinedDateField label="วันที่สิ้นสุด"  value={dateTo}   onChange={setDateTo} />
								<button type="button" onClick={clearCustom}
									className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50">
									<X className="w-3.5 h-3.5" /> รีเซต
								</button>
							</>
						)}

						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
							<input
								value={search}
								onChange={e => setSearch(e.target.value)}
								placeholder="ค้นหาชื่อ / รหัสรายการ..."
								className="h-10 pl-9 pr-3 w-52 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Clear all */}
						{hasFilter && (
							<button type="button" onClick={clearAll}
								className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
								<X className="w-3.5 h-3.5" /> ล้างตัวกรอง
							</button>
						)}

						{/* Export */}
						<div className="ml-auto flex items-center gap-2">
							<button type="button" title="Export XLSX" onClick={handleExportXlsx}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
								<XlsxIcon />
							</button>
							<button type="button" title="Export PDF" onClick={handlePdf}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
								<PdfIcon />
							</button>
						</div>
					</div>

					{/* ── Row count strip ────────────────────────────────────────── */}
					<div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-slate-100">
						<span className="text-xs text-slate-500">
							ช่วงเวลา <span className="font-semibold text-slate-700">{periodLabel}</span>
						</span>
						<div className="w-px h-4 bg-slate-200" />
						<span className="text-xs text-slate-500">
							พบ <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> รายการ
						</span>
					</div>

					{/* ── Table ─────────────────────────────────────────────────── */}
					<div className="relative w-full overflow-x-auto">
						{loading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full text-sm text-left min-w-[800px]">
							<colgroup>
								<col className="w-[120px]" />
								<col className="w-[110px]" />
								<col />
								<col className="w-[150px]" />
								<col className="w-[80px]" />
								<col className="w-[72px]" />
								<col className="w-[100px]" />
								<col className="w-[180px]" />
							</colgroup>
							<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">วันที่คืน</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">รหัสรายการ</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ชื่อพัสดุ</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หมวดหมู่</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">จำนวนคืน</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หน่วย</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">สภาพ</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หมายเหตุ</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{!loading && rows.length === 0 ? (
									<tr>
										<td colSpan={8}>
											<div className="flex flex-col items-center justify-center py-16 gap-2">
												<Inbox className="w-12 h-12 text-slate-200" />
												<p className="text-sm text-slate-400">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
											</div>
										</td>
									</tr>
								) : rows.map(row => {
									const cond = CONDITION_META[row.condition] ?? { label: row.condition, badge: "bg-slate-100 text-slate-500 border-slate-200" };
									return (
										<tr key={row.id} className="bg-white hover:bg-slate-50 transition-colors">
											<td className="px-4 py-3 text-center text-sm text-slate-700 tabular-nums whitespace-nowrap">
												{row.returnDate ? fmtDate(row.returnDate) : "-"}
											</td>
											<td className="px-4 py-3 text-sm text-slate-700 font-mono">{row.itemCode}</td>
											<td className="px-4 py-3 text-sm text-slate-700 truncate max-w-0" title={row.itemName}>{row.itemName}</td>
											<td className="px-4 py-3 text-sm text-slate-600 truncate max-w-0">{row.category || "-"}</td>
											<td className="px-4 py-3 text-center text-sm font-semibold text-slate-700 tabular-nums">{row.qty}</td>
											<td className="px-4 py-3 text-sm text-slate-600">{row.unit}</td>
											<td className="px-4 py-3 text-center">
												<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${cond.badge}`}>
													{cond.label}
												</span>
											</td>
											<td className="px-4 py-3 text-sm text-slate-500 truncate max-w-0">{row.note || "-"}</td>
										</tr>
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
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานสภาพพัสดุที่คืน</p>
			</div>
		</div>
	);
}
