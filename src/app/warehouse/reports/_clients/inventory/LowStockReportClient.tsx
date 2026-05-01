"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Package,
	AlertTriangle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Search,
	X,
	FileText,
	RefreshCw,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { getcategoriesOptions, getWarehousesOptions } from "@/services/itemsService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";
import { fmtDate, fmtDateLong } from "@/utils/dateUtils";
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

interface LowStockReportClientProps {
	onBack?: () => void;
	initialItems?: unknown[];
}

interface LowStockItem {
	id: string;
	code: string;
	name: string;
	type: string;
	category: string;
	warehouse: string;
	unit: string;
	availableStock: number;
	currentStock: number;
	minStock: number;
	shortfall: number;
	hasLots: boolean;
	createdAt: string | null;
}

interface LowStockApiResponse {
	items: LowStockItem[];
	total: number;
}

interface NearExpiryRow {
	id: string;
	lotCode: string;
	itemCode: string;
	itemName: string;
	warehouse: string;
	quantity: number;
	unit: string;
	expiredAt: string | null;
	daysLeft: number | null;
}

interface NearExpiryApiResponse {
	items: NearExpiryRow[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

type ActiveTab = "low-stock" | "near-expiry";

const ITEMS_PER_PAGE = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

const getUrgencyLabel = (daysLeft: number | null) =>
	daysLeft === null ? "ไม่ระบุ" : `อีก ${daysLeft} วัน`;

const getUrgencyColor = (daysLeft: number | null) => {
	if (daysLeft === null) return "bg-slate-100 text-slate-600";
	if (daysLeft <= 30) return "bg-red-100 text-red-700";
	if (daysLeft <= 60) return "bg-orange-100 text-orange-700";
	return "bg-yellow-100 text-yellow-700";
};

// ── Dropdown ──────────────────────────────────────────────────────────────────

interface DropdownProps {
	dataAttr: string;
	value: string;
	options: string[];
	open: boolean;
	onToggle: () => void;
	onChange: (v: string) => void;
	icon?: React.ReactNode;
	minW?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ dataAttr, value, options, open, onToggle, onChange, icon, minW = "min-w-[160px]" }) => (
	<div className="relative" {...{ [`data-${dataAttr}`]: "" }}>
		<button
			type="button"
			onClick={onToggle}
			className={`flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 text-sm bg-white shadow-sm hover:bg-slate-50 ${minW}`}
		>
			{icon && <span className="text-slate-400">{icon}</span>}
			<span className="flex-1 text-left text-slate-700">{value}</span>
			<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
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


// ── Main Component ────────────────────────────────────────────────────────────

const LowStockReportClient: React.FC<LowStockReportClientProps> = ({ onBack }) => {
	const [activeTab, setActiveTab] = useState<ActiveTab>("low-stock");

	// Shared date range (used by both tabs)
	const now = new Date();
	const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`);
	const [dateTo, setDateTo] = useState(now.toISOString().split("T")[0]);

	// Shared option lists
	const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
	const [warehouseOptions, setWarehouseOptions] = useState<string[]>([]);

	useEffect(() => {
		Promise.all([getcategoriesOptions(), getWarehousesOptions()]).then(([cats, whs]) => {
			setCategoryOptions(["หมวดหมู่ทั้งหมด", ...(cats?.map((c) => c.name) ?? [])]);
			setWarehouseOptions(["ทุกคลัง", ...(whs?.map((w) => w.name) ?? [])]);
		}).catch(() => {
			setCategoryOptions(["หมวดหมู่ทั้งหมด"]);
			setWarehouseOptions(["ทุกคลัง"]);
		});
	}, []);

	// ── Low Stock ──────────────────────────────────────────────────────────────
	const [lsRows, setLsRows] = useState<LowStockItem[]>([]);
	const [lsFetching, setLsFetching] = useState(true);
	const [lsSearch, setLsSearch] = useState("");
	const [lsCategory, setLsCategory] = useState("หมวดหมู่ทั้งหมด");
	const [lsWarehouse, setLsWarehouse] = useState("ทุกคลัง");
	const [lsPage, setLsPage] = useState(1);
	const [isCatOpen, setIsCatOpen] = useState(false);
	const [isLsWhOpen, setIsLsWhOpen] = useState(false);

	const loadLowStock = useCallback(async () => {
		setLsFetching(true);
		try {
			const params = new URLSearchParams();
			if (dateFrom) params.set("dateFrom", dateFrom);
			if (dateTo) params.set("dateTo", dateTo);
			const res = await apiClient.get<LowStockApiResponse>(`/v1/reports/low-stock?${params}`);
			setLsRows((res.data as LowStockApiResponse).items ?? []);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสต็อกต่ำ");
			setLsRows([]);
		} finally {
			setLsFetching(false);
		}
	}, [dateFrom, dateTo]);

	useEffect(() => { loadLowStock(); }, [loadLowStock]);

	const lsFiltered = useMemo(() => {
		const kw = lsSearch.trim().toLowerCase();
		return lsRows.filter((item) => {
			const matchKw = !kw || item.code.toLowerCase().includes(kw) || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
			const matchCat = lsCategory === "หมวดหมู่ทั้งหมด" || item.category === lsCategory;
			const matchWh = lsWarehouse === "ทุกคลัง" || item.warehouse === lsWarehouse;
			return matchKw && matchCat && matchWh;
		});
	}, [lsRows, lsSearch, lsCategory, lsWarehouse]);

	const lsTotalPages = Math.max(1, Math.ceil(lsFiltered.length / ITEMS_PER_PAGE));
	const lsPageItems = useMemo(() => {
		const s = (lsPage - 1) * ITEMS_PER_PAGE;
		return lsFiltered.slice(s, s + ITEMS_PER_PAGE);
	}, [lsFiltered, lsPage]);

	useEffect(() => { setLsPage(1); }, [lsSearch, lsCategory, lsWarehouse, dateFrom, dateTo]);

	// ── Near Expiry ────────────────────────────────────────────────────────────
	const [neRows, setNeRows] = useState<NearExpiryRow[]>([]);
	const [neFetching, setNeFetching] = useState(false);
	const [neFetched, setNeFetched] = useState(false);
	const [neSearch, setNeSearch] = useState("");
	const [neDays, setNeDays] = useState<"90" | "60" | "30">("60");
	const [neWarehouse, setNeWarehouse] = useState("ทุกคลัง");
	const [nePage, setNePage] = useState(1);
	const [isDaysOpen, setIsDaysOpen] = useState(false);
	const [isNeWhOpen, setIsNeWhOpen] = useState(false);

	const loadNearExpiry = useCallback(async () => {
		setNeFetching(true);
		try {
			const res = await apiClient.get<NearExpiryApiResponse>("/v1/reports/near-expiry", {
				params: { limit: 10, daysAhead: neDays },
			});
			setNeRows((res.data as NearExpiryApiResponse).items ?? []);
			setNeFetched(true);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้าใกล้หมดอายุ");
			setNeRows([]);
		} finally {
			setNeFetching(false);
		}
	}, [neDays]);

	useEffect(() => {
		if (activeTab === "near-expiry" && !neFetched) loadNearExpiry();
	}, [activeTab, neFetched, loadNearExpiry]);

	useEffect(() => {
		if (neFetched) loadNearExpiry();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [neDays]);

	const neFiltered = useMemo(() => {
		const kw = neSearch.trim().toLowerCase();
		const from = dateFrom ? new Date(dateFrom) : null;
		const to   = dateTo   ? new Date(dateTo + "T23:59:59") : null;
		return neRows.filter((r) => {
			const matchKw = !kw || r.lotCode.toLowerCase().includes(kw) || r.itemCode.toLowerCase().includes(kw) || r.itemName.toLowerCase().includes(kw);
			const matchWh = neWarehouse === "ทุกคลัง" || r.warehouse === neWarehouse;
			const matchPeriod = r.expiredAt
				? (() => { const d = new Date(r.expiredAt); return (!from || d >= from) && (!to || d <= to); })()
				: true;
			return matchKw && matchWh && matchPeriod;
		});
	}, [neRows, neSearch, neWarehouse, dateFrom, dateTo]);

	const neTotalPages = Math.max(1, Math.ceil(neFiltered.length / ITEMS_PER_PAGE));
	const nePageItems = useMemo(() => {
		const s = (nePage - 1) * ITEMS_PER_PAGE;
		return neFiltered.slice(s, s + ITEMS_PER_PAGE);
	}, [neFiltered, nePage]);

	useEffect(() => { setNePage(1); }, [neSearch, neWarehouse, neDays, dateFrom, dateTo]);

	// ── Exports ────────────────────────────────────────────────────────────────

	const periodLabel = useMemo(() => {
		if (dateFrom && dateTo) return `${dateFrom} ถึง ${dateTo}`;
		if (dateFrom) return `ตั้งแต่ ${dateFrom}`;
		if (dateTo) return `ถึง ${dateTo}`;
		return "ทุกช่วงเวลา";
	}, [dateFrom, dateTo]);

	const handleLsExportXlsx = async () => {
		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		wb.creator = "HPK WMS";
		wb.created = new Date();

		const ws = wb.addWorksheet("รายงานสต็อกต่ำ");
		const generatedAt = fmtDateLong(new Date());
		const COLS = 11;

		ws.columns = [
			{ width: 6 },
			{ width: 14 },
			{ width: 32 },
			{ width: 18 },
			{ width: 18 },
			{ width: 10 },
			{ width: 14 },
			{ width: 14 },
			{ width: 12 },
			{ width: 12 },
			{ width: 14 },
		];

		type ExRow = ReturnType<typeof ws.addRow>;
		const applyBorder = (row: ExRow) => {
			row.eachCell({ includeEmpty: true }, (cell) => {
				cell.border = {
					top:    { style: "thin", color: { argb: "FFB0BEC5" } },
					left:   { style: "thin", color: { argb: "FFB0BEC5" } },
					bottom: { style: "thin", color: { argb: "FFB0BEC5" } },
					right:  { style: "thin", color: { argb: "FFB0BEC5" } },
				};
			});
		};

		const r1 = ws.addRow([periodLabel]);
		ws.mergeCells(r1.number, 1, r1.number, COLS);
		r1.height = 28;
		r1.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 16, bold: true, color: { argb: "FF1B5E20" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8E6C9" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r2 = ws.addRow(["รายงานสินค้าต่ำกว่า Min Stock"]);
		ws.mergeCells(r2.number, 1, r2.number, COLS);
		r2.height = 22;
		r2.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 14, bold: true, color: { argb: "FF0D47A1" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r3 = ws.addRow(["ระบบบริหารคลังสินค้า HPK"]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 18;
		r3.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 11, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r4 = ws.addRow([`วันที่สร้างรายงาน: ${generatedAt}    |    หมวดหมู่: ${lsCategory}    |    คลัง: ${lsWarehouse}`]);
		ws.mergeCells(r4.number, 1, r4.number, COLS);
		r4.height = 16;
		r4.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		ws.addRow([]);

		const headers = ["#", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "คลัง", "หน่วย", "สต็อกที่ใช้ได้", "คงเหลือ (DB)", "Min Stock", "จำนวนที่ขาด", "สถานะ"];
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

		lsFiltered.forEach((item, i) => {
			const isOut = item.availableStock === 0;
			const dr = ws.addRow([
				i + 1, item.code, item.name, item.category, item.warehouse, item.unit,
				item.availableStock, item.currentStock, item.minStock, item.shortfall,
				isOut ? "หมดสต็อก" : "ต่ำกว่า Min",
			]);
			dr.height = 18;
			const rowBg = i % 2 === 0 ? "FFFFFFFF" : "FFF5F5F5";
			dr.eachCell({ includeEmpty: true }, (cell, col) => {
				cell.font = { name: "TH Sarabun New", size: 11 };
				cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
				if (col === 7) {
					cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: isOut ? "FFEF5350" : "FFFB8C00" } };
				}
				if (col === 10) {
					cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: "FF1565C0" } };
					cell.alignment = { horizontal: "right" };
				}
				if (col === 11) {
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: isOut ? "FFFFEBEE" : "FFFFF3E0" } };
					cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: isOut ? "FFEF5350" : "FFFB8C00" } };
					cell.alignment = { horizontal: "center" };
				}
				applyBorder(dr);
			});
		});

		ws.addRow([]);
		const fr = ws.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws.mergeCells(fr.number, 1, fr.number, COLS);
		fr.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, italic: true, color: { argb: "FF9E9E9E" } },
			alignment: { horizontal: "right" },
		};

		const buf = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url;
		a.download = `รายงานสต็อกต่ำ_${periodLabel.replace(/ /g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click(); URL.revokeObjectURL(url);
	};

	const handleLsExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",              key: "_no",       align: "center" },
			{ header: "รหัสรายการ",     key: "code" },
			{ header: "ชื่อพัสดุ",     key: "name" },
			{ header: "หมวดหมู่",       key: "category" },
			{ header: "คลัง",           key: "warehouse" },
			{ header: "หน่วย",          key: "unit" },
			{ header: "สต็อกที่ใช้ได้", key: "available", align: "right" },
			{ header: "Min Stock",      key: "minStock",  align: "right" },
			{ header: "ขาด",            key: "shortfall", align: "right" },
			{ header: "สถานะ",          key: "status",    align: "center" },
		];
		const pdfRows = lsFiltered.map((item, i) => ({
			_no: String(i + 1), code: item.code, name: item.name, category: item.category,
			warehouse: item.warehouse, unit: item.unit,
			available: item.availableStock === 0 ? "หมดสต็อก (0)" : item.availableStock.toLocaleString(),
			minStock: item.minStock.toLocaleString(), shortfall: item.shortfall.toLocaleString(),
			status: item.availableStock === 0 ? "หมดสต็อก" : "ต่ำกว่า Min",
		}));
		printAsPdf(
			"รายงานสินค้าต่ำกว่า Min Stock",
			`${lsCategory} | ${lsWarehouse} | ${periodLabel} | รวม ${lsFiltered.length} รายการ`,
			columns, pdfRows,
		);
	};

	const handleNeExportXlsx = async () => {
		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		wb.creator = "HPK WMS";
		wb.created = new Date();

		const ws = wb.addWorksheet("รายงานใกล้หมดอายุ");
		const generatedAt = fmtDateLong(new Date());
		const COLS = 10;

		ws.columns = [
			{ width: 6 },
			{ width: 16 },
			{ width: 14 },
			{ width: 32 },
			{ width: 18 },
			{ width: 10 },
			{ width: 8 },
			{ width: 16 },
			{ width: 14 },
			{ width: 16 },
		];

		const r1 = ws.addRow([periodLabel]);
		ws.mergeCells(r1.number, 1, r1.number, COLS);
		r1.height = 28;
		r1.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 16, bold: true, color: { argb: "FF1B5E20" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFC8E6C9" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r2 = ws.addRow([`รายงานสินค้าใกล้หมดอายุ (ภายใน ${neDays} วัน)`]);
		ws.mergeCells(r2.number, 1, r2.number, COLS);
		r2.height = 22;
		r2.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 14, bold: true, color: { argb: "FF880E4F" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4EC" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r3 = ws.addRow(["ระบบบริหารคลังสินค้า HPK"]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 18;
		r3.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 11, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		const r4 = ws.addRow([`วันที่สร้างรายงาน: ${generatedAt}    |    คลัง: ${neWarehouse}    |    ช่วงเวลา: ภายใน ${neDays} วัน`]);
		ws.mergeCells(r4.number, 1, r4.number, COLS);
		r4.height = 16;
		r4.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		ws.addRow([]);

		const headers = ["#", "รหัส LOT", "รหัสรายการ", "ชื่อพัสดุ", "วันหมดอายุ", "คงเหลือ (วัน)", "ระดับความเร่งด่วน", "คลัง", "จำนวน", "หน่วย"];
		const hr = ws.addRow(headers);
		hr.height = 22;
		hr.eachCell((cell) => {
			cell.style = {
				font:      { name: "TH Sarabun New", size: 12, bold: true, color: { argb: "FFFFFFFF" } },
				fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FF4A148C" } },
				alignment: { horizontal: "center", vertical: "middle" },
				border: {
					top:    { style: "thin", color: { argb: "FF6A1B9A" } },
					left:   { style: "thin", color: { argb: "FF6A1B9A" } },
					bottom: { style: "thin", color: { argb: "FF6A1B9A" } },
					right:  { style: "thin", color: { argb: "FF6A1B9A" } },
				},
			};
		});

		const urgencyConfig: Record<string, { bg: string; fg: string }> = {
			"วิกฤต":      { bg: "FFFFEBEE", fg: "FFEF5350" },
			"เฝ้าระวัง":  { bg: "FFFFF3E0", fg: "FFFB8C00" },
			"ปานกลาง":    { bg: "FFFFFDE7", fg: "FFF9A825" },
		};

		neFiltered.forEach((r, i) => {
			const urgency = (r.daysLeft ?? 999) <= 30 ? "วิกฤต" : (r.daysLeft ?? 999) <= 60 ? "เฝ้าระวัง" : "ปานกลาง";
			const dr = ws.addRow([
				i + 1, r.lotCode, r.itemCode, r.itemName,
				fmtDate(r.expiredAt), r.daysLeft ?? "-", urgency, r.warehouse,
				r.quantity, r.unit,
			]);
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
				if (col === 7) {
					const cfg = urgencyConfig[urgency];
					cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cfg.bg } };
					cell.font = { name: "TH Sarabun New", size: 11, bold: true, color: { argb: cfg.fg } };
					cell.alignment = { horizontal: "center" };
				}
			});
		});

