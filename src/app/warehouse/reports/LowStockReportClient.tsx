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
import type { UiItem } from "@/services/itemsService";

interface LowStockReportClientProps {
	initialItems?: UiItem[];
	onBack?: () => void;
}

// ── Low Stock item from new API ─────────────────────────────
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
}

interface LowStockApiResponse {
	items: LowStockItem[];
	total: number;
}

// ── Near Expiry ─────────────────────────────────────────────
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

const ITEMS_PER_PAGE = 10;

// ── Helpers ─────────────────────────────────────────────────
const fmtDate = (v?: string | null) => {
	if (!v) return "-";
	const d = new Date(v);
	if (Number.isNaN(d.getTime())) return v;
	return d.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
};

// Low Stock: red = out-of-stock, orange = below min
const getStockColor = (item: LowStockItem) => {
	if (item.availableStock === 0) return "text-red-600 font-bold";
	return "text-orange-500 font-semibold";
};

const getStockBadge = (item: LowStockItem) => {
	if (item.availableStock === 0)
		return "";
	return "";
};

const getStockLabel = (item: LowStockItem) => {
	if (item.availableStock === 0) return "หมดสต็อก";
	return "ต่ำกว่า Min";
};

// Near Expiry urgency
const getUrgencyBadge = (daysLeft: number | null) => {
	if (daysLeft === null) return "";
	if (daysLeft <= 30) return "";
	if (daysLeft <= 60) return "";
	return "";
};

const getUrgencyLabel = (daysLeft: number | null) =>
	daysLeft === null ? "ไม่ระบุ" : `อีก ${daysLeft} วัน`;

type ActiveTab = "low-stock" | "near-expiry";

