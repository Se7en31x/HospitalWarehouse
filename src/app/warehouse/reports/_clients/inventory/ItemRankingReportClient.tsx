"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Package } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { getcategoriesOptions } from "@/services/itemsService";
import type * as Item from "@/types/items_type";
import { useUser } from "@/context/UserContext";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { fmtDateLong } from "@/utils/dateUtils";
import { OutlinedDateField } from "../../_components/OutlinedDateField";
import { ReportDetailPageHeader } from "../../_components/ReportDetailPageHeader";
import { REPORT_HEADER, SECTION_TAB_ACTIVE } from "../../_components/reportHeaderTheme";

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

interface RankingItem {
	rank: number;
	itemId: string;
	code: string;
	name: string;
	category: string;
	warehouse: string;
	unit: string;
	lotCount: number;
	currentStock: number;
	issuedQty?: number;
	requestCount?: number;
	minStock?: number;
}

interface ApiResponse {
	items: RankingItem[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

interface Props {
	onBack?: () => void;
}

type Mode = "issued" | "stock";

const ITEMS_PER_PAGE = 20;

function today(): string {
	return new Date().toISOString().split("T")[0];
}

function startOfYear(): string {
	return `${new Date().getFullYear()}-01-01`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ItemRankingReportClient({ onBack }: Props) {
	const { profile } = useUser();

	const [mode, setMode]             = useState<Mode>("issued");
	const [rows, setRows]             = useState<RankingItem[]>([]);
	const [total, setTotal]           = useState(0);
	const [page, setPage]             = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading]       = useState(false);

	const [dateFrom, setDateFrom]     = useState(startOfYear());
	const [dateTo, setDateTo]         = useState(today());
	const [categoryId, setCategoryId] = useState("");
	const [categories, setCategories] = useState<Item.categoryOptions>([]);

	const printDate = fmtDateLong(new Date());

	useEffect(() => {
		getcategoriesOptions()
			.then(setCategories)
			.catch(() => setCategories([]));
	}, []);

	const fetchData = useCallback(async (p: number) => {
		setLoading(true);
		try {
			const params = new URLSearchParams({
				mode,
				page:  String(p),
				limit: String(ITEMS_PER_PAGE),
				...(mode === "issued" ? { dateFrom, dateTo } : {}),
				...(categoryId ? { categoryId } : {}),
			});
			const res = await apiClient.get<ApiResponse>(`/v1/reports/item-ranking?${params}`);
			setRows(res.data?.items ?? []);
			setTotal(res.data?.total ?? 0);
			setTotalPages(res.data?.totalPages ?? 1);
		} catch {
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [mode, dateFrom, dateTo, categoryId]);

	useEffect(() => {
		setPage(1);
		fetchData(1);
	}, [mode, dateFrom, dateTo, categoryId, fetchData]);

	const handlePdf = () => {
		const isIssued = mode === "issued";
		const columns: PrintColumn[] = [
			{ header: "อันดับ",    key: "rank",         align: "center" },
			{ header: "รหัสรายการ", key: "code",         align: "left"   },
			{ header: "ชื่อพัสดุ", key: "name",         align: "left"   },
			{ header: "หมวดหมู่",  key: "category",     align: "left"   },
			{ header: "คลัง",      key: "warehouse",    align: "left"   },
			{ header: "จำนวน Lot", key: "lotCount",     align: "center" },
			{ header: isIssued ? "จำนวนเบิก" : "สต็อกคงเหลือ",
				key: isIssued ? "issuedQty" : "currentStock", align: "right" },
			{ header: "หน่วย",     key: "unit",         align: "left"   },
		];
		const title = isIssued
			? "รายงานอันดับพัสดุที่เบิกใช้มากสุด"
			: "รายงานอันดับพัสดุที่มีสต็อกคงเหลือมากสุด";
		printWarehouseReport({
			reportTitle: title,
			period: isIssued ? `${dateFrom} – ${dateTo}` : undefined,
			filterSummary: categoryId
				? `หมวดหมู่: ${categories.find((c) => c.id === categoryId)?.name ?? categoryId}`
				: undefined,
			columns,
			rows: rows.map(r => ({ ...r })),
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
		});
	};

	const handleExportXlsx = async () => {
		const isIssued = mode === "issued";

		// Fetch all rows for export
		let allRows: RankingItem[] = rows;
		try {
			const params = new URLSearchParams({
				mode, page: "1", limit: "1000",
				...(isIssued ? { dateFrom, dateTo } : {}),
				...(categoryId ? { categoryId } : {}),
			});
			const res = await apiClient.get<ApiResponse>(`/v1/reports/item-ranking?${params}`);
			allRows = res.data?.items ?? rows;
		} catch { /* fallback to current page */ }

		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		wb.creator = "HPK WMS";
		wb.created = new Date();

		const ws = wb.addWorksheet("รายงานอันดับสินค้า");
		const COLS = isIssued ? 8 : 7;

		ws.columns = isIssued
			? [{ width: 8 }, { width: 14 }, { width: 32 }, { width: 18 }, { width: 18 }, { width: 10 }, { width: 14 }, { width: 10 }, { width: 10 }]
			: [{ width: 8 }, { width: 14 }, { width: 32 }, { width: 18 }, { width: 18 }, { width: 10 }, { width: 14 }, { width: 10 }];

		const title = isIssued ? "รายงานอันดับพัสดุที่เบิกใช้มากสุด" : "รายงานอันดับพัสดุที่มีสต็อกคงเหลือมากสุด";

		const r1 = ws.addRow([title]);
		ws.mergeCells(r1.number, 1, r1.number, COLS);
		r1.height = 28;
		r1.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 16, bold: true, color: { argb: "FF0D47A1" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r2 = ws.addRow(["ระบบบริหารคลังสินค้า HPK"]);
		ws.mergeCells(r2.number, 1, r2.number, COLS);
		r2.height = 18;
		r2.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 11, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const metaParts = [
			`วันที่สร้าง: ${new Date().toLocaleDateString("th-TH")}`,
			isIssued ? `ช่วงเวลา: ${dateFrom} ถึง ${dateTo}` : null,
			categoryId ? `หมวดหมู่: ${categories.find((c) => c.id === categoryId)?.name ?? ""}` : null,
			`รวม ${allRows.length} รายการ`,
		].filter(Boolean).join("    |    ");

		const r3 = ws.addRow([metaParts]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 16;
		r3.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		ws.addRow([]);

		const headers = isIssued
			? ["อันดับ", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "คลัง", "หน่วย", "Lot", "จำนวนเบิก", "ครั้ง"]
			: ["อันดับ", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "คลัง", "หน่วย", "Lot", "สต็อก"];
		const hr = ws.addRow(headers);
		hr.height = 22;
		hr.eachCell((cell) => {
			cell.style = {
				font:      { name: "TH Sarabun New", size: 12, bold: true, color: { argb: "FFFFFFFF" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF37474F" } },
				alignment: { horizontal: "center", vertical: "middle" },
				border: {
					top:    { style: "thin", color: { argb: "FF546E7A" } },
					left:   { style: "thin", color: { argb: "FF546E7A" } },
					bottom: { style: "thin", color: { argb: "FF546E7A" } },
					right:  { style: "thin", color: { argb: "FF546E7A" } },
				},
			};
		});

		allRows.forEach((row, i) => {
			const dr = isIssued
				? ws.addRow([row.rank, row.code, row.name, row.category, row.warehouse, row.unit, row.lotCount, row.issuedQty ?? 0, row.requestCount ?? 0])
				: ws.addRow([row.rank, row.code, row.name, row.category, row.warehouse, row.unit, row.lotCount, row.currentStock]);
			dr.height = 18;
			const rowBg = i % 2 === 0 ? "FFFFFFFF" : "FFF5F5F5";
			dr.eachCell({ includeEmpty: true }, (cell, col) => {
				cell.font = { name: "TH Sarabun New", size: 11 };
				cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
				cell.border = {
					top:    { style: "thin", color: { argb: "FFB0BEC5" } },
					left:   { style: "thin", color: { argb: "FFB0BEC5" } },
					bottom: { style: "thin", color: { argb: "FFB0BEC5" } },
					right:  { style: "thin", color: { argb: "FFB0BEC5" } },
				};
				if (col === 1) cell.alignment = { horizontal: "center" };
				if (col >= 8) { cell.alignment = { horizontal: "right" }; cell.font = { name: "TH Sarabun New", size: 11, bold: true }; }
			});
		});

		ws.addRow([]);
		const fr = ws.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws.mergeCells(fr.number, 1, fr.number, COLS);
		fr.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, italic: true, color: { argb: "FF9E9E9E" } },
			alignment: { horizontal: "right" },
		};

		const buf  = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href = url;
		a.download = `รายงานอันดับสินค้า_${mode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const isIssued = mode === "issued";

	const modeTabs: { id: Mode; label: string; icon: React.ReactNode }[] = [
		{ id: "issued", label: "เบิกใช้มากสุด",       icon: <TrendingUp className="w-4 h-4" /> },
		{ id: "stock",  label: "สต็อกคงเหลือมากสุด", icon: <Package className="w-4 h-4" />   },
	];

	const tabActiveCls = SECTION_TAB_ACTIVE[REPORT_HEADER["item-ranking"].section];

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			<ReportDetailPageHeader
				reportPage="item-ranking"
				title="รายงานอันดับสินค้า"
				subtitle={`ระบบบริหารคลังสินค้า HPK · พิมพ์วันที่ ${printDate}`}
				onBack={onBack}
			>
				<div className="flex gap-1 mt-5">
					{modeTabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setMode(tab.id)}
							className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${
								mode === tab.id
									? tabActiveCls
									: "bg-white text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
							}`}
						>
							{tab.icon}
							{tab.label}
						</button>
					))}
				</div>
			</ReportDetailPageHeader>

			{/* ── Content ──────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">

				{/* ── Table card ────────────────────────────────────────────── */}
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* Toolbar — filters + export */}
					<div className="flex flex-wrap gap-3 items-end px-5 py-4 border-b border-slate-100 bg-slate-50/60">

						{/* Date range (issued mode only) */}
						{isIssued && (
							<div className="flex items-center gap-3">
								<OutlinedDateField label="วันที่เริ่มต้น" value={dateFrom} onChange={setDateFrom} />
								<OutlinedDateField label="วันที่สิ้นสุด"  value={dateTo}   onChange={setDateTo} />
							</div>
						)}

						{/* Category — server filter (categoryId UUID) */}
						<div className="flex flex-col gap-1 min-w-[200px]">
							<span className="text-[11px] font-medium text-slate-500">หมวดหมู่</span>
							<select
								value={categoryId}
								onChange={(e) => setCategoryId(e.target.value)}
								className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 max-w-[min(100%,280px)] focus:outline-none focus:ring-2 focus:ring-blue-200"
							>
								<option value="">ทุกหมวดหมู่</option>
								{categories.map((c) => (
									<option key={c.id} value={c.id}>{c.name}</option>
								))}
							</select>
						</div>

						{/* Export buttons */}
						<div className="ml-auto flex items-center gap-2">
							<button type="button" title="Export PDF" onClick={handlePdf}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
								<PdfIcon />
							</button>
							<button type="button" title="Export Excel (.xlsx)" onClick={() => void handleExportXlsx()}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
								<XlsxIcon />
							</button>
						</div>
					</div>

					{/* Row count strip */}
					<div className="flex items-center gap-6 px-5 py-2.5 bg-white border-b border-slate-100">
						<span className="text-xs text-slate-500">
							พบ <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> รายการ
							{isIssued && (
								<span className="ml-1.5 text-slate-400">· {dateFrom} ถึง {dateTo}</span>
							)}
							{categoryId && (
								<span className="ml-1.5 text-slate-400">
									· หมวด: {categories.find((c) => c.id === categoryId)?.name ?? "—"}
								</span>
							)}
						</span>
					</div>

					{/* Table */}
					<div className="relative w-full overflow-x-auto">
						{loading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
					<table className="w-full table-fixed text-sm text-left min-w-[880px]">
						<colgroup>
							{isIssued ? (
								<>
									<col className="w-14" />
									<col className="w-[7.5rem]" />
									<col className="w-[26%]" />
									<col className="w-[18%]" />
									<col className="w-14" />
									<col className="w-[5.5rem]" />
									<col className="w-[4.5rem]" />
									<col className="w-[5rem]" />
								</>
							) : (
								<>
									<col className="w-14" />
									<col className="w-[7.5rem]" />
									<col className="w-[30%]" />
									<col className="w-[20%]" />
									<col className="w-14" />
									<col className="w-[6rem]" />
									<col className="w-[5.5rem]" />
								</>
							)}
						</colgroup>
						<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
							<tr>
								<th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">อันดับ</th>
								<th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">รหัสรายการ</th>
								<th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ชื่อพัสดุ</th>
								<th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หมวดหมู่</th>
								<th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">Lot</th>
								{isIssued ? (
									<>
										<th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">จำนวนเบิก</th>
										<th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ครั้ง</th>
									</>
								) : (
									<th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">สต็อก</th>
								)}
								<th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หน่วย</th>
							</tr>
						</thead>
						<tbody className="text-slate-600 divide-y divide-slate-100">
							{!loading && rows.length === 0 ? (
								<tr>
									<td colSpan={isIssued ? 8 : 7} className="text-center py-16">
										<TrendingUp className="w-10 h-10 text-slate-200 mx-auto mb-2" />
										<p className="text-sm text-slate-400">ไม่พบข้อมูล</p>
									</td>
								</tr>
							) : rows.map((row) => (
								<tr key={row.itemId} className="bg-white hover:bg-slate-50 transition-colors">
									<td className="px-3 py-3 text-center">
										{row.rank === 1 ? (
											<span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white bg-amber-400 shadow-sm">1</span>
										) : row.rank === 2 ? (
											<span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white bg-slate-400 shadow-sm">2</span>
										) : row.rank === 3 ? (
											<span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black text-white bg-amber-700 shadow-sm">3</span>
										) : (
											<span className="text-slate-400 text-sm tabular-nums">{row.rank}</span>
										)}
									</td>
									<td className="px-3 py-3 font-mono text-xs text-slate-500 truncate min-w-0" title={row.code}>{row.code}</td>
									<td className="px-3 py-3 font-medium text-slate-800 min-w-0" title={row.name}>
										<span className="block truncate">{row.name}</span>
									</td>
									<td className="px-3 py-3 text-xs text-slate-500 truncate min-w-0" title={row.category}>{row.category}</td>
									<td className="px-3 py-3 text-center text-slate-600">{row.lotCount}</td>
									{isIssued ? (
										<>
											<td className="px-3 py-3 text-right font-bold text-blue-600 tabular-nums">{(row.issuedQty ?? 0).toLocaleString()}</td>
											<td className="px-3 py-3 text-center text-slate-500 tabular-nums">{row.requestCount ?? 0}</td>
										</>
									) : (
										<td className="px-3 py-3 text-right font-bold text-teal-600 tabular-nums">{row.currentStock.toLocaleString()}</td>
									)}
									<td className="px-3 py-3 text-xs text-slate-500">{row.unit}</td>
								</tr>
							))}
						</tbody>
					</table>
					</div>

					{/* Pagination */}
					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-xs text-slate-500">ทั้งหมด <span className="font-semibold text-slate-700">{total.toLocaleString()}</span> รายการ</p>
						{totalPages > 1 && (
							<div className="flex items-center gap-2">
								<button
									type="button"
									disabled={page <= 1}
									onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors"
								>
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs font-medium px-2 text-slate-600">หน้า {page} / {totalPages}</span>
								<button
									type="button"
									disabled={page >= totalPages}
									onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
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
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานอันดับสินค้า</p>
			</div>
		</div>
	);
}
