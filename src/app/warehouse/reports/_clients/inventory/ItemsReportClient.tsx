"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Package,
	Search,
	X,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import * as ItemSvc from "@/services/itemsService";
import type { UiItem } from "@/services/itemsService";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { useUser } from "@/context/UserContext";
import { ReportDetailPageHeader } from "../../_components/ReportDetailPageHeader";

// ── Icons (ขนาดเดียวกับ StockBalanceReportClient) ─────────────────────────────

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
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#e53935"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
	</svg>
);

// ── Dropdown ──────────────────────────────────────────────────────────────────

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
	<div className="relative" {...{ [`data-${dataAttr}`]: "" }} onClick={(e) => e.stopPropagation()}>
		<button
			type="button"
			onClick={onToggle}
			className={`flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 py-0 text-sm leading-none bg-white shadow-sm hover:bg-slate-50 box-border ${minW}`}
		>
			<span className="flex-1 text-left text-slate-700">{value}</span>
			<ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
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

interface Props {
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 20;

const ITEM_TYPE_LABEL: Record<string, string> = {
	MED_ASSET: "ครุภัณฑ์ภายในองค์กร",
	REUSABLE: "ของใช้ซ้ำรายชิ้น",
	CONSUMABLE: "วัสดุสิ้นเปลือง",
};

const formatItemType = (type: string) => ITEM_TYPE_LABEL[type] ?? type;

/** จำนวนที่ใช้แสดงและเทียบขั้นต่ำ — เดียวกับ ItemsClient */
const getEffectiveStock = (item: UiItem): number =>
	item.type === "REUSABLE"
		? (typeof item.availableStock === "number" ? item.availableStock : 0)
		: item.stock;

/** แสดงในคอลัมน์ขั้นต่ำ: ถ้าไม่ได้ตั้งหรือเป็น 0 ให้โชว์ 0 แทน "—" */
const displayMinStockForReport = (minStock: number | undefined): number => {
	const n = Number(minStock);
	return Number.isFinite(n) && n > 0 ? n : 0;
};

// ── Component ─────────────────────────────────────────────────────────────────

const ItemsReportClient: React.FC<Props> = ({ onBack }) => {
	const { profile } = useUser();
	const [items, setItems]     = useState<UiItem[]>([]);
	const [loading, setLoading] = useState(true);

	const [categoryOptions, setCategoryOptions] = useState<string[]>(["หมวดหมู่ทั้งหมด"]);
	const [warehouseOptions, setWarehouseOptions] = useState<string[]>(["คลังทั้งหมด"]);
	const [unitOptions, setUnitOptions]           = useState<string[]>(["หน่วยทั้งหมด"]);

	const [search, setSearch]                     = useState("");
	const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
	const [selectedWarehouse, setSelectedWarehouse] = useState("คลังทั้งหมด");
	const [selectedUnit, setSelectedUnit]         = useState("หน่วยทั้งหมด");
	const [page, setPage]                         = useState(1);

	const [isCatOpen,  setIsCatOpen]  = useState(false);
	const [isWhOpen,   setIsWhOpen]   = useState(false);
	const [isUnitOpen, setIsUnitOpen] = useState(false);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			const [cats, whs, units, allItems] = await Promise.all([
				ItemSvc.getcategoriesOptions(),
				ItemSvc.getWarehousesOptions(),
				ItemSvc.getUnitsOptions(),
				ItemSvc.getAllInventoryItems(),
			]);
			setCategoryOptions(["หมวดหมู่ทั้งหมด", ...(cats?.map((c) => c.name) ?? [])]);
			setWarehouseOptions(["คลังทั้งหมด",     ...(whs?.map((w) => w.name) ?? [])]);
			setUnitOptions(["หน่วยทั้งหมด",         ...(units?.map((u) => u.name) ?? [])]);
			setItems(allItems ?? []);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลพัสดุ");
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { void loadData(); }, [loadData]);

	const closeAllDropdowns = () => {
		setIsCatOpen(false);
		setIsWhOpen(false);
		setIsUnitOpen(false);
	};

