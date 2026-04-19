"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	Package,
	Search,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	X,
} from "lucide-react";

const CsvIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		{/* Document body */}
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		{/* Folded corner */}
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		{/* Green badge */}
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#4caf6e"/>
		{/* CSV text */}
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">CSV</text>
	</svg>
);

const PdfIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		{/* Document body */}
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		{/* Folded corner */}
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		{/* Red badge */}
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#e53935"/>
		{/* PDF text */}
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
	</svg>
);
import * as ItemSvc from "@/services/itemsService";
import type { UiItem } from "@/services/itemsService";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";

interface ItemsReportClientProps {
	initialItems: UiItem[];
	onBack?: () => void;
}

const ItemsReportClient: React.FC<ItemsReportClientProps> = ({
	initialItems,
	onBack,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
	const [selectedWarehouse, setSelectedWarehouse] = useState("คลังทั้งหมด");
	const [selectedUnit, setSelectedUnit] = useState("หน่วยทั้งหมด");
	const [currentPage, setCurrentPage] = useState(1);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
	const [isUnitOpen, setIsUnitOpen] = useState(false);
	const [categories, setCategories] = useState<{ name: string }[]>([]);
	const [warehouses, setWarehouses] = useState<{ name: string }[]>([]);
	const [units, setUnits] = useState<{ name: string }[]>([]);
	const [items, setItems] = useState<UiItem[]>(initialItems);
	const [isLoadingItems, setIsLoadingItems] = useState(false);
	const itemsPerPage = 10;

	useEffect(() => {
		const loadData = async () => {
			try {
				setIsLoadingItems(true);
				const [categoryOptions, warehouseOptions, unitOptions, itemsData] = await Promise.all([
					ItemSvc.getcategoriesOptions(),
					ItemSvc.getWarehousesOptions(),
					ItemSvc.getUnitsOptions(),
					ItemSvc.getAllInventoryItems(),
				]);

				setCategories(categoryOptions || []);
				setWarehouses(warehouseOptions || []);
				setUnits(unitOptions || []);
				setItems(itemsData || initialItems);
			} catch (error) {
				console.error("Load report data failed", error);
				setItems(initialItems);
			} finally {
				setIsLoadingItems(false);
			}
		};

		loadData();
	}, [initialItems]);

	const filterCategories = useMemo(
		() => ["หมวดหมู่ทั้งหมด", ...categories.map((category) => category.name)],
		[categories]
	);
	const filterWarehouses = useMemo(
		() => ["คลังทั้งหมด", ...warehouses.map((warehouse) => warehouse.name)],
		[warehouses]
	);
	const filterUnits = useMemo(
		() => ["หน่วยทั้งหมด", ...units.map((unit) => unit.name)],
		[units]
	);


	const filteredItems = useMemo(() => {
		let filtered = [...items];

		if (searchTerm) {
			const normalizedSearch = searchTerm.toLowerCase();
			filtered = filtered.filter(
				(item) =>
					item.code.toLowerCase().includes(normalizedSearch) ||
					item.name.toLowerCase().includes(normalizedSearch) ||
					item.category.toLowerCase().includes(normalizedSearch)
			);
		}

		if (selectedCategory !== "หมวดหมู่ทั้งหมด") {
			filtered = filtered.filter((item) => item.category === selectedCategory);
		}
		if (selectedWarehouse !== "คลังทั้งหมด") {
			filtered = filtered.filter((item) => item.location === selectedWarehouse);
		}
		if (selectedUnit !== "หน่วยทั้งหมด") {
			filtered = filtered.filter((item) => item.unit === selectedUnit);
		}


		return filtered;
	}, [items, searchTerm, selectedCategory, selectedWarehouse, selectedUnit]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

	const paginatedItems = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredItems.slice(start, start + itemsPerPage);
	}, [filteredItems, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedCategory, selectedWarehouse, selectedUnit]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
			if (!target.closest("[data-filter-warehouse]")) setIsWarehouseOpen(false);
			if (!target.closest("[data-filter-unit]")) setIsUnitOpen(false);
		};

		if (isCategoryOpen || isWarehouseOpen || isUnitOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isCategoryOpen, isWarehouseOpen, isUnitOpen]);

	const handleExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",           key: "_no",      align: "center" },
			{ header: "รหัส",        key: "code" },
			{ header: "ชื่อสินค้า",  key: "name" },
			{ header: "หมวดหมู่",    key: "category" },
			{ header: "คลัง",        key: "location" },
			{ header: "คงเหลือ",     key: "stock",    align: "right" },
			{ header: "หน่วยนับ",    key: "unit" },
		];
		const pdfRows = filteredItems.map((item, i) => ({
			_no:      String(i + 1),
			code:     item.code,
			name:     item.name,
			category: item.category,
			location: item.location,
			stock:    item.stock.toLocaleString(),
			unit:     item.unit,
		}));
		printAsPdf("รายงานสินค้าทั้งหมด", `ค้นหา: "${searchTerm || "ทั้งหมด"}" | ${selectedCategory} | ${selectedWarehouse}`, columns, pdfRows);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานสินค้าทั้งหมด</h2>
				</div>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={onBack}
						className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 text-sm font-semibold transition-colors flex items-center gap-1.5"
					>
						ย้อนกลับ
					</button>
				</div>
			</div>

			<div className="flex flex-wrap gap-3 mb-6 items-center">
				<div className="relative w-64">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหาชื่อ / รหัส..."
						value={searchTerm}
						onChange={(event) => {
							setSearchTerm(event.target.value);
							setCurrentPage(1);
						}}
					className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				<div className="relative" data-filter-category>
					<button
						type="button"
						onClick={() => {
							setIsCategoryOpen(!isCategoryOpen);
							setIsWarehouseOpen(false);
							setIsUnitOpen(false);

						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedCategory}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
					</button>
					{isCategoryOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{filterCategories.map((category) => (
									<li key={category}>
										<button
											type="button"
											onClick={() => {
											setSelectedCategory(category);
											setIsCategoryOpen(false);
											setCurrentPage(1);
										}}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedCategory === category ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{category}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className="relative" data-filter-warehouse>
					<button
						type="button"
						onClick={() => {
							setIsWarehouseOpen(!isWarehouseOpen);
							setIsCategoryOpen(false);
							setIsUnitOpen(false);

						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedWarehouse}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWarehouseOpen ? "rotate-180" : ""}`} />
					</button>
					{isWarehouseOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{filterWarehouses.map((warehouse) => (
									<li key={warehouse}>
										<button
											type="button"
											onClick={() => {
											setSelectedWarehouse(warehouse);
											setIsWarehouseOpen(false);
											setCurrentPage(1);
										}}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedWarehouse === warehouse ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{warehouse}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className="relative" data-filter-unit>
					<button
						type="button"
						onClick={() => {
							setIsUnitOpen(!isUnitOpen);
							setIsCategoryOpen(false);
							setIsWarehouseOpen(false);

						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedUnit}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isUnitOpen ? "rotate-180" : ""}`} />
					</button>
					{isUnitOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{filterUnits.map((unit) => (
									<li key={unit}>
										<button
											type="button"
											onClick={() => {
											setSelectedUnit(unit);
											setIsUnitOpen(false);
											setCurrentPage(1);
										}}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedUnit === unit ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{unit}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
				{(searchTerm || selectedCategory !== "หมวดหมู่ทั้งหมด" || selectedWarehouse !== "คลังทั้งหมด" || selectedUnit !== "หน่วยทั้งหมด") && (
					<button
						type="button"
						onClick={() => {
							setSearchTerm("");
							setSelectedCategory("หมวดหมู่ทั้งหมด");
							setSelectedWarehouse("คลังทั้งหมด");
							setSelectedUnit("หน่วยทั้งหมด");
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
							onClick={() => {
								const csvRows = [
									["รหัส", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "คงเหลือ", "หน่วยนับ"].join(","),
									...filteredItems.map((item) => [item.code, item.name, item.category, item.location, item.stock, item.unit].join(",")),
								].join("\n");
								const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
								const url = URL.createObjectURL(blob);
								const anchor = document.createElement("a");
								anchor.href = url;
								anchor.download = `รายงานสินค้าทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`;
								anchor.click();
								URL.revokeObjectURL(url);
							}}
							className="ml-auto relative flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-all shadow-sm shrink-0"
						>
							<CsvIcon />
						</button>
						<button
							type="button"
							title="Export PDF"
							onClick={handleExportPdf}
							className="relative flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-all shadow-sm shrink-0"
						>
							<PdfIcon />
						</button>
					</div>

			<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm relative flex flex-col" style={{ height: "63vh" }}>
				{isLoadingItems && (
					<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
						<div className="animate-spin">
							<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
						</div>
					</div>
				)}
				<div
					className="flex-1"
					style={{
						overflowX: "auto",
						overflowY: "auto",
						scrollbarWidth: "auto",
						msOverflowStyle: "auto",
					}}
				>
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
					<table className="w-full text-sm text-left table-fixed">
						<thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
							<tr>
								<th className="px-6 py-4 w-[50px]">#</th>
								<th className="px-6 py-4 w-[150px]">รหัส</th>
								<th className="px-6 py-4 w-[300px]">ชื่อสินค้า</th>
								<th className="px-6 py-4 w-[200px]">หมวดหมู่</th>
								<th className="px-6 py-4 w-[150px]">คลัง</th>
								<th className="px-6 py-4 w-[120px]">คงเหลือ</th>
								<th className="px-6 py-4 w-[100px]">หน่วย</th>
							</tr>
						</thead>
						<tbody className="text-slate-600">
							{paginatedItems.map((item, idx) => (
								<tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
									<td className="px-6 py-4 w-[50px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
									<td className="px-6 py-4">{item.code}</td>
									<td className="px-6 py-4">{item.name}</td>
									<td className="px-6 py-4 text-slate-600">{item.category}</td>
									<td className="px-6 py-4 text-slate-600">{item.location}</td>
									<td className="px-6 py-4 text-slate-600">{item.stock.toLocaleString()}</td>
									<td className="px-6 py-4 text-slate-600">{item.unit}</td>
								</tr>
							))}
							{paginatedItems.length === 0 && !isLoadingItems && (
								<tr>
									<td colSpan={7}>
										<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
											<Package className="w-12 h-12 text-slate-300" />
											<p className="text-sm font-medium">ไม่พบข้อมูล</p>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex items-center justify-between mt-6">
				<p className="text-sm text-slate-500">แสดง {paginatedItems.length} จาก {filteredItems.length} รายการ</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((page) => page - 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setCurrentPage((page) => page + 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ItemsReportClient;