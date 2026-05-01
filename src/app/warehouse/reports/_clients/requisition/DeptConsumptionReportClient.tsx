"use client";

import React, { useCallback, useEffect, useState } from "react";
import { BarChart3, ChevronDown, ChevronUp, Inbox, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate, fmtDateLong } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { OutlinedDateField } from "../../_components/OutlinedDateField";

// ── Icons ─────────────────────────────────────────────────────────────────────

const PdfIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#dc2626"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
	</svg>
);

const XlsxIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#16a34a"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">XLSX</text>
	</svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopItem {
	itemId: string;
	itemCode: string;
	itemName: string;
	unit: string;
	category: string;
	issuedQty: number;
	value: number;
}

interface DeptGroup {
	departmentId: number;
	departmentName: string;
	requestCount: number;
	totalIssuedQty: number;
	totalValue: number;
	topItems: TopItem[];
}

interface ApiResponse {
	groups: DeptGroup[];
	totalDepts: number;
}

interface Props {
	onBack?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PERIOD_PRESETS = [
	{ label: "1 เดือน",  months: 1  },
	{ label: "3 เดือน",  months: 3  },
	{ label: "6 เดือน",  months: 6  },
	{ label: "9 เดือน",  months: 9  },
	{ label: "12 เดือน", months: 12 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthsAgo(n: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() - n);
	return d.toISOString().split("T")[0];
}

function todayStr(): string {
	return new Date().toISOString().split("T")[0];
}

function fmtBaht(n: number): string {
	return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeptConsumptionReportClient({ onBack }: Props) {
	const { profile } = useUser();

	const [data,     setData]     = useState<ApiResponse | null>(null);
	const [loading,  setLoading]  = useState(false);
	const [expanded, setExpanded] = useState<Set<number>>(new Set());

	const [selectedPreset, setSelectedPreset] = useState(3);
	const [dateFrom,       setDateFrom]       = useState(monthsAgo(3));
	const [dateTo,         setDateTo]         = useState(todayStr());
	const [useCustom,      setUseCustom]      = useState(false);

	const printDate = fmtDateLong(new Date());

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams({ dateFrom, dateTo });
			const res = await apiClient.get<ApiResponse>(`/v1/reports/department-consumption?${params}`);
			setData(res.data ?? null);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [dateFrom, dateTo]);

	useEffect(() => { fetchData(); }, [fetchData]);

	const handlePreset = (months: number) => {
		setSelectedPreset(months);
		setUseCustom(false);
		setDateFrom(monthsAgo(months));
		setDateTo(todayStr());
	};

	const handleCustomToggle = () => {
		setUseCustom(true);
	};

	const clearCustom = () => {
		handlePreset(selectedPreset);
	};

	const toggleDept = (id: number) => {
		setExpanded(prev => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const grandTotal     = data?.groups.reduce((s, g) => s + g.totalValue, 0) ?? 0;
	const totalReqs      = data?.groups.reduce((s, g) => s + g.requestCount, 0) ?? 0;
	const totalIssuedQty = data?.groups.reduce((s, g) => s + g.totalIssuedQty, 0) ?? 0;
	// Bar chart based on value; if all values = 0, fall back to quantity
	const allValueZero = grandTotal === 0;
	const maxBarValue  = allValueZero
		? (data?.groups[0]?.totalIssuedQty ?? 1)
		: (data?.groups[0]?.totalValue ?? 1);

	const periodLabel = useCustom
		? `${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`
		: `${PERIOD_PRESETS.find(p => p.months === selectedPreset)?.label ?? ""} ย้อนหลัง`;

	const handlePdf = () => {
		if (!data) return;
		const columns: PrintColumn[] = [
			{ header: "แผนก",           key: "departmentName", align: "left"   },
			{ header: "ครั้งที่เบิก",    key: "requestCount",   align: "center" },
			{ header: "จำนวนรวม (ชิ้น)", key: "totalIssuedQty", align: "right"  },
			{ header: "มูลค่ารวม (฿)",  key: "totalValue",     align: "right"  },
		];
		const rows = data.groups.map(g => ({
			departmentName: g.departmentName,
			requestCount:   g.requestCount,
			totalIssuedQty: g.totalIssuedQty.toLocaleString(),
			totalValue:     fmtBaht(g.totalValue),
		}));

		const printedByName = [profile?.title?.name, profile?.firstname_th, profile?.lastname_th]
			.filter(Boolean).join("") || undefined;

		printWarehouseReport({
			reportTitle:   "รายงานการเบิกพัสดุรายแผนก",
			period:        periodLabel,
			filterSummary: `${data.groups.length} แผนก · รวม ${totalReqs.toLocaleString()} ครั้งที่เบิก`,
			columns,
			rows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
			signers: [
				{
					role: "ผู้ออกรายงาน",
					name: printedByName,
					date: new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
				},
				{ role: "ผู้ตรวจสอบ" },
				{ role: "ผู้อนุมัติ" },
			],
		});
	};

	const handleExportXlsx = async () => {
		if (!data || data.groups.length === 0) return;

		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		wb.creator = "HPK WMS";
		wb.created = new Date();

		const ACCENT  = "FF0786F5";
		const HEADER_BG = "FF37474F";
		const FONT    = "TH Sarabun New";

		const metaLine = [
			`ช่วงเวลา: ${periodLabel}`,
			`รวม ${data.totalDepts} แผนก`,
			`${totalReqs.toLocaleString()} ครั้งที่เบิก`,
			`วันที่สร้าง: ${new Date().toLocaleDateString("th-TH")}`,
		].join("    |    ");

		const addTitleBlock = (ws: import("exceljs").Worksheet, title: string, cols: number) => {
			const r1 = ws.addRow([title]);
			ws.mergeCells(r1.number, 1, r1.number, cols);
			r1.height = 28;
			r1.getCell(1).style = {
				font:      { name: FONT, size: 16, bold: true, color: { argb: `FF${ACCENT.slice(2)}` } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } },
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
			const r3 = ws.addRow([metaLine]);
			ws.mergeCells(r3.number, 1, r3.number, cols);
			r3.height = 16;
			r3.getCell(1).style = {
				font:      { name: FONT, size: 10, color: { argb: "FF546E7A" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
				alignment: { horizontal: "center", vertical: "middle" },
			};
			ws.addRow([]);
		};

		const styleHeaderRow = (row: import("exceljs").Row) => {
			row.height = 22;
			row.eachCell(cell => {
				cell.style = {
					font:      { name: FONT, size: 12, bold: true, color: { argb: "FFFFFFFF" } },
					fill:      { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } },
					alignment: { horizontal: "center", vertical: "middle" },
					border: {
						top:    { style: "thin", color: { argb: "FF546E7A" } },
						left:   { style: "thin", color: { argb: "FF546E7A" } },
						bottom: { style: "thin", color: { argb: "FF546E7A" } },
						right:  { style: "thin", color: { argb: "FF546E7A" } },
					},
				};
			});
		};

		const styleDataRow = (row: import("exceljs").Row, idx: number) => {
			const bg = idx % 2 === 0 ? "FFFFFFFF" : "FFF5F5F5";
			row.height = 18;
			row.eachCell({ includeEmpty: true }, cell => {
				cell.font   = { name: FONT, size: 11 };
				cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
				cell.border = {
					top:    { style: "thin", color: { argb: "FFB0BEC5" } },
					left:   { style: "thin", color: { argb: "FFB0BEC5" } },
					bottom: { style: "thin", color: { argb: "FFB0BEC5" } },
					right:  { style: "thin", color: { argb: "FFB0BEC5" } },
				};
			});
		};

		// ── Sheet 1: สรุปรายแผนก ──────────────────────────────────────────────────
		const ws1 = wb.addWorksheet("สรุปรายแผนก");
		ws1.columns = [
			{ width: 6  },   // #
			{ width: 32 },   // แผนก
			{ width: 14 },   // ครั้งที่เบิก
			{ width: 16 },   // จำนวนรวม (ชิ้น)
			{ width: 18 },   // มูลค่ารวม (฿)
		];
		addTitleBlock(ws1, "รายงานการเบิกพัสดุรายแผนก — สรุป", 5);

		const h1 = ws1.addRow(["#", "แผนก", "ครั้งที่เบิก", "จำนวนรวม (ชิ้น)", "มูลค่ารวม (฿)"]);
		styleHeaderRow(h1);

		data.groups.forEach((g, i) => {
			const row = ws1.addRow([
				i + 1,
				g.departmentName,
				g.requestCount,
				g.totalIssuedQty,
				g.totalValue > 0 ? g.totalValue : "-",
			]);
			styleDataRow(row, i);
			row.getCell(3).alignment = { horizontal: "center" };
			row.getCell(4).alignment = { horizontal: "right" };
			row.getCell(5).alignment = { horizontal: "right" };
			if (g.totalValue > 0) {
				row.getCell(5).numFmt = "#,##0.00";
				row.getCell(5).font  = { name: FONT, size: 11, bold: true };
			}
		});

		// Grand total row
		ws1.addRow([]);
		const totalRow = ws1.addRow([
			"",
			"รวมทั้งหมด",
			totalReqs,
			totalIssuedQty,
			grandTotal > 0 ? grandTotal : "-",
		]);
		totalRow.height = 20;
		totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
			cell.font = { name: FONT, size: 12, bold: true, color: { argb: "FF0D47A1" } };
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } };
			if (col >= 3) cell.alignment = { horizontal: col === 2 ? "left" : "right" };
		});
		if (grandTotal > 0) totalRow.getCell(5).numFmt = "#,##0.00";

		ws1.addRow([]);
		const f1 = ws1.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws1.mergeCells(f1.number, 1, f1.number, 5);
		f1.getCell(1).style = {
			font:      { name: FONT, size: 10, italic: true, color: { argb: "FF9E9E9E" } },
			alignment: { horizontal: "right" },
		};

		// ── Sheet 2: รายละเอียด Top Items ────────────────────────────────────────
		const ws2 = wb.addWorksheet("รายละเอียดพัสดุ");
		ws2.columns = [
			{ width: 32 },   // แผนก
			{ width: 14 },   // รหัสรายการ
			{ width: 40 },   // ชื่อพัสดุ
			{ width: 22 },   // หมวดหมู่
			{ width: 14 },   // จำนวนเบิก (ชิ้น)
			{ width: 10 },   // หน่วย
			{ width: 18 },   // มูลค่า (฿)
		];
		addTitleBlock(ws2, "รายงานการเบิกพัสดุรายแผนก — Top Items", 7);

		const h2 = ws2.addRow(["แผนก", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "จำนวนเบิก (ชิ้น)", "หน่วย", "มูลค่า (฿)"]);
		styleHeaderRow(h2);

		let rowIdx = 0;
		data.groups.forEach(g => {
			g.topItems.forEach(it => {
				const row = ws2.addRow([
					g.departmentName,
					it.itemCode,
					it.itemName,
					it.category,
					it.issuedQty,
					it.unit,
					it.value > 0 ? it.value : "-",
				]);
				styleDataRow(row, rowIdx++);
				row.getCell(5).alignment = { horizontal: "right" };
				row.getCell(7).alignment = { horizontal: "right" };
				if (it.value > 0) row.getCell(7).numFmt = "#,##0.00";
			});
		});

		ws2.addRow([]);
		const f2 = ws2.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws2.mergeCells(f2.number, 1, f2.number, 7);
		f2.getCell(1).style = {
			font:      { name: FONT, size: 10, italic: true, color: { argb: "FF9E9E9E" } },
			alignment: { horizontal: "right" },
		};

		// ── Download ──────────────────────────────────────────────────────────────
		const buf  = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href     = url;
		a.download = `รายงานการเบิกพัสดุรายแผนก_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			{/* ── Header bar ──────────────────────────────────────────────────── */}
			<div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow">
							<BarChart3 className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานการเบิกพัสดุรายแผนก</h1>
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
								onClick={handleCustomToggle}
								className={`h-9 px-3.5 rounded-lg text-xs font-semibold transition-colors ${
									useCustom
										? "bg-blue-600 text-white shadow-sm"
										: "bg-white border border-slate-300 text-slate-600 hover:bg-slate-50"
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
									className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
									<X className="w-3.5 h-3.5" />
									รีเซต
								</button>
							</>
						)}

						{/* Export buttons */}
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
					<div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100">
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<span>ช่วงเวลา</span>
							<span className="font-semibold text-slate-700">{periodLabel}</span>
						</div>
						<div className="w-px h-4 bg-slate-200" />
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<span>แผนก</span>
							<span className="font-semibold text-slate-700">{data?.totalDepts ?? 0} แผนก</span>
						</div>
						<div className="w-px h-4 bg-slate-200" />
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<span>คำขอเบิก</span>
							<span className="font-semibold text-slate-700">{totalReqs.toLocaleString()} ครั้ง</span>
						</div>
						<div className="w-px h-4 bg-slate-200" />
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<span>จำนวนรวม</span>
							<span className="font-semibold text-slate-700">{totalIssuedQty.toLocaleString()} ชิ้น</span>
						</div>
						<div className="w-px h-4 bg-slate-200" />
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<span>มูลค่ารวม</span>
							<span className="font-semibold text-blue-600">
								{grandTotal > 0 ? `฿${fmtBaht(grandTotal)}` : "ไม่มีข้อมูลราคา"}
							</span>
						</div>
					</div>

					{/* ── Department list ────────────────────────────────────────── */}
					<div className="relative">
						{loading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}

						{!loading && (!data || data.groups.length === 0) ? (
							<div className="flex flex-col items-center justify-center py-16 gap-2">
								<Inbox className="w-12 h-12 text-slate-200" />
								<p className="text-sm text-slate-400">ไม่พบข้อมูลในช่วงเวลาที่เลือก</p>
							</div>
						) : (
							<div className="divide-y divide-slate-100">
								{data?.groups.map((group, idx) => {
									const isExpanded = expanded.has(group.departmentId);
									const barVal = allValueZero ? group.totalIssuedQty : group.totalValue;
									const barPct = maxBarValue > 0 ? (barVal / maxBarValue) * 100 : 0;
									const rankColor  =
										idx === 0 ? "bg-amber-400 text-white" :
										idx === 1 ? "bg-slate-300 text-white" :
										idx === 2 ? "bg-orange-700 text-white" :
										"bg-slate-100 text-slate-500";

									return (
										<div key={group.departmentId}>
											{/* ── Department row ──────────────────── */}
											<button
												type="button"
												onClick={() => toggleDept(group.departmentId)}
												className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
											>
												{/* Rank */}
												<span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${rankColor}`}>
													{idx + 1}
												</span>

												{/* Name + bar */}
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-slate-800 truncate">{group.departmentName}</p>
													<div className="flex items-center gap-2 mt-1.5">
														<div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
															<div
																className="h-full bg-blue-500 rounded-full transition-all"
																style={{ width: `${barPct}%` }}
															/>
														</div>
														<span className="text-xs text-slate-400 shrink-0 tabular-nums">
															{group.requestCount} ครั้ง
														</span>
													</div>
												</div>

												{/* Totals */}
												<div className="text-right shrink-0 mr-2">
													<p className="text-sm font-semibold text-slate-800 tabular-nums">
														฿{fmtBaht(group.totalValue)}
													</p>
													<p className="text-xs text-slate-400 tabular-nums mt-0.5">
														{group.totalIssuedQty.toLocaleString()} ชิ้น
													</p>
												</div>

												{isExpanded
													? <ChevronUp   className="w-4 h-4 text-slate-400 shrink-0" />
													: <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
												}
											</button>

											{/* ── Top items table ─────────────────── */}
											{isExpanded && group.topItems.length > 0 && (
												<div className="border-t border-slate-100 overflow-x-auto">
													<table className="w-full text-sm min-w-[560px]">
														<thead className="bg-slate-50 border-b border-slate-100">
															<tr>
																<th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Top 5 พัสดุ</th>
																<th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">หมวดหมู่</th>
																<th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">จำนวนเบิก</th>
																<th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">หน่วย</th>
																<th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">มูลค่า (฿)</th>
															</tr>
														</thead>
														<tbody className="divide-y divide-slate-50 bg-white">
															{group.topItems.map(it => (
																<tr key={it.itemId} className="hover:bg-slate-50 transition-colors">
																	<td className="px-5 py-2.5">
																		<p className="text-sm text-slate-700 leading-snug truncate max-w-[260px]" title={it.itemName}>
																			{it.itemName}
																		</p>
																		<p className="text-xs text-slate-400 font-mono mt-0.5">{it.itemCode}</p>
																	</td>
																	<td className="px-5 py-2.5 text-sm text-slate-600">{it.category}</td>
																	<td className="px-5 py-2.5 text-right text-sm font-semibold text-blue-600 tabular-nums">
																		{it.issuedQty.toLocaleString()}
																	</td>
																	<td className="px-5 py-2.5 text-sm text-slate-600">{it.unit}</td>
																	<td className="px-5 py-2.5 text-right text-sm text-slate-700 tabular-nums">฿{fmtBaht(it.value)}</td>
																</tr>
															))}
														</tbody>
													</table>
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* ── Grand total footer ────────────────────────────────────── */}
					{data && data.groups.length > 0 && (
						<div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/60">
							<p className="text-xs text-slate-500">
								รวม <span className="font-semibold text-slate-700">{data.totalDepts}</span> แผนก
								&nbsp;·&nbsp;
								<span className="font-semibold text-slate-700">{totalReqs.toLocaleString()}</span> ครั้งที่เบิก
								&nbsp;·&nbsp;
								<span className="font-semibold text-slate-700">{totalIssuedQty.toLocaleString()}</span> ชิ้นรวม
							</p>
							<p className="text-sm font-bold text-slate-800 tabular-nums">
								{grandTotal > 0
									? <>มูลค่ารวม <span className="text-blue-600">฿{fmtBaht(grandTotal)}</span></>
									: <span className="text-xs text-slate-400 font-normal">ไม่มีข้อมูลราคา — เรียงตามจำนวนเบิก</span>
								}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* ── Footer ──────────────────────────────────────────────────────── */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานการเบิกพัสดุรายแผนก</p>
			</div>
		</div>
	);
}
