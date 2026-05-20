"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Search,
	Warehouse,
	X,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { formatReportPeriod } from "@/utils/dateUtils";
import { downloadCsv } from "@/utils/downloadCsv";
import { useUser } from "@/context/UserContext";
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

interface InventoryBalanceReportClientProps {
	onBack?: () => void;
}

interface ItemSummary {
	id: string;
	code: string;
	name: string;
	category: string;
	unit: string;
	currentStock: number;
	minStock: number;
}

interface WarehouseGroup {
	warehouse: string;
	items: ItemSummary[];
	totalItems: number;
	totalStock: number;
	belowMin: number;
}

interface ApiResponse {
	warehouses: WarehouseGroup[];
	totalItems: number;
}

const getStockLevel = (item: ItemSummary) => {
	if (item.minStock > 0 && item.currentStock === 0)
		return { label: "หมดสต็อก", cls: "" };
	if (item.minStock > 0 && item.currentStock <= item.minStock)
		return { label: "ต่ำกว่ากำหนด", cls: "" };
	return { label: "ปกติ", cls: "" };
};

const ITEMS_PER_PAGE = 10;

const InventoryBalanceReportClient: React.FC<InventoryBalanceReportClientProps> = ({ onBack }) => {
	const { profile } = useUser();
	const [warehouses, setWarehouses] = useState<WarehouseGroup[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedWarehouse, setSelectedWarehouse] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("");
	const [selectedUnit, setSelectedUnit] = useState("");
	const [selectedStockLevel, setSelectedStockLevel] = useState("");
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const [isUnitOpen, setIsUnitOpen] = useState(false);
	const [isStockLevelOpen, setIsStockLevelOpen] = useState(false);
	const [currentPage, setCurrentPage] = useState(1);

	const closeAllDropdowns = () => {
		setIsWarehouseOpen(false);
		setIsCategoryOpen(false);
		setIsUnitOpen(false);
		setIsStockLevelOpen(false);
	};

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const res = await apiClient.get<ApiResponse>("/v1/reports/inventory-balance");
			const data = res.data as ApiResponse;
			setWarehouses(data.warehouses ?? []);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลคงคลัง");
			setWarehouses([]);
		} finally {
			setIsFetching(false);
		}
	}, []);

	useEffect(() => { loadData(); }, [loadData]);

	const filteredWarehouses = useMemo(() => {
		let groups = warehouses;
		if (selectedWarehouse) {
			groups = groups.filter((g) => g.warehouse === selectedWarehouse);
		}
		if (!searchTerm.trim()) {
			// Apply category, unit, and stock level filters even without search
			return groups
				.map((g) => ({
					...g,
					items: g.items.filter((item) => {
						if (selectedCategory && item.category !== selectedCategory) return false;
						if (selectedUnit && item.unit !== selectedUnit) return false;
						if (selectedStockLevel) {
							const level = getStockLevel(item).label;
							if (level !== selectedStockLevel) return false;
						}
						return true;
					}),
				}))
				.filter((g) => g.items.length > 0);
		}
		const kw = searchTerm.trim().toLowerCase();
		return groups
			.map((g) => ({
				...g,
				items: g.items.filter(
					(item) =>
						(item.name.toLowerCase().includes(kw) ||
							item.code.toLowerCase().includes(kw) ||
							item.category.toLowerCase().includes(kw)) &&
					(!selectedCategory || item.category === selectedCategory) &&
					(!selectedUnit || item.unit === selectedUnit) &&
					(!selectedStockLevel || getStockLevel(item).label === selectedStockLevel),
			),
			}))
			.filter((g) => g.items.length > 0 || g.warehouse.toLowerCase().includes(kw));
	}, [warehouses, searchTerm, selectedWarehouse, selectedCategory, selectedUnit, selectedStockLevel]);

	const allItemsFlattened = useMemo(() => {
		const items: (ItemSummary & { warehouse: string })[] = [];
		filteredWarehouses.forEach(g => {
			g.items.forEach(item => {
				items.push({ ...item, warehouse: g.warehouse });
			});
		});
		return items;
	}, [filteredWarehouses]);

	const totalPages = Math.max(1, Math.ceil(allItemsFlattened.length / ITEMS_PER_PAGE));
	
	const paginatedItems = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return allItemsFlattened.slice(start, start + ITEMS_PER_PAGE);
	}, [allItemsFlattened, currentPage]);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedWarehouse, selectedCategory, selectedUnit, selectedStockLevel]);

	const warehouseOptions = useMemo(() => [
		{ value: "", label: "ทุกคลัง" },
		...warehouses.map((g) => ({ value: g.warehouse, label: g.warehouse })),
	], [warehouses]);

	const categoryOptions = useMemo(() => {
		const categories = Array.from(new Set(warehouses.flatMap(g => g.items.map(i => i.category)))).sort();
		return [
			{ value: "", label: "ทุกหมวดหมู่" },
			...categories.map(v => ({ value: v, label: v })),
		];
	}, [warehouses]);

	const unitOptions = useMemo(() => {
		const units = Array.from(new Set(warehouses.flatMap(g => g.items.map(i => i.unit)))).sort();
		return [
			{ value: "", label: "ทุกหน่วย" },
			...units.map(v => ({ value: v, label: v })),
		];
	}, [warehouses]);

	const stockLevelOptions = useMemo(() => [
		{ value: "", label: "ทุกระดับสต็อก" },
		{ value: "ปกติ", label: "ปกติ" },
		{ value: "ต่ำกว่ากำหนด", label: "ต่ำกว่ากำหนด" },
		{ value: "หมดสต็อก", label: "หมดสต็อก" },
	], []);

	const hasFilter = !!(searchTerm.trim() || selectedWarehouse || selectedCategory || selectedUnit || selectedStockLevel);

	const pdfSubtitle = useMemo(
		() =>
			[
				selectedWarehouse  ? `คลัง: ${selectedWarehouse}`            : null,
				selectedCategory   ? `หมวด: ${selectedCategory}`             : null,
				selectedUnit       ? `หน่วย: ${selectedUnit}`                : null,
				selectedStockLevel ? `ระดับสต็อก: ${selectedStockLevel}`     : null,
			].filter(Boolean).join(" | ") || undefined,
		[selectedWarehouse, selectedCategory, selectedUnit, selectedStockLevel],
	);

	const handleExportCsv = () => {
		const rows: (string | number)[][] = [];
		let i = 0;
		filteredWarehouses.forEach((g) => {
			g.items.forEach((item) => {
				rows.push([
					++i,
					g.warehouse,
					item.code,
					item.name,
					item.category,
					item.unit,
					item.currentStock,
					item.minStock > 0 ? item.minStock : "-",
					getStockLevel(item).label,
				]);
			});
		});
		downloadCsv({
			headers: ["#", "คลัง", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "หน่วย", "คงเหลือ", "ขั้นต่ำ", "ระดับสต็อก"],
			rows,
			filename: `รายงานคงคลังรายคลัง_${new Date().toISOString().slice(0, 10)}.csv`,
		});
	};

	const handleExportPdf = () => {
		const columns: PrintColumn[] = [
			{ header: "#",           key: "_no",       align: "center" },
			{ header: "คลัง",        key: "warehouse" },
			{ header: "รหัสรายการ",  key: "code" },
			{ header: "ชื่อพัสดุ",  key: "name" },
			{ header: "หมวดหมู่",    key: "category" },
			{ header: "หน่วย",       key: "unit" },
			{ header: "คงเหลือ",     key: "stock",    align: "right" },
			{ header: "ขั้นต่ำ",       key: "minStock",  align: "right" },
			{ header: "ระดับสต็อก",  key: "level",    align: "center" },
		];
		const pdfRows: Record<string, string>[] = [];
		let no = 1;
		filteredWarehouses.forEach((g) => {
			g.items.forEach((item) => {
				pdfRows.push({
					_no:       String(no++),
					warehouse: g.warehouse,
					code:      item.code,
					name:      item.name,
					category:  item.category,
					unit:      item.unit,
					stock:     String(item.currentStock),
					minStock:  item.minStock > 0 ? String(item.minStock) : "-",
					level:     getStockLevel(item).label,
				});
			});
		});
		printWarehouseReport({
			reportTitle:   "รายงานคงคลังรายคลัง",
			period:        formatReportPeriod(),
			filterSummary: pdfSubtitle,
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

	const filteredTotalStock = useMemo(
		() => allItemsFlattened.reduce((s, i) => s + i.currentStock, 0),
		[allItemsFlattened],
	);

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">
			<ReportDetailPageHeader
				reportPage="inventory-balance"
				title="รายงานคงคลังรายคลัง"
				subtitle="ระบบบริหารคลังสินค้า HPK"
				onBack={onBack}
			/>

			<div className="flex-1 px-8 py-6">
				<div
					className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
					onClick={closeAllDropdowns}
				>
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
						<div className="relative w-72" onClick={(e) => e.stopPropagation()}>
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหารหัส / ชื่อพัสดุ / หมวดหมู่..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full h-10 rounded-lg border border-slate-300 py-0 pl-9 pr-4 text-sm leading-none shadow-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 box-border"
							/>
						</div>

						<div className="relative min-w-[180px]" data-filter-warehouse onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => {
									setIsWarehouseOpen((o) => !o);
									setIsCategoryOpen(false);
									setIsUnitOpen(false);
									setIsStockLevelOpen(false);
								}}
								className="flex h-10 w-full items-center gap-2 border border-slate-300 rounded-lg px-3 py-0 text-sm leading-none bg-white shadow-sm hover:bg-slate-50 box-border justify-between"
							>
								<span className="flex-1 text-left text-slate-700 truncate">{warehouseOptions.find((o) => o.value === selectedWarehouse)?.label ?? "ทุกคลัง"}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isWarehouseOpen ? "rotate-180" : ""}`} />
							</button>
							{isWarehouseOpen && (
								<div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-full max-h-56 overflow-y-auto">
									<ul className="py-1">
										{warehouseOptions.map((o) => (
											<li key={o.value || "__all_wh"}>
												<button
													type="button"
													onClick={() => { setSelectedWarehouse(o.value); setIsWarehouseOpen(false); setCurrentPage(1); }}
													className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedWarehouse === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
												>
													{o.label}
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>

						<div className="relative min-w-[180px]" data-filter-category onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => {
									setIsCategoryOpen((o) => !o);
									setIsWarehouseOpen(false);
									setIsUnitOpen(false);
									setIsStockLevelOpen(false);
								}}
								className="flex h-10 w-full items-center gap-2 border border-slate-300 rounded-lg px-3 py-0 text-sm leading-none bg-white shadow-sm hover:bg-slate-50 box-border justify-between"
							>
								<span className="flex-1 text-left text-slate-700 truncate">{categoryOptions.find((o) => o.value === selectedCategory)?.label ?? "ทุกหมวดหมู่"}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
							</button>
							{isCategoryOpen && (
								<div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-full max-h-56 overflow-y-auto">
									<ul className="py-1">
										{categoryOptions.map((o) => (
											<li key={o.value || "__all_cat"}>
												<button
													type="button"
													onClick={() => { setSelectedCategory(o.value); setIsCategoryOpen(false); setCurrentPage(1); }}
													className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedCategory === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
												>
													{o.label}
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>

						<div className="relative min-w-[160px]" data-filter-unit onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => {
									setIsUnitOpen((o) => !o);
									setIsWarehouseOpen(false);
									setIsCategoryOpen(false);
									setIsStockLevelOpen(false);
								}}
								className="flex h-10 w-full items-center gap-2 border border-slate-300 rounded-lg px-3 py-0 text-sm leading-none bg-white shadow-sm hover:bg-slate-50 box-border justify-between"
							>
								<span className="flex-1 text-left text-slate-700 truncate">{unitOptions.find((o) => o.value === selectedUnit)?.label ?? "ทุกหน่วย"}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isUnitOpen ? "rotate-180" : ""}`} />
							</button>
							{isUnitOpen && (
								<div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-full max-h-56 overflow-y-auto">
									<ul className="py-1">
										{unitOptions.map((o) => (
											<li key={o.value || "__all_unit"}>
												<button
													type="button"
													onClick={() => { setSelectedUnit(o.value); setIsUnitOpen(false); setCurrentPage(1); }}
													className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedUnit === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
												>
													{o.label}
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>

						<div className="relative min-w-[190px]" data-filter-stock-level onClick={(e) => e.stopPropagation()}>
							<button
								type="button"
								onClick={() => {
									setIsStockLevelOpen((o) => !o);
									setIsWarehouseOpen(false);
									setIsCategoryOpen(false);
									setIsUnitOpen(false);
								}}
								className="flex h-10 w-full items-center gap-2 border border-slate-300 rounded-lg px-3 py-0 text-sm leading-none bg-white shadow-sm hover:bg-slate-50 box-border justify-between"
							>
								<span className="flex-1 text-left text-slate-700 truncate">{stockLevelOptions.find((o) => o.value === selectedStockLevel)?.label ?? "ทุกระดับสต็อก"}</span>
								<ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isStockLevelOpen ? "rotate-180" : ""}`} />
							</button>
							{isStockLevelOpen && (
								<div className="absolute top-full left-0 mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-full max-h-56 overflow-y-auto">
									<ul className="py-1">
										{stockLevelOptions.map((o) => (
											<li key={o.value || "__all_lvl"}>
												<button
													type="button"
													onClick={() => { setSelectedStockLevel(o.value); setIsStockLevelOpen(false); setCurrentPage(1); }}
													className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedStockLevel === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
												>
													{o.label}
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</div>

						<div className="ml-auto flex items-center gap-2">
							{hasFilter && (
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										setSearchTerm("");
										setSelectedWarehouse("");
										setSelectedCategory("");
										setSelectedUnit("");
										setSelectedStockLevel("");
										setCurrentPage(1);
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
								title="Export CSV (.csv)"
								onClick={(e) => { e.stopPropagation(); handleExportCsv(); }}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-sky-50 transition-all shadow-sm"
							>
								<CsvIcon />
							</button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-3 bg-white border-b border-slate-100 text-sm">
						<span className="text-slate-500">
							พบ <span className="font-semibold text-slate-800">{allItemsFlattened.length.toLocaleString()}</span> รายการ
							<span className="mx-2 text-slate-300">|</span>
							ยอดรวมคงเหลือ <span className="font-semibold text-slate-800">{filteredTotalStock.toLocaleString()}</span>
						</span>
					</div>

					<div className="relative w-full overflow-x-auto">
						{isFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full table-fixed text-sm text-left min-w-[1180px]">
							<thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
								<tr>
									<th className="px-4 py-4 w-[50px] text-center whitespace-nowrap">#</th>
									<th className="px-6 py-4 w-[168px] whitespace-nowrap">คลัง</th>
									<th className="px-3 py-4 w-[126px] whitespace-nowrap">รหัสรายการ</th>
									<th className="px-3 py-4 w-[220px] whitespace-nowrap">ชื่อพัสดุ</th>
									<th className="px-6 py-4 w-[160px] whitespace-nowrap">หมวดหมู่</th>
									<th className="px-6 py-4 w-[120px] whitespace-nowrap">คงเหลือ</th>
									<th className="px-6 py-4 w-[120px] whitespace-nowrap">ขั้นต่ำ</th>
									<th className="px-6 py-4 w-[88px] whitespace-nowrap">หน่วย</th>
									<th className="px-6 py-4 w-[140px] whitespace-nowrap">ระดับสต็อก</th>
								</tr>
							</thead>
							<tbody className="text-slate-600">
								{paginatedItems.length > 0 ? (
									paginatedItems.map((item, idx) => {
										const lvl = getStockLevel(item);
										const belowMin = item.minStock > 0 && item.currentStock <= item.minStock;
										const outOfStock = item.minStock > 0 && item.currentStock === 0;
										return (
											<tr key={`${item.warehouse}-${item.id}`} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
												<td className="px-6 py-3 text-center text-slate-600">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
												<td className="px-6 py-3 text-slate-600 truncate" title={item.warehouse}>{item.warehouse}</td>
												<td className="px-3 py-3">{item.code}</td>
												<td className="px-3 py-3">
													<span className="block truncate min-w-0" title={item.name}>{item.name}</span>
												</td>
												<td className="px-6 py-3 text-slate-600 truncate" title={item.category}>{item.category}</td>
												<td className={`px-6 py-3 w-[120px] font-bold ${outOfStock ? "text-red-500" : belowMin ? "text-orange-500" : "text-emerald-600"}`}>
													{item.currentStock}
												</td>
												<td className="px-6 py-3 w-[120px]">
													{item.minStock > 0 ? (
														<span className="text-black font-semibold">{item.minStock}</span>
													) : (
														<span className="text-black">-</span>
													)}
												</td>
												<td className="px-6 py-3 truncate max-w-0" title={item.unit}>{item.unit}</td>
												<td className="px-6 py-3 text-sm text-slate-600 truncate" title={lvl.label}>{lvl.label}</td>
											</tr>
										);
									})
								) : (
									<tr>
										<td colSpan={9}>
											<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
												<Warehouse className="w-12 h-12 text-slate-300" />
												<p className="text-sm font-medium">ไม่พบข้อมูลคงคลัง</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-sm text-slate-500">
							แสดง {paginatedItems.length.toLocaleString()} จาก {allItemsFlattened.length.toLocaleString()} รายการ
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
				</div>
			</div>
		</div>
	);
};

export default InventoryBalanceReportClient;
