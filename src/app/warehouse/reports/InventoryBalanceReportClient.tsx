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
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { apiClient } from "@/lib/apiClient";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";

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
		return { label: "ต่ำกว่า Min", cls: "" };
	return { label: "ปกติ", cls: "" };
};

const ITEMS_PER_PAGE = 10;

const InventoryBalanceReportClient: React.FC<InventoryBalanceReportClientProps> = ({ onBack }) => {
	const [warehouses, setWarehouses] = useState<WarehouseGroup[]>([]);
	const [totalItems, setTotalItems] = useState(0);
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

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-warehouse]")) setIsWarehouseOpen(false);
			if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
			if (!target.closest("[data-filter-unit]")) setIsUnitOpen(false);
			if (!target.closest("[data-filter-stock-level]")) setIsStockLevelOpen(false);
		};
		if (isWarehouseOpen || isCategoryOpen || isUnitOpen || isStockLevelOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isWarehouseOpen, isCategoryOpen, isUnitOpen, isStockLevelOpen]);

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const res = await apiClient.get<ApiResponse>("/v1/reports/inventory-balance");
			const data = res.data as ApiResponse;
			setWarehouses(data.warehouses ?? []);
			setTotalItems(data.totalItems ?? 0);
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
		{ value: "ต่ำกว่า Min", label: "ต่ำกว่า Min" },
		{ value: "หมดสต็อก", label: "หมดสต็อก" },
	], []);

	const handleExportCsv = () => {
		const header = ["คลัง", "รหัสรายการ", "ชื่อพัสดุ", "หมวดหมู่", "หน่วย", "คงเหลือ", "จำนวนขั้นต่ำ", "ระดับสต็อก"];
		const rows: string[][] = [];
		filteredWarehouses.forEach((g) => {
			g.items.forEach((item) => {
				rows.push([
					g.warehouse,
					item.code,
					item.name,
					item.category,
					item.unit,
					String(item.currentStock),
					item.minStock > 0 ? String(item.minStock) : "-",
					getStockLevel(item).label,
				].map((v) => `"${v}"`));
			});
		});
		const blob = new Blob(["\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `รายงานคงคลังรายคลัง_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",           key: "_no",       align: "center" },
			{ header: "คลัง",        key: "warehouse" },
			{ header: "รหัสรายการ",  key: "code" },
			{ header: "ชื่อพัสดุ",  key: "name" },
			{ header: "หมวดหมู่",    key: "category" },
			{ header: "หน่วย",       key: "unit" },
			{ header: "คงเหลือ",     key: "stock",    align: "right" },
			{ header: "จำนวนขั้นต่ำ",   key: "minStock",  align: "right" },
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
					stock:     item.currentStock.toLocaleString(),
					minStock:  item.minStock > 0 ? item.minStock.toLocaleString() : "-",
					level:     getStockLevel(item).label,
				});
			});
		});
		printAsPdf(
			"รายงานคงคลังรายคลัง",
			selectedWarehouse ? `คลัง: ${selectedWarehouse}` : "ทุกคลัง",
			columns,
			pdfRows,
		);
	};

	// Summary totals
	const grandBelowMin = filteredWarehouses.reduce((s, g) => s + g.belowMin, 0);
	const grandTotalStock = filteredWarehouses.reduce((s, g) => s + g.totalStock, 0);

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานคงคลังรายคลัง</h2>
				</div>
				<div className="flex items-center gap-3">
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
			</div>


			{/* Filters + actions */}
			<div className="flex flex-wrap gap-3 mb-6 items-center">
				<div className="relative w-64">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหารหัส / ชื่อพัสดุ / หมวดหมู่..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				{/* Warehouse filter */}
				<div className="relative" data-filter-warehouse>
					<button
						type="button"
						onClick={() => setIsWarehouseOpen((o) => !o)}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedWarehouse || "ทุกคลัง"}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWarehouseOpen ? "rotate-180" : ""}`} />
					</button>
					{isWarehouseOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{warehouseOptions.map((o) => (
									<li key={o.value}>
										<button
											type="button"
											onClick={() => { setSelectedWarehouse(o.value); setIsWarehouseOpen(false); setCurrentPage(1); }}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedWarehouse === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{o.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Category filter */}
				<div className="relative" data-filter-category>
					<button
						type="button"
						onClick={() => { setIsCategoryOpen((o) => !o); setIsWarehouseOpen(false); setIsUnitOpen(false); setIsStockLevelOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedCategory || "ทุกหมวดหมู่"}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
					</button>
					{isCategoryOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{categoryOptions.map((o) => (
									<li key={o.value}>
										<button
											type="button"
											onClick={() => { setSelectedCategory(o.value); setIsCategoryOpen(false); setCurrentPage(1); }}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{o.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Unit filter */}
				<div className="relative" data-filter-unit>
					<button
						type="button"
						onClick={() => { setIsUnitOpen((o) => !o); setIsWarehouseOpen(false); setIsCategoryOpen(false); setIsStockLevelOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedUnit || "ทุกหน่วย"}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUnitOpen ? "rotate-180" : ""}`} />
					</button>
					{isUnitOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{unitOptions.map((o) => (
									<li key={o.value}>
										<button
											type="button"
											onClick={() => { setSelectedUnit(o.value); setIsUnitOpen(false); setCurrentPage(1); }}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedUnit === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{o.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/* Stock Level filter */}
				<div className="relative" data-filter-stock-level>
					<button
						type="button"
						onClick={() => { setIsStockLevelOpen((o) => !o); setIsWarehouseOpen(false); setIsCategoryOpen(false); setIsUnitOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedStockLevel || "ทุกระดับสต็อก"}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStockLevelOpen ? "rotate-180" : ""}`} />
					</button>
					{isStockLevelOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{stockLevelOptions.map((o) => (
									<li key={o.value}>
										<button
											type="button"
											onClick={() => { setSelectedStockLevel(o.value); setIsStockLevelOpen(false); setCurrentPage(1); }}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStockLevel === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
					{(searchTerm || selectedWarehouse || selectedCategory || selectedUnit || selectedStockLevel) && (
						<button
							type="button"
							onClick={() => {
								setSearchTerm("");
								setSelectedWarehouse("");
								setSelectedCategory("");
								setSelectedUnit("");
								setSelectedStockLevel("");
								setCurrentPage(1);
							}}
							className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
						>
							<X className="w-3.5 h-3.5" />
							ล้างตัวกรอง
						</button>
					)}
					<button
						type="button"
						title="Export PDF"
						onClick={handleExportPdf}
						className="relative flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-all shadow-sm"
					>
						<PdfIcon />
					</button>
					<button
						type="button"
						title="Export CSV"
						onClick={handleExportCsv}
						className="relative flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-all shadow-sm"
					>
						<CsvIcon />
					</button>
				</div>
			</div>

			{/* Content */}
			<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: "63vh" }}>
				{isFetching && (
					<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
						<div className="animate-spin">
							<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
						</div>
					</div>
				)}
				<div 
					className="flex-1 overflow-auto"
					style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
				>
					<style>{`
						div::-webkit-scrollbar {
							display: none;
						}
					`}</style>
					<table className="w-full text-sm text-left table-fixed min-w-[1000px]">
						<thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
							<tr>
								<th className="px-6 py-4 w-[50px] text-center">#</th>
								<th className="px-6 py-4 w-[160px]">คลัง</th>
								<th className="px-6 py-4 w-[130px]">รหัสรายการ</th>
								<th className="px-6 py-4 w-[280px]">ชื่อพัสดุ</th>
								<th className="px-6 py-4 w-[160px]">หมวดหมู่</th>
								<th className="px-6 py-4 w-[100px]">คงเหลือ</th>
								<th className="px-6 py-4 w-[100px]">จำนวนขั้นต่ำ</th>
								<th className="px-6 py-4 w-[80px]">หน่วย</th>
								<th className="px-6 py-4 w-[130px]">ระดับสต็อก</th>
							</tr>
						</thead>
						<tbody className="text-slate-600">
							{paginatedItems.length > 0 ? (
								paginatedItems.map((item, idx) => {
									const lvl = getStockLevel(item);
									return (
										<tr key={`${item.warehouse}-${item.id}`} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
											<td className="px-6 py-4 text-center">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
											<td className="px-6 py-4 text-slate-600">{item.warehouse}</td>
											<td className="px-6 py-4 font-mono text-slate-600">{item.code}</td>
											<td className="px-6 py-4 text-slate-600">{item.name}</td>
											<td className="px-6 py-4 text-slate-600">{item.category}</td>
										<td className="px-6 py-4 text-slate-600">
											{item.currentStock.toLocaleString()}
										</td>
										<td className="px-6 py-4 text-slate-600">
											{item.minStock > 0 ? item.minStock.toLocaleString() : "-"}
										</td>
										<td className="px-6 py-4 text-slate-500">{item.unit}</td>
										<td className="px-6 py-4 text-slate-600">
												{lvl.label}
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={9} className="text-center py-16">
										<Warehouse className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบข้อมูลคงคลัง</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between mt-6">
				<p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {allItemsFlattened.length.toLocaleString()} รายการ</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => p - 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setCurrentPage((p) => p + 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default InventoryBalanceReportClient;
