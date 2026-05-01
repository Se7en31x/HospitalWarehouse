"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, DollarSign, Search, RefreshCw, Clock, CalendarDays } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { fmtDateLong } from "@/utils/dateUtils";
import { getcategoriesOptions, getWarehousesOptions } from "@/services/itemsService";
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

// ── Dropdown ─────────────────────────────────────────────────────────────────

interface DropdownProps {
	dataAttr: string;
	value: string;
	options: string[];
	open: boolean;
	onToggle: () => void;
	onChange: (v: string) => void;
	minW?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ dataAttr, value, options, open, onToggle, onChange, minW = "min-w-[160px]" }) => (
	<div className="relative" {...{ [`data-${dataAttr}`]: "" }}>
		<button
			type="button"
			onClick={onToggle}
			className={`flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 text-sm bg-white shadow-sm hover:bg-slate-50 ${minW}`}
		>
			<span className="flex-1 text-left text-slate-700 truncate">{value}</span>
			<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
		</button>
		{open && (
			<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto" style={{ minWidth: "100%" }}>
				{options.map((o) => (
					<button key={o} type="button" onClick={() => onChange(o)}
						className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${value === o ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}>
						{o}
					</button>
				))}
			</div>
		)}
	</div>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValueItem {
	id: string;
	code: string;
	name: string;
	unit: string;
	currentStock: number;
	sellPrice: number;
	priceSource: "sell" | "cost" | "none";
	value: number;
}

interface ValueGroup {
	category: string;
	warehouse: string;
	items: ValueItem[];
	totalValue: number;
	totalStock: number;
}

interface ApiResponse {
	groups: ValueGroup[];
	grandTotal: number;
	totalItems: number;
	asOfDate?: string | null;
}

interface Props {
	onBack?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBaht(n: number): string {
	return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysAgo(n: number): string {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d.toISOString().split("T")[0];
}

function monthsAgo(n: number): string {
	const d = new Date();
	d.setMonth(d.getMonth() - n);
	return d.toISOString().split("T")[0];
}

const DATE_PRESETS = [
	{ key: "current", label: "ปัจจุบัน",       value: ""           },
	{ key: "1m",      label: "1 เดือนก่อน",    value: () => monthsAgo(1) },
	{ key: "3m",      label: "3 เดือนก่อน",    value: () => monthsAgo(3) },
	{ key: "6m",      label: "6 เดือนก่อน",    value: () => monthsAgo(6) },
	{ key: "1y",      label: "1 ปีก่อน",       value: () => monthsAgo(12) },
	{ key: "custom",  label: "กำหนดเอง",        value: ""           },
] as const;

type PresetKey = typeof DATE_PRESETS[number]["key"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryValueReportClient({ onBack }: Props) {
	const { profile } = useUser();

	const [data, setData]           = useState<ApiResponse | null>(null);
	const [loading, setLoading]     = useState(false);
	const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

	// Date preset state
	const [activePreset, setActivePreset] = useState<PresetKey>("current");
	const [customDate, setCustomDate]     = useState("");
	const asOfDate = activePreset === "current"
		? ""
		: activePreset === "custom"
			? customDate
			: (DATE_PRESETS.find(p => p.key === activePreset)?.value as (() => string) | undefined)?.() ?? "";

	// Filter state
	const [search, setSearch]                   = useState("");
	const [warehouseFilter, setWarehouseFilter] = useState("ทุกคลัง");
	const [categoryFilter, setCategoryFilter]   = useState("หมวดหมู่ทั้งหมด");
	const [isWhOpen, setIsWhOpen]   = useState(false);
	const [isCatOpen, setIsCatOpen] = useState(false);
	const [warehouseOptions, setWarehouseOptions] = useState<string[]>(["ทุกคลัง"]);
	const [categoryOptions, setCategoryOptions]   = useState<string[]>(["หมวดหมู่ทั้งหมด"]);

	const printDate = fmtDateLong(new Date());

	// Load dropdown options
	useEffect(() => {
		Promise.all([getcategoriesOptions(), getWarehousesOptions()])
			.then(([cats, whs]) => {
				setCategoryOptions(["หมวดหมู่ทั้งหมด", ...(cats?.map(c => c.name) ?? [])]);
				setWarehouseOptions(["ทุกคลัง",         ...(whs?.map(w => w.name)  ?? [])]);
			})
			.catch(() => {});
	}, []);

	// Close dropdowns on outside click
	useEffect(() => {
		if (!isWhOpen && !isCatOpen) return;
		const handler = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (!t.closest("[data-wh]"))  setIsWhOpen(false);
			if (!t.closest("[data-cat]")) setIsCatOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [isWhOpen, isCatOpen]);

	const fetchData = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (asOfDate) params.set("asOfDate", asOfDate);
			const res = await apiClient.get<ApiResponse>(`/v1/reports/inventory-value?${params}`);
			setData(res.data ?? null);
		} catch {
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [asOfDate]);

	useEffect(() => { fetchData(); }, [fetchData]);

	// Apply preset
	const applyPreset = (key: PresetKey) => {
		setActivePreset(key);
		setExpandedKeys(new Set()); // collapse all on date change
	};

	// Filtered groups (client-side)
	const filteredGroups = useMemo((): ValueGroup[] => {
		if (!data) return [];
		let groups = data.groups;

		if (warehouseFilter !== "ทุกคลัง") {
			groups = groups.filter(g => g.warehouse === warehouseFilter);
		}
		if (categoryFilter !== "หมวดหมู่ทั้งหมด") {
			groups = groups.filter(g => g.category === categoryFilter);
		}

		const kw = search.trim().toLowerCase();
		if (kw) {
			groups = groups
				.map(g => {
					const items = g.items.filter(it =>
						it.name.toLowerCase().includes(kw) || it.code.toLowerCase().includes(kw)
					);
					return {
						...g,
						items,
						totalValue: items.reduce((s, it) => s + it.value, 0),
						totalStock: items.reduce((s, it) => s + it.currentStock, 0),
					};
				})
				.filter(g => g.items.length > 0);
		}

		return groups;
	}, [data, warehouseFilter, categoryFilter, search]);

	const filteredGrandTotal = useMemo(() =>
		filteredGroups.reduce((s, g) => s + g.totalValue, 0), [filteredGroups]);
	const filteredTotalItems = useMemo(() =>
		filteredGroups.reduce((s, g) => s + g.items.length, 0), [filteredGroups]);

	const groupKey = (g: ValueGroup) => `${g.category}::${g.warehouse}`;

	const toggleGroup = (key: string) => {
		setExpandedKeys(prev => {
			const next = new Set(prev);
			next.has(key) ? next.delete(key) : next.add(key);
			return next;
		});
	};

	const allExpanded = filteredGroups.length > 0 && filteredGroups.every(g => expandedKeys.has(groupKey(g)));
	const toggleAll   = () => {
		setExpandedKeys(allExpanded ? new Set() : new Set(filteredGroups.map(groupKey)));
	};

	const hasFilter = warehouseFilter !== "ทุกคลัง" || categoryFilter !== "หมวดหมู่ทั้งหมด" || search.trim() !== "";
	const resetFilters = () => { setWarehouseFilter("ทุกคลัง"); setCategoryFilter("หมวดหมู่ทั้งหมด"); setSearch(""); };

	const isHistorical = activePreset !== "current";
	const asOfLabel    = asOfDate ? fmtDateLong(new Date(asOfDate)) : "";

	const handlePdf = () => {
		if (!data) return;
		const columns: PrintColumn[] = [
			{ header: "หมวดหมู่",   key: "category",     align: "left"   },
			{ header: "คลัง",       key: "warehouse",    align: "left"   },
			{ header: "ชื่อพัสดุ",  key: "name",         align: "left"   },
			{ header: "สต็อก",      key: "currentStock", align: "right"  },
			{ header: "หน่วย",      key: "unit",         align: "left"   },
			{ header: "ราคา/หน่วย", key: "sellPrice",    align: "right"  },
			{ header: "มูลค่ารวม",  key: "value",        align: "right"  },
		];
		const rows = filteredGroups.flatMap(g =>
			g.items.map(it => ({
				category:     g.category,
				warehouse:    g.warehouse,
				name:         it.name,
				currentStock: it.currentStock.toLocaleString(),
				unit:         it.unit,
				sellPrice:    fmtBaht(it.sellPrice),
				value:        fmtBaht(it.value),
			}))
		);
		printWarehouseReport({
			reportTitle:   isHistorical ? `รายงานมูลค่าสต็อก ณ ${asOfLabel}` : "รายงานมูลค่าสต็อกรวม (ปัจจุบัน)",
			filterSummary: `มูลค่ารวม ฿${fmtBaht(filteredGrandTotal)}`,
			columns,
			rows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
		});
	};

	const handleExportXlsx = async () => {
		if (!data) return;
		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		wb.creator = "HPK WMS";
		wb.created = new Date();

		const ws = wb.addWorksheet("รายงานมูลค่าสต็อก");
		const COLS = 7;

		ws.columns = [
			{ width: 20 }, { width: 16 }, { width: 14 },
			{ width: 36 }, { width: 12 }, { width: 16 }, { width: 18 },
		];

		const title = isHistorical ? `รายงานมูลค่าสต็อก ณ ${asOfLabel}` : "รายงานมูลค่าสต็อกรวม (ปัจจุบัน)";
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

		const r3 = ws.addRow([`สร้างวันที่: ${new Date().toLocaleDateString("th-TH")}    |    มูลค่ารวม: ฿${fmtBaht(filteredGrandTotal)}    |    ${filteredTotalItems} รายการ`]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 16;
		r3.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		ws.addRow([]);

		const hr = ws.addRow(["หมวดหมู่", "คลัง", "รหัสรายการ", "ชื่อพัสดุ", "สต็อก", "ราคา/หน่วย (฿)", "มูลค่ารวม (฿)"]);
		hr.height = 22;
		hr.eachCell((cell) => {
			cell.style = {
				font:      { name: "TH Sarabun New", size: 12, bold: true, color: { argb: "FFFFFFFF" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF37474F" } },
				alignment: { horizontal: "center", vertical: "middle" },
				border: {
					top: { style: "thin", color: { argb: "FF546E7A" } }, left: { style: "thin", color: { argb: "FF546E7A" } },
					bottom: { style: "thin", color: { argb: "FF546E7A" } }, right: { style: "thin", color: { argb: "FF546E7A" } },
				},
			};
		});

		let rowIdx = 0;
		filteredGroups.forEach((group) => {
			group.items.forEach((it) => {
				const dr = ws.addRow([group.category, group.warehouse, it.code, it.name, it.currentStock, it.sellPrice, it.value]);
				dr.height = 18;
				const rowBg = rowIdx % 2 === 0 ? "FFFFFFFF" : "FFF5F5F5";
				dr.eachCell({ includeEmpty: true }, (cell, col) => {
					cell.font = { name: "TH Sarabun New", size: 11 };
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
					cell.border = {
						top: { style: "thin", color: { argb: "FFB0BEC5" } }, left: { style: "thin", color: { argb: "FFB0BEC5" } },
						bottom: { style: "thin", color: { argb: "FFB0BEC5" } }, right: { style: "thin", color: { argb: "FFB0BEC5" } },
					};
					if (col === 5 || col === 6 || col === 7) {
						cell.alignment = { horizontal: "right" };
						cell.numFmt = col === 5 ? "#,##0" : "#,##0.00";
					}
					if (col === 7) {
						cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: "FF0D47A1" } };
					}
				});
				rowIdx++;
			});
			const subRow = ws.addRow(["", "", "", `รวม ${group.category} (${group.warehouse})`, group.totalStock, "", group.totalValue]);
			subRow.height = 18;
			subRow.eachCell({ includeEmpty: true }, (cell, col) => {
				cell.font = { name: "TH Sarabun New", size: 11, bold: true };
				cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F5E9" } };
				cell.border = {
					top: { style: "thin", color: { argb: "FF81C784" } }, left: { style: "thin", color: { argb: "FFB0BEC5" } },
					bottom: { style: "thin", color: { argb: "FF81C784" } }, right: { style: "thin", color: { argb: "FFB0BEC5" } },
				};
				if (col === 5 || col === 7) {
					cell.alignment = { horizontal: "right" };
					cell.numFmt = col === 5 ? "#,##0" : "#,##0.00";
					cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: "FF1B5E20" } };
				}
			});
		});

		ws.addRow([]);
		const totalRow = ws.addRow(["", "", "", "มูลค่าสต็อกรวมทั้งหมด", "", "", filteredGrandTotal]);
		totalRow.height = 24;
		ws.mergeCells(totalRow.number, 1, totalRow.number, 6);
		totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
			cell.font = { name: "TH Sarabun New", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D47A1" } };
			cell.alignment = { horizontal: "right" };
			if (col === 7) cell.numFmt = "#,##0.00";
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
		a.download = `รายงานมูลค่าสต็อก_${asOfDate || "ปัจจุบัน"}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			{/* ── Header bar ──────────────────────────────────────────────────── */}
			<div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow ${isHistorical ? "bg-amber-500" : "bg-blue-600"}`}>
							{isHistorical ? <Clock className="w-6 h-6 text-white" /> : <DollarSign className="w-6 h-6 text-white" />}
						</div>
						<div>
							<h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานมูลค่าคงคลัง</h1>
							<p className="text-sm text-slate-500 mt-0.5">
								ระบบบริหารคลังสินค้า HPK &nbsp;·&nbsp; พิมพ์วันที่ {printDate}
							</p>
							{/* Historical context badge */}
							{isHistorical && asOfDate && (
								<div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-semibold">
									<CalendarDays className="w-3.5 h-3.5" />
									ข้อมูล ณ วันที่ {asOfLabel}
								</div>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={fetchData}
							disabled={loading}
							className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50 transition-colors"
						>
							<RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
							รีเฟรช
						</button>
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
			<div className="flex-1 px-8 py-6 space-y-5">

				{/* ── Summary cards ─────────────────────────────────────────── */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{/* Grand total */}
					<div className={`border rounded-xl p-5 shadow-sm ${isHistorical ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
						<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">มูลค่าคงคลังรวม</p>
						{isHistorical && asOfDate && (
							<p className="text-[11px] text-amber-600 mb-2 font-medium">ณ {asOfLabel}</p>
						)}
						<p className={`text-3xl font-bold tabular-nums ${isHistorical ? "text-amber-700" : "text-blue-600"}`}>
							฿{fmtBaht(filteredGrandTotal)}
						</p>
						{hasFilter && data && (
							<p className="text-xs text-slate-400 mt-1">กรองแล้ว · ทั้งหมด ฿{fmtBaht(data.grandTotal)}</p>
						)}
					</div>
					{/* Item count */}
					<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
						<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">รายการพัสดุ</p>
						<p className="text-2xl font-bold text-slate-700 tabular-nums">
							{filteredTotalItems.toLocaleString()}
						</p>
						<p className="text-xs text-slate-400 mt-1">รายการ</p>
					</div>
					{/* Group count */}
					<div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
						<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">จำนวนหมวดหมู่</p>
						<p className="text-2xl font-bold text-slate-700 tabular-nums">
							{filteredGroups.length.toLocaleString()}
						</p>
						<p className="text-xs text-slate-400 mt-1">หมวด</p>
					</div>
				</div>

				{/* ── Card wrapper ───────────────────────────────────────────── */}
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* ── Toolbar row 1: Date preset ─────────────────────────── */}
					<div className="flex flex-wrap items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50/40">
						<span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1.5">
							<CalendarDays className="w-3.5 h-3.5" />
							ดูข้อมูล ณ วันที่:
						</span>
						{DATE_PRESETS.map(p => (
							<button
								key={p.key}
								type="button"
								onClick={() => applyPreset(p.key)}
								className={`px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${
									activePreset === p.key
										? "bg-blue-600 text-white shadow-sm"
										: "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
								}`}
							>
								{p.label}
							</button>
						))}
						{activePreset === "custom" && (
							<div className="ml-1">
								<OutlinedDateField
									label="ระบุวันที่"
									value={customDate}
									onChange={setCustomDate}
								/>
							</div>
						)}
					</div>

					{/* ── Toolbar row 2: Search + Filters + Actions ──────────── */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหาชื่อ/รหัสรายการ..."
								value={search}
								onChange={e => setSearch(e.target.value)}
								className="h-10 pl-9 pr-3 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
							/>
						</div>

						<Dropdown
							dataAttr="wh"
							value={warehouseFilter}
							options={warehouseOptions}
							open={isWhOpen}
							onToggle={() => { setIsWhOpen(v => !v); setIsCatOpen(false); }}
							onChange={v => { setWarehouseFilter(v); setIsWhOpen(false); }}
							minW="min-w-[140px]"
						/>
						<Dropdown
							dataAttr="cat"
							value={categoryFilter}
							options={categoryOptions}
							open={isCatOpen}
							onToggle={() => { setIsCatOpen(v => !v); setIsWhOpen(false); }}
							onChange={v => { setCategoryFilter(v); setIsCatOpen(false); }}
							minW="min-w-[160px]"
						/>

						{hasFilter && (
							<button
								type="button"
								onClick={resetFilters}
								className="h-10 px-3 text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
							>
								ล้างตัวกรอง
							</button>
						)}

						<div className="ml-auto flex items-center gap-2">
							{filteredGroups.length > 0 && (
								<button
									type="button"
									onClick={toggleAll}
									className="h-10 px-3 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
								>
									{allExpanded ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}
								</button>
							)}
							<button type="button" title="Export PDF" onClick={handlePdf} disabled={!data}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm disabled:opacity-40">
								<PdfIcon />
							</button>
							<button type="button" title="Export Excel (.xlsx)" onClick={() => void handleExportXlsx()} disabled={!data}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm disabled:opacity-40">
								<XlsxIcon />
							</button>
						</div>
					</div>

					{/* Row count strip */}
					<div className="flex flex-wrap items-center gap-4 px-5 py-2.5 bg-white border-b border-slate-100">
						<span className="text-xs text-slate-500">
							แสดง{" "}
							<span className="font-semibold text-slate-700">{filteredGroups.length}</span> หมวดหมู่
							{" "}·{" "}
							<span className="font-semibold text-slate-700">{filteredTotalItems.toLocaleString()}</span> รายการ
						</span>
						{isHistorical && (
							<span className="text-xs text-amber-600 font-medium flex items-center gap-1">
								<Clock className="w-3 h-3" />
								สต็อกคำนวณย้อนหลังจาก stock movement
							</span>
						)}
						<span className="text-xs text-slate-400">
							ราคาอ้างอิง: ราคาขาย → ราคาต้นทุนล่าสุด
						</span>
					</div>

					{/* Groups */}
					{loading ? (
						<div className="flex items-center justify-center py-16">
							<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
						</div>
					) : filteredGroups.length === 0 ? (
						<div className="py-16 text-center">
							<DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-2" />
							<p className="text-sm text-slate-400">{data ? "ไม่พบข้อมูลตามเงื่อนไขที่กรอง" : "ไม่พบข้อมูล"}</p>
						</div>
					) : (
						<div className="divide-y divide-slate-100">
							{filteredGroups.map(group => {
								const key      = groupKey(group);
								const expanded = expandedKeys.has(key);
								const pct      = filteredGrandTotal > 0 ? (group.totalValue / filteredGrandTotal) * 100 : 0;
								return (
									<div key={key}>
										{/* Group header */}
										<button
											type="button"
											onClick={() => toggleGroup(key)}
											className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
										>
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2 flex-wrap mb-1.5">
													<span className="font-semibold text-slate-800">{group.category}</span>
													{group.warehouse && (
														<span className="text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
															{group.warehouse}
														</span>
													)}
													<span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
														{group.items.length} รายการ
													</span>
												</div>
												<div className="flex items-center gap-2">
													<div className="flex-1 max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden">
														<div
															className={`h-full rounded-full transition-all ${isHistorical ? "bg-amber-400" : "bg-blue-500"}`}
															style={{ width: `${Math.min(pct, 100)}%` }}
														/>
													</div>
													<span className="text-xs text-slate-400 tabular-nums shrink-0">{pct.toFixed(1)}%</span>
												</div>
											</div>
											<div className="flex items-center gap-6 shrink-0">
												<div className="text-right">
													<p className="text-xs font-medium text-slate-400 mb-0.5">สต็อกรวม</p>
													<p className="font-bold text-slate-700 tabular-nums">{group.totalStock.toLocaleString()}</p>
												</div>
												<div className="text-right">
													<p className="text-xs font-medium text-slate-400 mb-0.5">มูลค่ารวม</p>
													<p className={`font-bold tabular-nums ${isHistorical ? "text-amber-700" : "text-blue-600"}`}>
														฿{fmtBaht(group.totalValue)}
													</p>
												</div>
												{expanded
													? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
													: <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
											</div>
										</button>

										{/* Items table */}
										{expanded && (
											<div className="overflow-x-auto border-t border-slate-100 bg-slate-50/30">
												<table className="w-full text-sm min-w-[560px]">
													<colgroup>
														<col />
														<col className="w-[90px]" />
														<col className="w-[64px]" />
														<col className="w-[120px]" />
														<col className="w-[130px]" />
													</colgroup>
													<thead>
														<tr className="border-b border-slate-200">
															<th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">ชื่อพัสดุ</th>
															<th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">สต็อก</th>
															<th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">หน่วย</th>
															<th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ราคา/หน่วย (฿)</th>
															<th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">มูลค่ารวม (฿)</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-slate-100">
														{group.items.map(it => (
															<tr key={it.id} className="bg-white hover:bg-blue-50/30 transition-colors">
																<td className="px-5 py-3">
																	<p className="font-medium text-slate-800 leading-snug">{it.name}</p>
																	<div className="flex items-center gap-1.5 mt-0.5">
																		<p className="text-xs text-slate-400 font-mono">{it.code}</p>
																		{it.priceSource === "cost" && (
																			<span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 rounded-full">ราคาต้นทุน</span>
																		)}
																		{it.priceSource === "none" && (
																			<span className="text-[10px] font-semibold text-red-500 bg-red-50 border border-red-200 px-1.5 rounded-full">ไม่มีราคา</span>
																		)}
																	</div>
																</td>
																<td className="px-5 py-3 text-right font-bold tabular-nums text-slate-700">{it.currentStock.toLocaleString()}</td>
																<td className="px-5 py-3 text-xs text-slate-500">{it.unit}</td>
																<td className="px-5 py-3 text-right tabular-nums text-slate-600">
																	{it.priceSource === "none"
																		? <span className="text-xs text-slate-300">-</span>
																		: fmtBaht(it.sellPrice)
																	}
																</td>
																<td className="px-5 py-3 text-right font-bold tabular-nums">
																	{it.value > 0
																		? <span className={isHistorical ? "text-amber-700" : "text-blue-600"}>฿{fmtBaht(it.value)}</span>
																		: <span className="text-slate-300 font-normal">฿0.00</span>
																	}
																</td>
															</tr>
														))}
													</tbody>
													<tfoot>
														<tr className="bg-emerald-50 border-t border-emerald-200">
															<td colSpan={4} className="px-5 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">
																รวม {group.category}
															</td>
															<td className="px-5 py-2.5 text-right font-bold tabular-nums text-emerald-700">฿{fmtBaht(group.totalValue)}</td>
														</tr>
													</tfoot>
												</table>
											</div>
										)}
									</div>
								);
							})}

							{/* Grand total row */}
							<div className={`flex items-center justify-between px-5 py-4 border-t ${isHistorical ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100"}`}>
								<div>
									<span className={`text-sm font-bold ${isHistorical ? "text-amber-800" : "text-blue-800"}`}>
										มูลค่าคงคลังรวมทั้งหมด
									</span>
									{isHistorical && asOfDate && (
										<span className="ml-2 text-xs text-amber-600">ณ {asOfLabel}</span>
									)}
									{hasFilter && (
										<span className="ml-2 text-xs text-slate-400">(ผลลัพธ์ที่กรอง)</span>
									)}
								</div>
								<span className={`text-xl font-black tabular-nums ${isHistorical ? "text-amber-700" : "text-blue-700"}`}>
									฿{fmtBaht(filteredGrandTotal)}
								</span>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ── Footer ──────────────────────────────────────────────────────── */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">
					HPK Warehouse Management System &nbsp;·&nbsp; รายงานมูลค่าคงคลัง
					{isHistorical && asOfDate && <> &nbsp;·&nbsp; ณ {asOfLabel}</>}
				</p>
			</div>
		</div>
	);
}
