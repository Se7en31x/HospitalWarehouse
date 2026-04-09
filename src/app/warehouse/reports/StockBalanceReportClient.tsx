"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Search,
} from "lucide-react";
import type { UiItem } from "@/services/itemsService";

interface StockBalanceReportClientProps {
	initialItems: UiItem[];
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

const getStockLevelLabel = (item: UiItem) => {
	if (item.minStock > 0 && item.stock <= item.minStock) {
		return "ต่ำกว่า Min Stock";
	}
	return "ปกติ";
};

const StockBalanceReportClient: React.FC<StockBalanceReportClientProps> = ({
	initialItems,
	onBack,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("หมวดหมู่ทั้งหมด");
	const [selectedWarehouse, setSelectedWarehouse] = useState("คลังทั้งหมด");
	const [currentPage, setCurrentPage] = useState(1);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);

	const categoryOptions = useMemo(() => {
		const values = Array.from(new Set(initialItems.map((item) => item.category).filter(Boolean)));
		return ["หมวดหมู่ทั้งหมด", ...values];
	}, [initialItems]);

	const warehouseOptions = useMemo(() => {
		const values = Array.from(new Set(initialItems.map((item) => item.location).filter(Boolean)));
		return ["คลังทั้งหมด", ...values];
	}, [initialItems]);

	const filteredItems = useMemo(() => {
		let items = [...initialItems];

		if (searchTerm) {
			const keyword = searchTerm.trim().toLowerCase();
			items = items.filter(
				(item) =>
					item.code.toLowerCase().includes(keyword) ||
					item.name.toLowerCase().includes(keyword) ||
					item.category.toLowerCase().includes(keyword)
			);
		}

		if (selectedCategory !== "หมวดหมู่ทั้งหมด") {
			items = items.filter((item) => item.category === selectedCategory);
		}

		if (selectedWarehouse !== "คลังทั้งหมด") {
			items = items.filter((item) => item.location === selectedWarehouse);
		}

		return items;
	}, [initialItems, searchTerm, selectedCategory, selectedWarehouse]);

	const paginatedItems = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredItems.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredItems, currentPage]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedCategory, selectedWarehouse]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
			if (!target.closest("[data-filter-warehouse]")) setIsWarehouseOpen(false);
		};

		if (isCategoryOpen || isWarehouseOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isCategoryOpen, isWarehouseOpen]);

	const handleExportCsv = () => {
		const rows = [
			["รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "หน่วย", "คงเหลือ", "Min Stock", "ระดับสต็อก"].join(","),
			...filteredItems.map((item) => [
				item.code,
				item.name,
				item.category,
				item.location,
				item.unit,
				item.stock,
				item.minStock,
				getStockLevelLabel(item),
			].join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `รายงานคงคลัง_${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานคงคลัง</h2>
				</div>
				<div className="flex items-center gap-3">
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-semibold transition-colors flex items-center gap-1.5"
						>
							ย้อนกลับ
						</button>
					)}
				</div>
			</div>

			<div className="flex flex-wrap gap-3 mb-6 items-center">
				<div className="relative w-64">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหาชื่อ / รหัส / หมวดหมู่..."
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				<div className="relative" data-filter-category>
					<button
						type="button"
						onClick={() => {
							setIsCategoryOpen(!isCategoryOpen);
							setIsWarehouseOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedCategory}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
					</button>
					{isCategoryOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{categoryOptions.map((category) => (
									<li key={category}>
										<button
											type="button"
											onClick={() => {
												setSelectedCategory(category);
												setIsCategoryOpen(false);
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
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedWarehouse}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isWarehouseOpen ? "rotate-180" : ""}`} />
					</button>
					{isWarehouseOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{warehouseOptions.map((warehouse) => (
									<li key={warehouse}>
										<button
											type="button"
											onClick={() => {
												setSelectedWarehouse(warehouse);
												setIsWarehouseOpen(false);
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

				<button
					type="button"
					onClick={handleExportCsv}
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
					<style>{`div::-webkit-scrollbar { width: 0; height: 8px; } div::-webkit-scrollbar-track { background: #f1f5f9; } div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }`}</style>
					<table className="w-full text-sm text-left table-fixed">
						<thead>
							<tr className="bg-slate-50 text-slate-700 text-[13px] font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
								<th className="px-6 py-4 w-[60px] text-center">#</th>
								<th className="px-6 py-4 w-[150px]">รหัสสินค้า</th>
								<th className="px-6 py-4 w-[260px]">ชื่อสินค้า</th>
								<th className="px-6 py-4 w-[180px]">หมวดหมู่</th>
								<th className="px-6 py-4 w-[180px]">คลัง</th>
								<th className="px-6 py-4 w-[120px]">หน่วย</th>
								<th className="px-6 py-4 w-[120px]">คงเหลือ</th>
								<th className="px-6 py-4 w-[160px]">ระดับสต็อก</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
							{paginatedItems.length > 0 ? (
								paginatedItems.map((item, index) => (
									<tr key={item.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-6 py-5 w-[60px] text-center text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
										<td className="px-6 py-5 w-[150px] font-mono text-slate-700 font-normal">{item.code}</td>
										<td className="px-6 py-5 w-[260px] text-slate-900 font-normal">{item.name}</td>
										<td className="px-6 py-5 w-[180px] text-slate-700 font-normal">{item.category}</td>
										<td className="px-6 py-5 w-[180px] text-slate-700 font-normal">{item.location}</td>
										<td className="px-6 py-5 w-[120px] text-slate-700 font-normal">{item.unit}</td>
										<td className="px-6 py-5 w-[120px] text-slate-900 font-normal">{item.stock.toLocaleString()}</td>
										<td className="px-6 py-5 w-[160px] text-slate-700 font-normal">{getStockLevelLabel(item)}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={8} className="text-center py-12">
										<p className="text-sm text-slate-500">ไม่พบข้อมูลคงคลัง</p>
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
					<button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white">
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
					<button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white">
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default StockBalanceReportClient;