		ws.addRow([]);
		const fr = ws.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws.mergeCells(fr.number, 1, fr.number, COLS);
		fr.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, italic: true, color: { argb: "FF9E9E9E" } },
			alignment: { horizontal: "right" },
		};

		const buf = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url;
		a.download = `รายงานใกล้หมดอายุ_${periodLabel.replace(/ /g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click(); URL.revokeObjectURL(url);
	};

	const handleNeExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",          key: "_no",       align: "center" },
			{ header: "รหัส LOT",   key: "lotCode" },
			{ header: "รหัสรายการ", key: "itemCode" },
			{ header: "ชื่อพัสดุ", key: "itemName" },
			{ header: "วันหมดอายุ", key: "dateFmt",   align: "center" },
			{ header: "คงเหลือ",    key: "daysLabel", align: "center" },
			{ header: "คลัง",       key: "warehouse" },
			{ header: "จำนวน",      key: "qty",       align: "right" },
		];
		const pdfRows = neFiltered.map((r, i) => ({
			_no: String(i + 1), lotCode: r.lotCode, itemCode: r.itemCode, itemName: r.itemName,
			warehouse: r.warehouse, qty: r.quantity.toLocaleString() + " " + r.unit,
			dateFmt: fmtDate(r.expiredAt), daysLabel: getUrgencyLabel(r.daysLeft),
		}));
		printAsPdf(
			`รายงานสินค้าใกล้หมดอายุ (ภายใน ${neDays} วัน)`,
			`${neWarehouse} | ${periodLabel}`,
			columns, pdfRows,
		);
	};

	// Close dropdowns on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const t = e.target as HTMLElement;
			if (!t.closest("[data-filter-ls-cat]")) setIsCatOpen(false);
			if (!t.closest("[data-filter-ls-wh]"))  setIsLsWhOpen(false);
			if (!t.closest("[data-filter-ne-days]")) setIsDaysOpen(false);
			if (!t.closest("[data-filter-ne-wh]"))   setIsNeWhOpen(false);
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	const printDate = fmtDateLong(new Date());

	const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number }[] = [
		{ id: "low-stock",   label: "สต็อกต่ำกว่า Min Stock", icon: <AlertTriangle className="w-4 h-4" />, badge: lsRows.length },
		{ id: "near-expiry", label: "สินค้าใกล้หมดอายุ",      icon: <Clock className="w-4 h-4" />,       badge: neFetched ? neRows.length : undefined },
	];

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			{/* ── Page Header ─────────────────────────────────────────────────── */}
			<div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow">
							<FileText className="w-6 h-6 text-white" />
						</div>
						<div>
							<h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานแจ้งเตือนสต็อก</h1>
							<p className="text-sm text-slate-500 mt-0.5">ระบบบริหารคลังสินค้า HPK &nbsp;·&nbsp; พิมพ์วันที่ {printDate}</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => { loadLowStock(); setNeFetched(false); }}
							disabled={lsFetching || neFetching}
							className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-600 shadow-sm disabled:opacity-50 transition-colors"
							title="รีเฟรชข้อมูล"
						>
							<RefreshCw className={`w-4 h-4 ${lsFetching || neFetching ? "animate-spin" : ""}`} />
							รีเฟรช
						</button>
						{onBack && (
							<button
								type="button"
								onClick={onBack}
								className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
							>
								ย้อนกลับ
							</button>
						)}
					</div>
				</div>

				{/* Tabs */}
				<div className="flex gap-1 mt-5">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							type="button"
							onClick={() => setActiveTab(tab.id)}
							className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-semibold transition-all border-b-2 ${
								activeTab === tab.id
									? "bg-blue-600 text-white border-blue-600"
									: "bg-white text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50"
							}`}
						>
							{tab.icon}
							{tab.label}
							{tab.badge !== undefined && (
								<span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
									activeTab === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
								}`}>
									{tab.badge}
								</span>
							)}
						</button>
					))}
				</div>
			</div>

			{/* ── Content ──────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">

				{/* ═══ LOW STOCK TAB ══════════════════════════════════════════════ */}
				{activeTab === "low-stock" && (
					<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

						{/* Toolbar */}
						<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
							<div className="relative w-72">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
								<input
									type="text"
									placeholder="ค้นหารหัส / ชื่อพัสดุ..."
									value={lsSearch}
									onChange={(e) => setLsSearch(e.target.value)}
									className="w-full h-10 rounded-lg border border-slate-300 py-0 pl-9 pr-4 text-sm leading-none shadow-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 box-border"
								/>
							</div>

							<Dropdown dataAttr="filter-ls-cat" value={lsCategory} options={categoryOptions}
								open={isCatOpen}
								onToggle={() => { setIsCatOpen((o) => !o); setIsLsWhOpen(false); }}
								onChange={(v) => { setLsCategory(v); setIsCatOpen(false); }}
								minW="min-w-[180px]"
							/>
							<Dropdown dataAttr="filter-ls-wh" value={lsWarehouse} options={warehouseOptions}
								open={isLsWhOpen}
								onToggle={() => { setIsLsWhOpen((o) => !o); setIsCatOpen(false); }}
								onChange={(v) => { setLsWarehouse(v); setIsLsWhOpen(false); }}
								minW="min-w-[160px]"
							/>

							<div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
								<OutlinedDateField label="วันที่เริ่มต้น" value={dateFrom} onChange={setDateFrom} />
								<OutlinedDateField label="วันที่สิ้นสุด"  value={dateTo}   onChange={setDateTo} />
							</div>

							<div className="ml-auto flex items-center gap-2">
								{(lsSearch || lsCategory !== "หมวดหมู่ทั้งหมด" || lsWarehouse !== "ทุกคลัง" || dateFrom || dateTo) && (
									<button type="button"
										onClick={() => {
											setLsSearch(""); setLsCategory("หมวดหมู่ทั้งหมด"); setLsWarehouse("ทุกคลัง");
											setDateFrom(""); setDateTo(""); setLsPage(1);
										}}
										className="flex h-10 items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm bg-white"
									>
										<X className="w-3.5 h-3.5" />ล้างตัวกรอง
									</button>
								)}
								<button type="button" title="Export PDF" onClick={handleLsExportPdf}
									className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
									<PdfIcon />
								</button>
								<button type="button" title="Export Excel (.xlsx)" onClick={() => void handleLsExportXlsx()}
									className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
									<XlsxIcon />
								</button>
							</div>
						</div>

						{/* Summary strip */}
						<div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100 text-sm">
							<span className="text-slate-500">พบ <span className="font-semibold text-slate-800">{lsFiltered.length}</span> รายการ</span>
							<span className="flex items-center gap-1.5 text-red-600">
								<span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
								หมดสต็อก: <strong>{lsFiltered.filter((i) => i.availableStock === 0).length}</strong>
							</span>
							<span className="flex items-center gap-1.5 text-orange-500">
								<span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400" />
								ต่ำกว่า Min: <strong>{lsFiltered.filter((i) => i.availableStock > 0).length}</strong>
							</span>
						</div>

						{/* Table */}
						<div className="relative w-full overflow-x-auto">
							{lsFetching && (
								<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
									<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
								</div>
							)}
							<table className="w-full text-sm text-left table-fixed min-w-[900px]">
								<thead className="bg-slate-50 text-slate-700 text-base font-semibold shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
									<tr>
										<th className="px-4 py-4 w-[50px] text-center whitespace-nowrap">#</th>
										<th className="px-4 py-4 w-[110px] whitespace-nowrap">รหัสรายการ</th>
										<th className="px-4 py-4 w-[220px] whitespace-nowrap">ชื่อพัสดุ</th>
										<th className="px-4 py-4 w-[140px] whitespace-nowrap">หมวดหมู่</th>
										<th className="px-4 py-4 w-[130px] whitespace-nowrap">คลัง</th>
										<th className="px-4 py-4 w-[100px] text-right whitespace-nowrap">สต็อกใช้ได้</th>
										<th className="px-4 py-4 w-[90px] text-right whitespace-nowrap">Min Stock</th>
										<th className="px-4 py-4 w-[80px] text-right whitespace-nowrap">ขาด</th>
										<th className="px-4 py-4 w-[80px] whitespace-nowrap">หน่วย</th>
										<th className="px-4 py-4 w-[120px] text-center whitespace-nowrap">สถานะ</th>
									</tr>
								</thead>
								<tbody className="text-slate-600">
									{lsPageItems.length > 0 ? lsPageItems.map((item, idx) => (
										<tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
											<td className="px-4 py-3 text-center text-slate-500">{(lsPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
											<td className="px-4 py-3 font-mono text-slate-600 text-xs">{item.code}</td>
											<td className="px-4 py-3 text-slate-700 font-medium truncate" title={item.name}>{item.name}</td>
											<td className="px-4 py-3 text-slate-500 text-xs">{item.category}</td>
											<td className="px-4 py-3 text-slate-500 text-xs">{item.warehouse}</td>
											<td className={`px-4 py-3 text-right font-mono font-bold tabular-nums text-base ${item.availableStock === 0 ? "text-red-600" : "text-orange-500"}`}>
												{item.availableStock === 0 ? (item.availableStock > 0 ? "+" : "") : ""}{item.availableStock.toLocaleString()}
											</td>
											<td className="px-4 py-3 text-right font-mono text-slate-500 tabular-nums text-xs">{item.minStock.toLocaleString()}</td>
											<td className="px-4 py-3 text-right font-mono text-blue-600 font-bold tabular-nums text-base">{item.shortfall.toLocaleString()}</td>
											<td className="px-4 py-3 text-slate-500 text-xs">{item.unit}</td>
											<td className="px-4 py-3 text-center">
												{item.availableStock === 0 ? (
													<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
														<span className="w-1.5 h-1.5 rounded-full bg-red-500" />หมดสต็อก
													</span>
												) : (
													<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-100">
														<span className="w-1.5 h-1.5 rounded-full bg-orange-400" />ต่ำกว่า Min
													</span>
												)}
											</td>
										</tr>
									)) : (
										<tr>
											<td colSpan={10} className="text-center py-16">
												<Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
												<p className="text-sm text-slate-400">ไม่พบสินค้าต่ำกว่า Min Stock</p>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
							<p className="text-sm text-slate-500">แสดง {lsPageItems.length} จาก {lsFiltered.length} รายการ</p>
							<div className="flex items-center gap-2">
								<button type="button" disabled={lsPage === 1} onClick={() => setLsPage((p) => p - 1)}
									className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-sm font-medium px-2 text-slate-600">หน้า {lsPage} / {lsTotalPages}</span>
								<button type="button" disabled={lsPage >= lsTotalPages} onClick={() => setLsPage((p) => p + 1)}
									className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				)}

				{/* ═══ NEAR EXPIRY TAB ════════════════════════════════════════════ */}
				{activeTab === "near-expiry" && (
					<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

						{/* Toolbar */}
						<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
							<div className="relative w-72">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
								<input
									type="text"
									placeholder="ค้นหา LOT / รหัส / ชื่อพัสดุ..."
									value={neSearch}
									onChange={(e) => setNeSearch(e.target.value)}
									className="w-full h-10 rounded-lg border border-slate-300 py-0 pl-9 pr-4 text-sm leading-none shadow-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 box-border"
								/>
							</div>

							<Dropdown dataAttr="filter-ne-days"
								value={`ภายใน ${neDays} วัน`}
								options={["ภายใน 30 วัน", "ภายใน 60 วัน", "ภายใน 90 วัน"]}
								open={isDaysOpen}
								onToggle={() => { setIsDaysOpen((o) => !o); setIsNeWhOpen(false); }}
								onChange={(v) => { setNeDays(v.replace("ภายใน ", "").replace(" วัน", "") as "30" | "60" | "90"); setIsDaysOpen(false); }}
								icon={<Clock className="w-4 h-4" />}
								minW="min-w-[160px]"
							/>
							<Dropdown dataAttr="filter-ne-wh" value={neWarehouse} options={warehouseOptions}
								open={isNeWhOpen}
								onToggle={() => { setIsNeWhOpen((o) => !o); setIsDaysOpen(false); }}
								onChange={(v) => { setNeWarehouse(v); setIsNeWhOpen(false); }}
								minW="min-w-[160px]"
							/>

							<div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
								<OutlinedDateField label="วันหมดอายุ (ตั้งแต่)" value={dateFrom} onChange={setDateFrom} />
								<OutlinedDateField label="วันหมดอายุ (ถึง)"     value={dateTo}   onChange={setDateTo} />
							</div>

							<div className="ml-auto flex items-center gap-2">
								{(neSearch || neWarehouse !== "ทุกคลัง" || dateFrom || dateTo) && (
									<button type="button"
										onClick={() => { setNeSearch(""); setNeWarehouse("ทุกคลัง"); setDateFrom(""); setDateTo(""); setNePage(1); }}
										className="flex h-10 items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm bg-white"
									>
										<X className="w-3.5 h-3.5" />ล้างตัวกรอง
									</button>
								)}
								<button type="button" title="Export PDF" onClick={handleNeExportPdf}
									className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
									<PdfIcon />
								</button>
								<button type="button" title="Export Excel (.xlsx)" onClick={() => void handleNeExportXlsx()}
									className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
									<XlsxIcon />
								</button>
							</div>
						</div>

						{/* Summary strip */}
						<div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100 text-sm">
							<span className="text-slate-500">พบ <span className="font-semibold text-slate-800">{neFiltered.length}</span> LOT</span>
							<span className="flex items-center gap-1.5 text-red-600"><span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />≤30 วัน: <strong>{neFiltered.filter((r) => (r.daysLeft ?? 999) <= 30).length}</strong></span>
							<span className="flex items-center gap-1.5 text-orange-500"><span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400" />31–60 วัน: <strong>{neFiltered.filter((r) => (r.daysLeft ?? 999) > 30 && (r.daysLeft ?? 999) <= 60).length}</strong></span>
							<span className="flex items-center gap-1.5 text-yellow-600"><span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />61–90 วัน: <strong>{neFiltered.filter((r) => (r.daysLeft ?? 999) > 60).length}</strong></span>
						</div>

						{/* Table */}
						<div className="relative w-full overflow-x-auto">
							{neFetching && (
								<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
									<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
								</div>
							)}
							<table className="w-full text-sm text-left table-fixed min-w-[880px]">
								<thead className="bg-slate-50 text-slate-700 text-base font-semibold shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
									<tr>
										<th className="px-4 py-4 w-[50px] text-center whitespace-nowrap">#</th>
										<th className="px-4 py-4 w-[120px] whitespace-nowrap">รหัส LOT</th>
										<th className="px-4 py-4 w-[110px] whitespace-nowrap">รหัสรายการ</th>
										<th className="px-4 py-4 w-[220px] whitespace-nowrap">ชื่อพัสดุ</th>
										<th className="px-4 py-4 w-[120px] text-center whitespace-nowrap">วันหมดอายุ</th>
										<th className="px-4 py-4 w-[130px] text-center whitespace-nowrap">ความเร่งด่วน</th>
										<th className="px-4 py-4 w-[140px] whitespace-nowrap">คลัง</th>
										<th className="px-4 py-4 w-[80px] text-right whitespace-nowrap">จำนวน</th>
										<th className="px-4 py-4 w-[70px] whitespace-nowrap">หน่วย</th>
									</tr>
								</thead>
								<tbody className="text-slate-600">
									{nePageItems.length > 0 ? nePageItems.map((r, idx) => (
										<tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
											<td className="px-4 py-3 text-center text-slate-500">{(nePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
											<td className="px-4 py-3 font-mono text-slate-600 text-xs">{r.lotCode}</td>
											<td className="px-4 py-3 font-mono text-slate-600 text-xs">{r.itemCode}</td>
											<td className="px-4 py-3 text-slate-700 font-medium truncate" title={r.itemName}>{r.itemName}</td>
											<td className="px-4 py-3 text-center font-mono text-slate-600 text-xs">{fmtDate(r.expiredAt)}</td>
											<td className="px-4 py-3 text-center">
												<span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-transparent ${getUrgencyColor(r.daysLeft)}`}>
													{getUrgencyLabel(r.daysLeft)}
												</span>
											</td>
											<td className="px-4 py-3 text-slate-500 text-xs">{r.warehouse}</td>
											<td className="px-4 py-3 text-right font-mono font-bold tabular-nums text-base text-slate-700">{r.quantity.toLocaleString()}</td>
											<td className="px-4 py-3 text-slate-500 text-xs">{r.unit}</td>
										</tr>
									)) : (
										<tr>
											<td colSpan={9} className="text-center py-16">
												<AlertTriangle className="w-10 h-10 text-slate-200 mx-auto mb-2" />
												<p className="text-sm text-slate-400">ไม่พบสินค้าใกล้หมดอายุภายใน {neDays} วัน</p>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>

						{/* Pagination */}
						<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
							<p className="text-sm text-slate-500">แสดง {nePageItems.length} จาก {neFiltered.length} รายการ</p>
							<div className="flex items-center gap-2">
								<button type="button" disabled={nePage === 1} onClick={() => setNePage((p) => p - 1)}
									className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-sm font-medium px-2 text-slate-600">หน้า {nePage} / {neTotalPages}</span>
								<button type="button" disabled={nePage >= neTotalPages} onClick={() => setNePage((p) => p + 1)}
									className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* ── Page Footer ──────────────────────────────────────────────────── */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">
					HPK Warehouse Management System &nbsp;·&nbsp; รายงานแจ้งเตือนสต็อก &nbsp;·&nbsp; {periodLabel}
				</p>
			</div>
		</div>
	);
};

export default LowStockReportClient;
