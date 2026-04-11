"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	AlertTriangle,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Download,
	FileText,
	RefreshCcw,
	Search,
	XCircle,
} from "lucide-react";
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

const ITEMS_PER_PAGE = 12;

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
		return "bg-red-50 text-red-700 border-red-200";
	return "bg-orange-50 text-orange-700 border-orange-200";
};

const getStockLabel = (item: LowStockItem) => {
	if (item.availableStock === 0) return "หมดสต็อก";
	return "ต่ำกว่า Min";
};

// Near Expiry urgency
const getUrgencyBadge = (daysLeft: number | null) => {
	if (daysLeft === null) return "bg-slate-100 text-slate-500 border-slate-200";
	if (daysLeft <= 30) return "bg-rose-50 text-rose-700 border-rose-100";
	if (daysLeft <= 60) return "bg-amber-50 text-amber-700 border-amber-100";
	return "bg-yellow-50 text-yellow-700 border-yellow-100";
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
	const [lsCategory, setLsCategory] = useState("");
	const [lsWarehouse, setLsWarehouse] = useState("");
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
		["", ...Array.from(new Set(lsRows.map((i) => i.category).filter(Boolean)))],
		[lsRows],
	);
	const lsWarehouseOptions = useMemo(() =>
		["", ...Array.from(new Set(lsRows.map((i) => i.warehouse).filter(Boolean)))],
		[lsRows],
	);

	const lsFiltered = useMemo(() => {
		const kw = lsSearch.trim().toLowerCase();
		return lsRows.filter((item) => {
			const matchKw = !kw || item.code.toLowerCase().includes(kw) || item.name.toLowerCase().includes(kw) || item.category.toLowerCase().includes(kw);
			const matchCat = !lsCategory || item.category === lsCategory;
			const matchWh  = !lsWarehouse || item.warehouse === lsWarehouse;
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
	const [neWarehouse, setNeWarehouse] = useState("");
	const [nePage, setNePage] = useState(1);
	const [isDaysOpen, setIsDaysOpen] = useState(false);
	const [isNeWhOpen, setIsNeWhOpen] = useState(false);

	const loadNearExpiry = useCallback(async () => {
		setNeFetching(true);
		try {
			const res = await apiClient.get<NearExpiryApiResponse>("/v1/reports/near-expiry", {
				params: { limit: 500, daysAhead: neDays },
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
		["", ...Array.from(new Set(neRows.map((r) => r.warehouse).filter(Boolean)))],
		[neRows],
	);

	const neFiltered = useMemo(() => {
		const kw = neSearch.trim().toLowerCase();
		return neRows.filter((r) => {
			const matchKw = !kw || r.lotCode.toLowerCase().includes(kw) || r.itemCode.toLowerCase().includes(kw) || r.itemName.toLowerCase().includes(kw);
			const matchWh = !neWarehouse || r.warehouse === neWarehouse;
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
		const close = () => { setIsCatOpen(false); setIsWhOpen(false); setIsDaysOpen(false); setIsNeWhOpen(false); };
		document.addEventListener("click", close);
		return () => document.removeEventListener("click", close);
	}, []);

	const outOfStockCount = lsRows.filter((i) => i.availableStock === 0).length;
	const belowMinCount   = lsRows.filter((i) => i.availableStock > 0).length;

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-3xl font-bold text-gray-800">รายงานแจ้งเตือนสต็อก</h2>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={loadLowStock}
						disabled={lsFetching}
						className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
						title="โหลดใหม่"
					>
						<RefreshCcw className={`w-4 h-4 text-slate-500 ${lsFetching ? "animate-spin" : ""}`} />
					</button>
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

			{/* Summary badges */}
			<div className="flex flex-wrap gap-3 mb-6">
				<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-100">
					<XCircle className="w-4 h-4 text-red-600" />
					<span className="text-sm font-semibold text-red-700">หมดสต็อก: {outOfStockCount} รายการ</span>
				</div>
				<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 border border-orange-100">
					<AlertTriangle className="w-4 h-4 text-orange-600" />
					<span className="text-sm font-semibold text-orange-700">ต่ำกว่า Min: {belowMinCount} รายการ</span>
				</div>
				{neFetched && (
					<div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 border border-rose-100">
						<Clock className="w-4 h-4 text-rose-600" />
						<span className="text-sm font-semibold text-rose-700">ใกล้หมดอายุ: {neRows.length} รายการ</span>
					</div>
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
								? "border-emerald-600 text-emerald-700"
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
								className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
							/>
						</div>

						{/* Category */}
						<div className="relative" onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => { setIsCatOpen((o) => !o); setIsWhOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[170px]"
							>
								<span className="flex-1 text-left">{lsCategory || "หมวดหมู่ทั้งหมด"}</span>
								<ChevronDown className="w-4 h-4 text-slate-400" />
							</button>
							{isCatOpen && (
								<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] max-h-56 overflow-y-auto">
									{lsCategoryOptions.map((c) => (
										<button key={c} type="button"
											onClick={() => { setLsCategory(c); setIsCatOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${lsCategory === c ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
										>
											{c || "หมวดหมู่ทั้งหมด"}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Warehouse */}
						<div className="relative" onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => { setIsWhOpen((o) => !o); setIsCatOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[150px]"
							>
								<span className="flex-1 text-left">{lsWarehouse || "ทุกคลัง"}</span>
								<ChevronDown className="w-4 h-4 text-slate-400" />
							</button>
							{isWhOpen && (
								<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-56 overflow-y-auto">
									{lsWarehouseOptions.map((w) => (
										<button key={w} type="button"
											onClick={() => { setLsWarehouse(w); setIsWhOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${lsWarehouse === w ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
										>
											{w || "ทุกคลัง"}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="ml-auto flex items-center gap-2">
							<button type="button" onClick={handleLsExportPdf}
								className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-semibold shadow-sm">
								<FileText className="w-4 h-4" /> Export PDF
							</button>
							<button type="button" onClick={handleLsExportCsv}
								className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-semibold shadow-sm">
								<Download className="w-4 h-4" /> Export CSV
							</button>
						</div>
					</div>

					<div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "55vh" }}>
						{lsFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
							</div>
						)}
						<div className="flex-1 overflow-auto">
							<table className="w-full text-sm text-left table-fixed min-w-[900px]">
								<thead>
									<tr className="bg-slate-50 text-slate-700 text-[12px] font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
										<th className="px-5 py-4 w-[46px] text-center">#</th>
										<th className="px-5 py-4 w-[110px]">รหัสสินค้า</th>
										<th className="px-5 py-4 w-[220px]">ชื่อสินค้า</th>
										<th className="px-5 py-4 w-[140px]">หมวดหมู่</th>
										<th className="px-5 py-4 w-[130px]">คลัง</th>
										<th className="px-5 py-4 w-[110px] text-right">สต็อกที่ใช้ได้</th>
										<th className="px-5 py-4 w-[100px] text-right">Min Stock</th>
										<th className="px-5 py-4 w-[80px] text-right">ขาด</th>
										<th className="px-5 py-4 w-[120px] text-center">สถานะ</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
									{lsPageItems.length > 0 ? lsPageItems.map((item, idx) => (
										<tr key={item.id} className="hover:bg-slate-50 transition-colors">
											<td className="px-5 py-4 text-center text-slate-400">{(lsPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
											<td className="px-5 py-4 font-mono text-slate-600">{item.code}</td>
											<td className="px-5 py-4">
												<div className="font-semibold text-slate-800 truncate">{item.name}</div>
												<div className="text-xs text-slate-400">{item.unit}{item.hasLots && <span className="ml-1 text-blue-400">[LOT]</span>}</div>
											</td>
											<td className="px-5 py-4 text-slate-600">{item.category}</td>
											<td className="px-5 py-4 text-slate-600">{item.warehouse}</td>
											<td className={`px-5 py-4 text-right tabular-nums ${getStockColor(item)}`}>
												{item.availableStock.toLocaleString()}
											</td>
											<td className="px-5 py-4 text-right text-slate-600 tabular-nums">{item.minStock.toLocaleString()}</td>
											<td className="px-5 py-4 text-right font-bold text-rose-700 tabular-nums">{item.shortfall.toLocaleString()}</td>
											<td className="px-5 py-4 text-center">
												<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStockBadge(item)}`}>
													{getStockLabel(item)}
												</span>
											</td>
										</tr>
									)) : (
										<tr>
											<td colSpan={9} className="text-center py-16">
												<XCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
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
							{lsRows.length > 0 && (
								<span className="ml-3 text-xs text-slate-400">
									(หมดสต็อก <span className="text-red-600 font-semibold">{outOfStockCount}</span> | ต่ำกว่า Min <span className="text-orange-500 font-semibold">{belowMinCount}</span>)
								</span>
							)}
						</p>
						<div className="flex items-center gap-2">
							<button type="button" disabled={lsPage === 1} onClick={() => setLsPage((p) => p - 1)} className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
							<span className="text-sm font-medium px-1">หน้า {lsPage} / {lsTotalPages}</span>
							<button type="button" disabled={lsPage >= lsTotalPages} onClick={() => setLsPage((p) => p + 1)} className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
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
								className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
							/>
						</div>

						{/* Days filter */}
						<div className="relative" onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => { setIsDaysOpen((o) => !o); setIsNeWhOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[160px]"
							>
								<Clock className="w-4 h-4 text-slate-400" />
								<span className="flex-1 text-left">ภายใน {neDays} วัน</span>
								<ChevronDown className="w-4 h-4 text-slate-400" />
							</button>
							{isDaysOpen && (
								<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[150px]">
									{(["30", "60", "90"] as const).map((d) => (
										<button key={d} type="button"
											onClick={() => { setNeDays(d); setIsDaysOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${neDays === d ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
										>
											ภายใน {d} วัน
										</button>
									))}
								</div>
							)}
						</div>

						{/* Warehouse filter */}
						<div className="relative" onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => { setIsNeWhOpen((o) => !o); setIsDaysOpen(false); }}
								className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[150px]"
							>
								<span className="flex-1 text-left">{neWarehouse || "ทุกคลัง"}</span>
								<ChevronDown className="w-4 h-4 text-slate-400" />
							</button>
							{isNeWhOpen && (
								<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px] max-h-56 overflow-y-auto">
									{neWarehouseOptions.map((w) => (
										<button key={w} type="button"
											onClick={() => { setNeWarehouse(w); setIsNeWhOpen(false); }}
											className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${neWarehouse === w ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
										>
											{w || "ทุกคลัง"}
										</button>
									))}
								</div>
							)}
						</div>

						<div className="ml-auto flex items-center gap-2">
							<button type="button" onClick={handleNeExportPdf}
								className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-semibold shadow-sm">
								<FileText className="w-4 h-4" /> Export PDF
							</button>
							<button type="button" onClick={handleNeExportCsv}
								className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 text-sm font-semibold shadow-sm">
								<Download className="w-4 h-4" /> Export CSV
							</button>
						</div>
					</div>

					<div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "55vh" }}>
						{neFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
							</div>
						)}
						<div className="flex-1 overflow-auto">
							<table className="w-full text-sm text-left table-fixed">
								<thead>
									<tr className="bg-slate-50 text-slate-700 text-[12px] font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
										<th className="px-5 py-4 w-[46px] text-center">#</th>
										<th className="px-5 py-4 w-[120px]">รหัส LOT</th>
										<th className="px-5 py-4 w-[120px]">รหัสสินค้า</th>
										<th className="px-5 py-4 w-[230px]">ชื่อสินค้า</th>
										<th className="px-5 py-4 w-[150px]">คลัง</th>
										<th className="px-5 py-4 w-[90px] text-right">จำนวน</th>
										<th className="px-5 py-4 w-[120px]">วันหมดอายุ</th>
										<th className="px-5 py-4 w-[120px]">คงเหลือ</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
									{nePageItems.length > 0 ? nePageItems.map((r, idx) => (
										<tr key={r.id} className="hover:bg-slate-50 transition-colors">
											<td className="px-5 py-4 text-center text-slate-400">{(nePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
											<td className="px-5 py-4 font-mono text-slate-600">{r.lotCode}</td>
											<td className="px-5 py-4 font-mono text-slate-600">{r.itemCode}</td>
											<td className="px-5 py-4 font-medium text-slate-900">{r.itemName}</td>
											<td className="px-5 py-4 text-slate-600">{r.warehouse}</td>
											<td className="px-5 py-4 text-right font-semibold tabular-nums text-slate-800">
												{r.quantity.toLocaleString()} <span className="text-slate-400 font-normal text-[11px]">{r.unit}</span>
											</td>
											<td className="px-5 py-4 text-slate-700 whitespace-nowrap">{fmtDate(r.expiredAt)}</td>
											<td className="px-5 py-4">
												<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getUrgencyBadge(r.daysLeft)}`}>
													{getUrgencyLabel(r.daysLeft)}
												</span>
											</td>
										</tr>
									)) : (
										<tr>
											<td colSpan={8} className="text-center py-16">
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
							<button type="button" disabled={nePage === 1} onClick={() => setNePage((p) => p - 1)} className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronLeft className="w-4 h-4" /></button>
							<span className="text-sm font-medium px-1">หน้า {nePage} / {neTotalPages}</span>
							<button type="button" disabled={nePage >= neTotalPages} onClick={() => setNePage((p) => p + 1)} className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"><ChevronRight className="w-4 h-4" /></button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default LowStockReportClient;