	const filtered = useMemo(() => {
		const kw = search.trim().toLowerCase();
		return items.filter((item) => {
			const matchKw  = !kw || item.code.toLowerCase().includes(kw) || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
			const matchCat = selectedCategory  === "หมวดหมู่ทั้งหมด" || item.category  === selectedCategory;
			const matchWh  = selectedWarehouse === "คลังทั้งหมด"     || item.location  === selectedWarehouse;
			const matchUnit = selectedUnit     === "หน่วยทั้งหมด"    || item.unit      === selectedUnit;
			return matchKw && matchCat && matchWh && matchUnit;
		});
	}, [items, search, selectedCategory, selectedWarehouse, selectedUnit]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
	const pageItems  = useMemo(() => {
		const s = (page - 1) * ITEMS_PER_PAGE;
		return filtered.slice(s, s + ITEMS_PER_PAGE);
	}, [filtered, page]);

	useEffect(() => { setPage(1); }, [search, selectedCategory, selectedWarehouse, selectedUnit]);

	const hasFilter = !!(search || selectedCategory !== "หมวดหมู่ทั้งหมด" || selectedWarehouse !== "คลังทั้งหมด" || selectedUnit !== "หน่วยทั้งหมด");

	// ── Exports ─────────────────────────────────────────────────────────────────

	const handleExportXlsx = async () => {
		const ExcelJS = (await import("exceljs")).default;
		const wb = new ExcelJS.Workbook();
		wb.creator = "HPK WMS";
		wb.created = new Date();

		const ws = wb.addWorksheet("รายงานพัสดุทั้งหมด");
		const COLS = 9;

		ws.columns = [
			{ width: 6 },   // #
			{ width: 14 },  // รหัสรายการ
			{ width: 36 },  // ชื่อพัสดุ
			{ width: 20 },  // หมวดหมู่
			{ width: 22 },  // ประเภท
			{ width: 12 },  // คงเหลือ
			{ width: 12 },  // ขั้นต่ำ
			{ width: 12 },  // หน่วย
			{ width: 22 },  // ตำแหน่งจัดเก็บ
		];

		const r1 = ws.addRow(["รายงานพัสดุทั้งหมด"]);
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

		const r3 = ws.addRow([`วันที่สร้าง: ${new Date().toLocaleDateString("th-TH")}    |    หมวดหมู่: ${selectedCategory}    |    คลัง: ${selectedWarehouse}    |    หน่วย: ${selectedUnit}    |    รวม ${filtered.length} รายการ`]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 16;
		r3.getCell(1).style = {
			font:      { name: "TH Sarabun New", size: 10, color: { argb: "FF546E7A" } },
			fill:      { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } },
			alignment: { horizontal: "center", vertical: "middle" },
		};

		ws.addRow([]);

		const headers = ["#", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "ประเภท", "คงเหลือ", "ขั้นต่ำ", "หน่วย", "ตำแหน่งจัดเก็บ"];
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

		filtered.forEach((item, i) => {
			const dr = ws.addRow([
				i + 1,
				item.code,
				item.name,
				item.category,
				formatItemType(item.type),
				item.stock,
				displayMinStockForReport(item.minStock),
				item.unit,
				item.location,
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
				if (col === 6 || col === 7) {
					cell.alignment = { horizontal: "right" };
					cell.font = { name: "TH Sarabun New", size: 11, bold: true };
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

		const buf  = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href = url;
		a.download = `รายงานพัสดุทั้งหมด_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPdf = () => {
		const columns: PrintColumn[] = [
			{ header: "#",            key: "_no",         align: "center" },
			{ header: "รหัสรายการ",   key: "code" },
			{ header: "ชื่อพัสดุ",    key: "name" },
			{ header: "หมวดหมู่",     key: "category" },
			{ header: "ประเภท",       key: "typeLabel" },
			{ header: "คงเหลือ",      key: "stock",       align: "right" },
			{ header: "ขั้นต่ำ",      key: "minStock",    align: "right" },
			{ header: "หน่วย",        key: "unit" },
			{ header: "ตำแหน่งจัดเก็บ", key: "storage" },
		];
		const pdfRows = filtered.map((item, i) => ({
			_no:      String(i + 1),
			code:     item.code,
			name:     item.name,
			category: item.category,
			typeLabel: formatItemType(item.type),
			stock:    item.stock.toLocaleString(),
			minStock: displayMinStockForReport(item.minStock).toLocaleString(),
			unit:     item.unit,
			storage:  item.location,
		}));
		printWarehouseReport({
			reportTitle:   "รายงานพัสดุทั้งหมด",
			filterSummary: [
				selectedCategory  !== "หมวดหมู่ทั้งหมด" ? `หมวดหมู่: ${selectedCategory}`  : null,
				selectedWarehouse !== "คลังทั้งหมด"     ? `คลัง: ${selectedWarehouse}`      : null,
				selectedUnit      !== "หน่วยทั้งหมด"    ? `หน่วย: ${selectedUnit}`          : null,
			].filter(Boolean).join(" | ") || undefined,
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

	// ── Render ───────────────────────────────────────────────────────────────────

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			<ReportDetailPageHeader
				reportPage="all-items"
				title="รายงานพัสดุทั้งหมด"
				subtitle="ระบบบริหารคลังสินค้า HPK"
				onBack={onBack}
			/>

			{/* ── Content ───────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">
				<div
					className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
					onClick={closeAllDropdowns}
				>

					{/* Toolbar — rhythm เดียวกับ StockBalanceReportClient */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
						<div className="relative w-72" onClick={(e) => e.stopPropagation()}>
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหาชื่อ / รหัสรายการ..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="w-full h-10 rounded-lg border border-slate-300 py-0 pl-9 pr-4 text-sm leading-none shadow-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 box-border"
							/>
						</div>

						<Dropdown
							dataAttr="filter-cat"
							value={selectedCategory}
							options={categoryOptions}
							open={isCatOpen}
							onToggle={() => { setIsCatOpen((o) => !o); setIsWhOpen(false); setIsUnitOpen(false); }}
							onChange={(v) => { setSelectedCategory(v); setIsCatOpen(false); }}
							minW="min-w-[180px]"
						/>
						<Dropdown
							dataAttr="filter-wh"
							value={selectedWarehouse}
							options={warehouseOptions}
							open={isWhOpen}
							onToggle={() => { setIsWhOpen((o) => !o); setIsCatOpen(false); setIsUnitOpen(false); }}
							onChange={(v) => { setSelectedWarehouse(v); setIsWhOpen(false); }}
							minW="min-w-[160px]"
						/>
						<Dropdown
							dataAttr="filter-unit"
							value={selectedUnit}
							options={unitOptions}
							open={isUnitOpen}
							onToggle={() => { setIsUnitOpen((o) => !o); setIsCatOpen(false); setIsWhOpen(false); }}
							onChange={(v) => { setSelectedUnit(v); setIsUnitOpen(false); }}
							minW="min-w-[150px]"
						/>

						<div className="ml-auto flex items-center gap-2">
							{hasFilter && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setSearch("");
										setSelectedCategory("หมวดหมู่ทั้งหมด");
										setSelectedWarehouse("คลังทั้งหมด");
										setSelectedUnit("หน่วยทั้งหมด");
										setPage(1);
									}}
									className="flex h-10 items-center gap-1.5 px-3 text-sm leading-none text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm box-border bg-white"
								>
									<X className="w-3.5 h-3.5" />
									ล้างตัวกรอง
								</button>
							)}
							<button
								type="button"
								title="Export PDF"
								onClick={(e) => { e.stopPropagation(); handleExportPdf(); }}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm"
							>
								<PdfIcon />
							</button>
							<button
								type="button"
								title="Export Excel (.xlsx)"
								onClick={(e) => { e.stopPropagation(); void handleExportXlsx(); }}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm"
							>
								<XlsxIcon />
							</button>
						</div>
					</div>

					{/* Summary strip */}
					<div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100 text-sm">
						<span className="text-slate-500">
							พบ <span className="font-semibold text-slate-800">{filtered.length.toLocaleString()}</span> รายการ
						</span>
					</div>

					{/* Table — เลื่อนแนวนอนเมื่อกว้าง; สูงตามเนื้อหา (เดียวกับ StockBalanceReportClient) */}
					<div className="relative w-full overflow-x-auto">
						{loading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full table-fixed text-sm text-left min-w-[1120px]">
						<thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
							<tr>
								<th className="px-4 py-4 w-[50px] text-center whitespace-nowrap">#</th>
								<th className="px-3 py-4 whitespace-nowrap">รหัสรายการ</th>
								<th className="px-3 py-4 whitespace-nowrap">ชื่อพัสดุ</th>
								<th className="px-6 py-4 whitespace-nowrap">หมวดหมู่</th>
								<th className="px-6 py-4 whitespace-nowrap">ประเภท</th>
								<th className="px-6 py-4 w-[120px] whitespace-nowrap">คงเหลือ</th>
								<th className="px-6 py-4 w-[120px] whitespace-nowrap">ขั้นต่ำ</th>
								<th className="px-6 py-4 whitespace-nowrap">หน่วย</th>
								<th className="px-6 py-4 whitespace-nowrap">ตำแหน่งจัดเก็บ</th>
							</tr>
						</thead>
							<tbody className="text-slate-600">
								{pageItems.length > 0 ? pageItems.map((item, idx) => (
									<tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
										<td className="px-6 py-3 text-center text-slate-600">
											{(page - 1) * ITEMS_PER_PAGE + idx + 1}
										</td>
										<td className="px-3 py-3">{item.code}</td>
										<td className="px-3 py-3">
											<span className="block truncate min-w-0" title={item.name}>
												{item.name}
											</span>
										</td>
										<td className="px-6 py-3 text-slate-600 truncate" title={item.category}>{item.category}</td>
										<td className="px-6 py-3 text-sm truncate" title={formatItemType(item.type)}>
											{formatItemType(item.type)}
										</td>
										<td className="px-6 py-3 w-[120px]">
											{item.type === "REUSABLE" ? (
												<div className="relative group inline-block cursor-help">
													<span className={`font-bold text-base ${
														getEffectiveStock(item) <= 0 ? "text-red-500" :
														getEffectiveStock(item) <= item.minStock ? "text-orange-500" :
														"text-emerald-600"
													}`}>
														{getEffectiveStock(item)}
													</span>
													<div className="absolute left-1/2 bottom-full mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-xs text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
														ทั้งหมดในคลัง: {item.stock} {item.unit}
														<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
													</div>
												</div>
											) : (
												<span className={`font-bold ${
													item.stock <= 0 ? "text-red-500" :
													item.stock <= item.minStock ? "text-orange-500" :
													"text-emerald-600"
												}`}>
													{item.stock}
												</span>
											)}
										</td>
										<td className="px-6 py-3 w-[120px]">
											<span className="text-black font-semibold">{displayMinStockForReport(item.minStock)}</span>
										</td>
										<td className="px-6 py-3 truncate max-w-0" title={item.unit}>{item.unit}</td>
										<td className="px-6 py-3 text-slate-600 truncate" title={item.location || undefined}>{item.location || "-"}</td>
									</tr>
								)) : (
									<tr>
										<td colSpan={9}>
											<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
												<Package className="w-12 h-12 text-slate-300" />
												<p className="text-sm font-medium">ไม่พบข้อมูลพัสดุ</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-sm text-slate-500">
							แสดง {pageItems.length.toLocaleString()} จาก {filtered.length.toLocaleString()} รายการ
						</p>
						<div className="flex items-center gap-2">
							<button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}
								className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="text-sm font-medium px-2 text-slate-600">หน้า {page} / {totalPages}</span>
							<button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
								className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>

				</div>
			</div>

		</div>
	);
};

export default ItemsReportClient;