const LowStockReportClient: React.FC<LowStockReportClientProps> = ({ onBack }) => {
	const [activeTab, setActiveTab] = useState<ActiveTab>("low-stock");

	// ── Low Stock (API-driven) ──────────────────────────────
	const [lsRows, setLsRows] = useState<LowStockItem[]>([]);
	const [lsFetching, setLsFetching] = useState(true);
	const [lsSearch, setLsSearch] = useState("");
	const [lsCategory, setLsCategory] = useState("หมวดหมู่ทั้งหมด");
	const [lsWarehouse, setLsWarehouse] = useState("ทุกคลัง");
	const [lsPage, setLsPage] = useState(1);
	const [isCatOpen, setIsCatOpen] = useState(false);
	const [isWhOpen, setIsWhOpen] = useState(false);

	const loadLowStock = useCallback(async () => {
		setLsFetching(true);
		try {
			const res = await apiClient.get<LowStockApiResponse>("/v1/reports/low-stock");
			setLsRows((res.data as LowStockApiResponse).items ?? []);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลสต็อกต่ำ");
			setLsRows([]);
		} finally {
			setLsFetching(false);
		}
	}, []);

	useEffect(() => { loadLowStock(); }, [loadLowStock]);

	const lsCategoryOptions = useMemo(() =>
		["หมวดหมู่ทั้งหมด", ...Array.from(new Set(lsRows.map((i) => i.category).filter(Boolean)))],
		[lsRows],
	);
	const lsWarehouseOptions = useMemo(() =>
		["ทุกคลัง", ...Array.from(new Set(lsRows.map((i) => i.warehouse).filter(Boolean)))],
		[lsRows],
	);

	const lsFiltered = useMemo(() => {
		const kw = lsSearch.trim().toLowerCase();
		return lsRows.filter((item) => {
			const matchKw = !kw || item.code.toLowerCase().includes(kw) || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
			const matchCat = lsCategory === "หมวดหมู่ทั้งหมด" || item.category === lsCategory;
			const matchWh  = lsWarehouse === "ทุกคลัง" || item.warehouse === lsWarehouse;
			return matchKw && matchCat && matchWh;
		});
	}, [lsRows, lsSearch, lsCategory, lsWarehouse]);

	const lsTotalPages = Math.max(1, Math.ceil(lsFiltered.length / ITEMS_PER_PAGE));
	const lsPageItems  = useMemo(() => {
		const s = (lsPage - 1) * ITEMS_PER_PAGE;
		return lsFiltered.slice(s, s + ITEMS_PER_PAGE);
	}, [lsFiltered, lsPage]);

	useEffect(() => { setLsPage(1); }, [lsSearch, lsCategory, lsWarehouse]);

	// ── Near Expiry ────────────────────────────────────────
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

	const neWarehouseOptions = useMemo(() =>
		["ทุกคลัง", ...Array.from(new Set(neRows.map((r) => r.warehouse).filter(Boolean)))],
		[neRows],
	);

	const neFiltered = useMemo(() => {
		const kw = neSearch.trim().toLowerCase();
		return neRows.filter((r) => {
			const matchKw = !kw || r.lotCode.toLowerCase().includes(kw) || r.itemCode.toLowerCase().includes(kw) || r.itemName.toLowerCase().includes(kw);
			const matchWh = neWarehouse === "ทุกคลัง" || r.warehouse === neWarehouse;
			return matchKw && matchWh;
		});
	}, [neRows, neSearch, neWarehouse]);

	const neTotalPages = Math.max(1, Math.ceil(neFiltered.length / ITEMS_PER_PAGE));
	const nePageItems  = useMemo(() => {
		const s = (nePage - 1) * ITEMS_PER_PAGE;
		return neFiltered.slice(s, s + ITEMS_PER_PAGE);
	}, [neFiltered, nePage]);

	useEffect(() => { setNePage(1); }, [neSearch, neWarehouse, neDays]);

	// ── Exports ────────────────────────────────────────────
	const handleLsExportCsv = () => {
		const header = ["รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "หน่วย", "สต็อกที่ใช้ได้", "คงเหลือ (DB)", "Min Stock", "ขาด", "คำนวณจาก"];
		const rows = lsFiltered.map((item) => [
			item.code, item.name, item.category, item.warehouse, item.unit,
			item.availableStock, item.currentStock, item.minStock, item.shortfall,
			item.hasLots ? "ยอดรวม LOT" : "current_stock",
		].map((v) => `"${v}"`).join(","));
		const blob = new Blob(["\uFEFF" + [header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url;
		a.download = `รายงานสต็อกต่ำ_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click(); URL.revokeObjectURL(url);
	};

	const handleLsExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",              key: "_no",           align: "center" },
			{ header: "รหัสสินค้า",     key: "code" },
			{ header: "ชื่อสินค้า",     key: "name" },
			{ header: "หมวดหมู่",       key: "category" },
			{ header: "คลัง",           key: "warehouse" },
			{ header: "หน่วย",          key: "unit" },
			{ header: "สต็อกที่ใช้ได้", key: "available",     align: "right" },
			{ header: "Min Stock",      key: "minStock",      align: "right" },
			{ header: "ขาด",            key: "shortfall",     align: "right" },
			{ header: "สถานะ",          key: "status",        align: "center" },
		];
		const pdfRows = lsFiltered.map((item, i) => ({
			_no:       String(i + 1),
			code:      item.code,
			name:      item.name,
			category:  item.category,
			warehouse: item.warehouse,
			unit:      item.unit,
			available: item.availableStock === 0 ? "หมดสต็อก (0)" : item.availableStock.toLocaleString(),
			minStock:  item.minStock.toLocaleString(),
			shortfall: item.shortfall.toLocaleString(),
			status:    item.availableStock === 0 ? "หมดสต็อก" : "ต่ำกว่า Min",
		}));
		printAsPdf(
			"รายงานสินค้าต่ำกว่า Min Stock",
			`${lsCategory || "ทุกหมวด"} | ${lsWarehouse || "ทุกคลัง"} | รวม ${lsFiltered.length} รายการ`,
			columns,
			pdfRows,
		);
	};

	const handleNeExportCsv = () => {
		const header = ["รหัส LOT", "รหัสสินค้า", "ชื่อสินค้า", "คลัง", "จำนวน", "หน่วย", "วันหมดอายุ", "คงเหลือ (วัน)"];
		const rows = neFiltered.map((r) => [
			r.lotCode, r.itemCode, r.itemName, r.warehouse, r.quantity, r.unit,
			fmtDate(r.expiredAt), r.daysLeft ?? "-",
		].map((v) => `"${v}"`).join(","));
		const blob = new Blob(["\uFEFF" + [header.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url;
		a.download = `รายงานใกล้หมดอายุ_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click(); URL.revokeObjectURL(url);
	};

	const handleNeExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",           key: "_no",      align: "center" },
			{ header: "รหัส LOT",    key: "lotCode" },
			{ header: "รหัสสินค้า",  key: "itemCode" },
			{ header: "ชื่อสินค้า",  key: "itemName" },
			{ header: "คลัง",        key: "warehouse" },
			{ header: "จำนวน",       key: "qty",      align: "right" },
			{ header: "วันหมดอายุ",  key: "dateFmt",  align: "center" },
			{ header: "คงเหลือ",     key: "daysLabel", align: "center" },
		];
		const pdfRows = neFiltered.map((r, i) => ({
			_no: String(i + 1), lotCode: r.lotCode, itemCode: r.itemCode, itemName: r.itemName,
			warehouse: r.warehouse, qty: r.quantity.toLocaleString() + " " + r.unit,
			dateFmt: fmtDate(r.expiredAt), daysLabel: getUrgencyLabel(r.daysLeft),
		}));
		printAsPdf(`รายงานสินค้าใกล้หมดอายุ (ภายใน ${neDays} วัน)`, neWarehouse ? `คลัง: ${neWarehouse}` : "ทุกคลัง", columns, pdfRows);
	};

	// Close all dropdowns on outside click
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-ls-cat]")) setIsCatOpen(false);
			if (!target.closest("[data-filter-ls-wh]")) setIsWhOpen(false);
			if (!target.closest("[data-filter-ne-days]")) setIsDaysOpen(false);
			if (!target.closest("[data-filter-ne-wh]")) setIsNeWhOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-3xl font-bold text-gray-800">รายงานแจ้งเตือนสต็อก</h2>
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 text-sm font-semibold transition-colors"
					>
						ย้อนกลับ
					</button>
				)}
			</div>

			{/* Tabs */}
			<div className="flex border-b border-slate-200 mb-6">
				{(["low-stock", "near-expiry"] as ActiveTab[]).map((tab) => (
					<button
						key={tab}
						type="button"
						onClick={() => setActiveTab(tab)}
						className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-colors ${
							activeTab === tab
								? "border-blue-600 text-blue-700"
								: "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
						}`}
					>
						{tab === "low-stock" && <><AlertTriangle className="w-4 h-4" />สินค้าต่ำกว่า Min Stock ({lsRows.length})</>}
						{tab === "near-expiry" && <><Clock className="w-4 h-4" />สินค้าใกล้หมดอายุ{neFetched ? ` (${neRows.length})` : ""}</>}
					</button>
				))}
			</div>

			{/* ─── LOW STOCK TAB ─── */}
			{activeTab === "low-stock" && (
				<>
					<div className="flex flex-wrap gap-3 mb-5 items-center">
						{/* Search */}
						<div className="relative w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหารหัส / ชื่อสินค้า..."
								value={lsSearch}
								onChange={(e) => setLsSearch(e.target.value)}
								className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
							/>
						</div>

						{/* Category */}
						<div className="relative" data-filter-ls-cat>
							<button
								type="button"
								onClick={() => { setIsCatOpen((o) => !o); setIsWhOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[170px]"
							>
								<span className="flex-1 text-left">{lsCategory}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCatOpen ? "rotate-180" : ""}`} />
							</button>
							{isCatOpen && (
								<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] max-h-56 overflow-y-auto">
									{lsCategoryOptions.map((c) => (
										<button key={c} type="button"
											onClick={() => { setLsCategory(c); setIsCatOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${lsCategory === c ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
										>
											{c}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Warehouse */}
						<div className="relative" data-filter-ls-wh>
							<button
								type="button"
								onClick={() => { setIsWhOpen((o) => !o); setIsCatOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[150px]"
							>
								<span className="flex-1 text-left">{lsWarehouse}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWhOpen ? "rotate-180" : ""}`} />
							</button>
							{isWhOpen && (
								<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-56 overflow-y-auto">
									{lsWarehouseOptions.map((w) => (
										<button key={w} type="button"
											onClick={() => { setLsWarehouse(w); setIsWhOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${lsWarehouse === w ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
										>
											{w}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="ml-auto flex items-center gap-2">					{(lsSearch || lsCategory !== "หมวดหมู่ทั้งหมด" || lsWarehouse !== "ทุกคลัง") && (
						<button
							type="button"
							onClick={() => {
								setLsSearch("");
								setLsCategory("หมวดหมู่ทั้งหมด");
								setLsWarehouse("ทุกคลัง");
								setLsPage(1);
							}}
							className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
						>
							<X className="w-3.5 h-3.5" />
							ล้างตัวกรอง
						</button>
					)}						<button type="button" title="Export CSV" onClick={handleLsExportCsv}
							className="relative flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-all shadow-sm shrink-0">
							<CsvIcon />
						</button>
						<button type="button" title="Export PDF" onClick={handleLsExportPdf}
							className="relative flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-all shadow-sm shrink-0">
							<PdfIcon />
							</button>
						</div>
					</div>

					<div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden relative flex flex-col" style={{ height: "55vh" }}>
						{lsFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
							</div>
						)}
						<div className="flex-1 overflow-auto">
					<style>{`
						div::-webkit-scrollbar {
							width: 0;
							height: 8px;
						}
						div::-webkit-scrollbar-track {
							background: #f1f5f9;
						}
						div::-webkit-scrollbar-thumb {
							background: #cbd5e1;
							border-radius: 4px;
						}
						div::-webkit-scrollbar-thumb:hover {
							background: #94a3b8;
						}
					`}</style>
					<table className="w-full text-sm text-left table-fixed min-w-[900px]">
						<thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
							<tr>
								<th className="px-6 py-4 w-[46px] text-center">#</th>
								<th className="px-6 py-4 w-[110px]">รหัสสินค้า</th>
								<th className="px-6 py-4 w-[220px]">ชื่อสินค้า</th>
								<th className="px-6 py-4 w-[140px]">หมวดหมู่</th>
								<th className="px-6 py-4 w-[130px]">คลัง</th>
								<th className="px-6 py-4 w-[110px]">สต็อกที่ใช้ได้</th>
								<th className="px-6 py-4 w-[100px]">Min Stock</th>
								<th className="px-6 py-4 w-[80px]">ขาด</th>
								<th className="px-6 py-4 w-[100px]">หน่วย</th>
								<th className="px-6 py-4 w-[120px]">สถานะ</th>
							</tr>
						</thead>
						<tbody className="text-slate-600">
							{lsPageItems.length > 0 ? lsPageItems.map((item, idx) => (
								<tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
									<td className="px-6 py-3 w-[46px] text-center text-slate-400">{(lsPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
									<td className="px-6 py-3 w-[110px] font-mono text-slate-600">{item.code}</td>
									<td className="px-6 py-3 w-[220px] font-mono text-slate-600 truncate">{item.name}</td>
									<td className="px-6 py-3 w-[140px] font-mono text-slate-600">{item.category}</td>
									<td className="px-6 py-3 w-[130px] font-mono text-slate-600">{item.warehouse}</td>
									<td className="px-6 py-3 w-[110px] text-left font-mono text-slate-600 tabular-nums">{item.availableStock.toLocaleString()}</td>
									<td className="px-6 py-3 w-[100px] text-left font-mono text-slate-600 tabular-nums">{item.minStock.toLocaleString()}</td>
									<td className="px-6 py-3 w-[80px] text-left font-mono text-slate-600 tabular-nums">{item.shortfall.toLocaleString()}</td>
									<td className="px-6 py-3 w-[100px] font-mono text-slate-600">{item.unit}</td>
									<td className="px-6 py-3 w-[120px] text-left font-mono text-slate-600">{getStockLabel(item)}</td>
								</tr>
							)) : (
								<tr>
									<td colSpan={10} className="text-center py-16">
										<p className="text-sm text-slate-500">ไม่พบสินค้าต่ำกว่า Min Stock</p>
									</td>
								</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex items-center justify-between mt-4">
						<p className="text-sm text-slate-500">
							แสดง {lsPageItems.length} จาก {lsFiltered.length} รายการ
						</p>
						<div className="flex items-center gap-2">
							<button type="button" disabled={lsPage === 1} onClick={() => setLsPage((p) => p - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
							<span className="text-sm font-medium px-1">หน้า {lsPage} / {lsTotalPages}</span>
							<button type="button" disabled={lsPage >= lsTotalPages} onClick={() => setLsPage((p) => p + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
						</div>
					</div>
				</>
			)}

			{/* ─── NEAR EXPIRY TAB ─── */}
			{activeTab === "near-expiry" && (
				<>
					<div className="flex flex-wrap gap-3 mb-5 items-center">
						<div className="relative w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหา LOT / รหัส / ชื่อสินค้า..."
								value={neSearch}
								onChange={(e) => setNeSearch(e.target.value)}
								className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
							/>
						</div>

						{/* Days filter */}
						<div className="relative" data-filter-ne-days>
							<button
								type="button"
								onClick={() => { setIsDaysOpen((o) => !o); setIsNeWhOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[160px]"
							>
								<Clock className="w-4 h-4 text-slate-400" />
								<span className="flex-1 text-left">ภายใน {neDays} วัน</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDaysOpen ? "rotate-180" : ""}`} />
							</button>
							{isDaysOpen && (
								<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[150px]">
									{(["30", "60", "90"] as const).map((d) => (
										<button key={d} type="button"
											onClick={() => { setNeDays(d); setIsDaysOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${neDays === d ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
										>
											ภายใน {d} วัน
										</button>
									))}
								</div>
							)}
						</div>

						{/* Warehouse filter */}
						<div className="relative" data-filter-ne-wh>
							<button
								type="button"
								onClick={() => { setIsNeWhOpen((o) => !o); setIsDaysOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[150px]"
							>
								<span className="flex-1 text-left">{neWarehouse}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isNeWhOpen ? "rotate-180" : ""}`} />
							</button>
							{isNeWhOpen && (
								<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-56 overflow-y-auto">
									{neWarehouseOptions.map((w) => (
										<button key={w} type="button"
											onClick={() => { setNeWarehouse(w); setIsNeWhOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${neWarehouse === w ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
										>
											{w}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="ml-auto flex items-center gap-2">					{(neSearch || neWarehouse !== "ทุกคลัง") && (
						<button
							type="button"
							onClick={() => {
								setNeSearch("");
								setNeWarehouse("ทุกคลัง");
								setNePage(1);
							}}
							className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
						>
							<X className="w-3.5 h-3.5" />
							ล้างตัวกรอง
						</button>
					)}						<button type="button" title="Export CSV" onClick={handleNeExportCsv}
							className="relative flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-all shadow-sm shrink-0">
							<CsvIcon />
						</button>
						<button type="button" title="Export PDF" onClick={handleNeExportPdf}
							className="relative flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-all shadow-sm shrink-0">
							<PdfIcon />
							</button>
						</div>
					</div>

					<div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden relative flex flex-col" style={{ height: "55vh" }}>
						{neFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
							</div>
						)}
						<div className="flex-1 overflow-auto">
							<style>{`
								div::-webkit-scrollbar {
									width: 0;
									height: 8px;
								}
								div::-webkit-scrollbar-track {
									background: #f1f5f9;
								}
								div::-webkit-scrollbar-thumb {
									background: #cbd5e1;
									border-radius: 4px;
								}
								div::-webkit-scrollbar-thumb:hover {
									background: #94a3b8;
								}
							`}</style>
							<table className="w-full text-sm text-left table-fixed min-w-[900px]">
								<thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
									<tr>
										<th className="px-6 py-4 w-[46px] text-center">#</th>
										<th className="px-6 py-4 w-[120px]">รหัส LOT</th>
										<th className="px-6 py-4 w-[120px]">รหัสสินค้า</th>
										<th className="px-6 py-4 w-[230px]">ชื่อสินค้า</th>
										<th className="px-6 py-4 w-[150px]">คลัง</th>
										<th className="px-6 py-4 w-[90px]">จำนวน</th>
										<th className="px-6 py-4 w-[90px]">หน่วย</th>
										<th className="px-6 py-4 w-[120px]">วันหมดอายุ</th>
										<th className="px-6 py-4 w-[120px]">คงเหลือ</th>
									</tr>
								</thead>
								<tbody className="text-slate-600">
									{nePageItems.length > 0 ? nePageItems.map((r, idx) => (
										<tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
											<td className="px-6 py-3 w-[46px] text-center text-slate-400">{(nePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
											<td className="px-6 py-3 w-[120px] font-mono text-slate-600">{r.lotCode}</td>
											<td className="px-6 py-3 w-[120px] font-mono text-slate-600">{r.itemCode}</td>
											<td className="px-6 py-3 w-[230px] font-mono text-slate-600">{r.itemName}</td>
											<td className="px-6 py-3 w-[150px] font-mono text-slate-600">{r.warehouse}</td>
											<td className="px-6 py-3 w-[90px] text-left font-mono text-slate-600 tabular-nums">{r.quantity.toLocaleString()}</td>
											<td className="px-6 py-3 w-[90px] font-mono text-slate-600">{r.unit}</td>
											<td className="px-6 py-3 w-[120px] font-mono text-slate-600 whitespace-nowrap">{fmtDate(r.expiredAt)}</td>
											<td className="px-6 py-3 w-[120px] text-left font-mono text-slate-600">{getUrgencyLabel(r.daysLeft)}</td>
										</tr>
									)) : (
										<tr>
											<td colSpan={9} className="text-center py-16">
												<AlertTriangle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
												<p className="text-sm text-slate-500">ไม่พบสินค้าใกล้หมดอายุภายใน {neDays} วัน</p>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>

					<div className="flex items-center justify-between mt-4">
						<p className="text-sm text-slate-500">แสดง {nePageItems.length} จาก {neFiltered.length} รายการ</p>
						<div className="flex items-center gap-2">
							<button type="button" disabled={nePage === 1} onClick={() => setNePage((p) => p - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
							<span className="text-sm font-medium px-1">หน้า {nePage} / {neTotalPages}</span>
							<button type="button" disabled={nePage >= neTotalPages} onClick={() => setNePage((p) => p + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default LowStockReportClient;
