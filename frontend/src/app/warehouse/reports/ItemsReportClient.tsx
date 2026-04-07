"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	Package,
	Search,
	Download,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import * as ItemSvc from "@/services/itemsService";
import type { UiItem } from "@/services/itemsService";

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
	const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
	const [currentPage, setCurrentPage] = useState(1);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
	const [isUnitOpen, setIsUnitOpen] = useState(false);
	const [isStatusOpen, setIsStatusOpen] = useState(false);
	const [categories, setCategories] = useState<{ name: string }[]>([]);
	const [warehouses, setWarehouses] = useState<{ name: string }[]>([]);
	const [units, setUnits] = useState<{ name: string }[]>([]);
	const itemsPerPage = 10;

	useEffect(() => {
		const loadOptions = async () => {
			try {
				const [categoryOptions, warehouseOptions, unitOptions] = await Promise.all([
					ItemSvc.getcategoriesOptions(),
					ItemSvc.getWarehousesOptions(),
					ItemSvc.getUnitsOptions(),
				]);

				setCategories(categoryOptions || []);
				setWarehouses(warehouseOptions || []);
				setUnits(unitOptions || []);
			} catch (error) {
				console.error("Load report filters failed", error);
			}
		};

		loadOptions();
	}, []);

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
	const filterStatuses = useMemo(
		() => ["สถานะทั้งหมด", ...Array.from(new Set(initialItems.map((item) => String(item.status)).filter(Boolean)))],
		[initialItems]
	);

	const filteredItems = useMemo(() => {
		let items = [...initialItems];

		if (searchTerm) {
			const normalizedSearch = searchTerm.toLowerCase();
			items = items.filter(
				(item) =>
					item.code.toLowerCase().includes(normalizedSearch) ||
					item.name.toLowerCase().includes(normalizedSearch) ||
					item.category.toLowerCase().includes(normalizedSearch)
			);
		}

		if (selectedCategory !== "หมวดหมู่ทั้งหมด") {
			items = items.filter((item) => item.category === selectedCategory);
		}
		if (selectedWarehouse !== "คลังทั้งหมด") {
			items = items.filter((item) => item.location === selectedWarehouse);
		}
		if (selectedUnit !== "หน่วยทั้งหมด") {
			items = items.filter((item) => item.unit === selectedUnit);
		}
		if (selectedStatus !== "สถานะทั้งหมด") {
			items = items.filter((item) => String(item.status) === selectedStatus);
		}

		return items;
	}, [initialItems, searchTerm, selectedCategory, selectedWarehouse, selectedUnit, selectedStatus]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

	const paginatedItems = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredItems.slice(start, start + itemsPerPage);
	}, [filteredItems, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedCategory, selectedWarehouse, selectedUnit, selectedStatus]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
			if (!target.closest("[data-filter-warehouse]")) setIsWarehouseOpen(false);
			if (!target.closest("[data-filter-unit]")) setIsUnitOpen(false);
			if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
		};

		if (isCategoryOpen || isWarehouseOpen || isUnitOpen || isStatusOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isCategoryOpen, isWarehouseOpen, isUnitOpen, isStatusOpen]);

	const getStockBadge = (item: UiItem) => {
		if (item.minStock > 0 && item.stock <= item.minStock) {
			return (
				<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
					ต่ำกว่า Min
				</span>
			);
		}
		return null;
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
						className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-semibold transition-colors flex items-center gap-1.5"
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
							setIsStatusOpen(false);
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
							setIsStatusOpen(false);
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
							setIsStatusOpen(false);
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

				<div className="relative" data-filter-status>
					<button
						type="button"
						onClick={() => {
							setIsStatusOpen(!isStatusOpen);
							setIsCategoryOpen(false);
							setIsWarehouseOpen(false);
							setIsUnitOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedStatus}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
					</button>
					{isStatusOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{[
									{ value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" },
									{ value: "ACTIVE", label: "เปิดใช้งาน" },
									{ value: "INACTIVE", label: "ระงับ" },
								].map((status) => (
									<li key={status.value}>
										<button
											type="button"
											onClick={() => {
											setSelectedStatus(status.value);
											setIsStatusOpen(false);
											setCurrentPage(1);
										}}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === status.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{status.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<button
							type="button"
							onClick={() => {
								const csvRows = [
									["รหัส", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "หน่วย", "คงเหลือ", "Min Stock"].join(","),
									...filteredItems.map((item) => [item.code, item.name, item.category, item.location, item.unit, item.stock, item.minStock].join(",")),
								].join("\n");
								const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
								const url = URL.createObjectURL(blob);
								const anchor = document.createElement("a");
								anchor.href = url;
								anchor.download = `รายงานสินค้าทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`;
								anchor.click();
								URL.revokeObjectURL(url);
							}}
							className="ml-auto flex items-center gap-2 px-4 py-2 bg-hospital text-white rounded-lg hover:bg-hospital-dark transition-colors text-sm font-medium shadow-sm shrink-0"
						>
							<Download className="w-4 h-4" />
							Export CSV
						</button>
					</div>

			<div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
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
						<thead>
							<tr className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
								<th className="px-6 py-4 w-[50px] text-center">#</th>
								<th className="px-6 py-4 w-[150px]">รหัส</th>
								<th className="px-6 py-4 w-[300px]">ชื่อสินค้า</th>
								<th className="px-6 py-4 w-[200px]">หมวดหมู่</th>
								<th className="px-6 py-4 w-[150px]">คลัง</th>
								<th className="px-6 py-4 w-[150px]">หน่วย</th>
								<th className="px-6 py-4 w-[150px] text-right">คงเหลือ</th>
								<th className="px-6 py-4 w-[150px] text-right">MIN STOCK</th>
								<th className="px-6 py-4 w-[100px]">สถานะ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700">
							{paginatedItems.length > 0 ? (
								paginatedItems.map((item, index) => (
									<tr key={item.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-6 py-4 text-slate-500 text-xs w-[50px]">{(currentPage - 1) * itemsPerPage + index + 1}</td>
										<td className="px-6 py-4 font-mono text-xs text-slate-700 w-[150px]">{item.code}</td>
										<td className="px-6 py-4 font-medium text-slate-900 w-[300px]">{item.name}</td>
										<td className="px-6 py-4 text-slate-600 w-[200px]">{item.category}</td>
										<td className="px-6 py-4 text-slate-600 w-[150px]">{item.location}</td>
										<td className="px-6 py-4 text-slate-600 w-[150px]">{item.unit}</td>
										<td className="px-6 py-4 text-right font-semibold text-slate-900 w-[150px]">{item.stock.toLocaleString()}</td>
										<td className="px-6 py-4 text-right text-slate-500 w-[150px]">{item.minStock > 0 ? item.minStock.toLocaleString() : "-"}</td>
										<td className="px-6 py-4 w-[100px]">{getStockBadge(item)}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={9} className="text-center py-12">
										<Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบรายการสินค้า</p>
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