"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Search,
	XCircle,
} from "lucide-react";
import type { UiItem } from "@/services/itemsService";
import {
	getLowStockSeverity,
	getLowStockShortfall,
	getLowStockStatusLabel,
	isBelowMinStock,
} from "./lowStockReportUtils";

interface LowStockReportClientProps {
	initialItems: UiItem[];
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

const LowStockReportClient: React.FC<LowStockReportClientProps> = ({
	initialItems,
	onBack,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
	const [selectedWarehouse, setSelectedWarehouse] = useState("ทั้งหมด");
	const [currentPage, setCurrentPage] = useState(1);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);

	const lowStockItems = useMemo(() => {
		return [...initialItems]
			.filter(isBelowMinStock)
			.sort((left, right) => {
				const severityDiff = getLowStockSeverity(right) - getLowStockSeverity(left);
				if (severityDiff !== 0) {
					return severityDiff;
				}

				const shortfallDiff = getLowStockShortfall(right) - getLowStockShortfall(left);
				if (shortfallDiff !== 0) {
					return shortfallDiff;
				}

				return left.name.localeCompare(right.name, "th");
			});
	}, [initialItems]);

	const categoryOptions = useMemo(
		() => ["ทั้งหมด", ...Array.from(new Set(lowStockItems.map((item) => item.category).filter(Boolean)))],
		[lowStockItems]
	);

	const warehouseOptions = useMemo(
		() => ["ทั้งหมด", ...Array.from(new Set(lowStockItems.map((item) => item.location).filter(Boolean)))],
		[lowStockItems]
	);

	const filteredItems = useMemo(() => {
		const keyword = searchTerm.trim().toLowerCase();

		return lowStockItems.filter((item) => {
			const matchesSearch =
				!keyword ||
				item.code.toLowerCase().includes(keyword) ||
				item.name.toLowerCase().includes(keyword) ||
				item.category.toLowerCase().includes(keyword) ||
				item.location.toLowerCase().includes(keyword);

			const matchesCategory =
				selectedCategory === "ทั้งหมด" || item.category === selectedCategory;

			const matchesWarehouse =
				selectedWarehouse === "ทั้งหมด" || item.location === selectedWarehouse;

			return matchesSearch && matchesCategory && matchesWarehouse;
		});
	}, [lowStockItems, searchTerm, selectedCategory, selectedWarehouse]);

	const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const currentItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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
			["รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "หน่วย", "คงเหลือ", "Min Stock", "ส่วนต่าง", "ระดับสต็อก"].join(","),
			...filteredItems.map((item) => [
				item.code,
				item.name,
				item.category,
				item.location,
				item.unit,
				item.stock,
				item.minStock,
				getLowStockShortfall(item),
				getLowStockStatusLabel(item),
			].join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `รายงานสต็อกต่ำ_${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานสินค้าต่ำกว่า Min Stock</h2>
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
						placeholder="ค้นหาชื่อ / รหัส / หมวดหมู่ / คลัง..."
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
						<span className="text-slate-800 font-medium">{selectedCategory === "ทั้งหมด" ? "หมวดหมู่ทั้งหมด" : selectedCategory}</span>
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
											{category === "ทั้งหมด" ? "หมวดหมู่ทั้งหมด" : category}
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
						<span className="text-slate-800 font-medium">{selectedWarehouse === "ทั้งหมด" ? "คลังทั้งหมด" : selectedWarehouse}</span>
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
											{warehouse === "ทั้งหมด" ? "คลังทั้งหมด" : warehouse}
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

			<div className="space-y-6">
				<div
					className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col"
					style={{ height: "65vh" }}
				>
					<div
						className="flex-1"
						style={{
							overflowX: "auto",
							overflowY: "auto",
							scrollbarWidth: "auto",
							msOverflowStyle: "auto",
						} as React.CSSProperties}
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
							<thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
								<tr>
									<th className="px-6 py-4 w-[60px] text-center">#</th>
									<th className="px-6 py-4 w-[130px]">รหัสสินค้า</th>
									<th className="px-6 py-4 w-[240px]">ชื่อสินค้า</th>
									<th className="px-6 py-4 w-[150px]">หมวดหมู่</th>
									<th className="px-6 py-4 w-[150px]">คลัง</th>
									<th className="px-6 py-4 w-[100px] text-right">คงเหลือ</th>
									<th className="px-6 py-4 w-[110px] text-right">Min Stock</th>
									<th className="px-6 py-4 w-[100px] text-right">ส่วนต่าง</th>
									<th className="px-6 py-4 w-[150px]">สถานะ</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 text-slate-700">
								{currentItems.length > 0 ? (
									currentItems.map((item, index) => {
										const rowNumber = startIndex + index + 1;
										const shortfall = getLowStockShortfall(item);

										return (
											<tr key={item.id} className="hover:bg-slate-50 transition-colors">
												<td className="px-6 py-4 text-center font-medium text-slate-600">{rowNumber}</td>
												<td className="px-6 py-4 font-mono text-sm text-slate-600">{item.code}</td>
												<td className="px-6 py-4">
													<div className="font-semibold text-slate-800 line-clamp-2" title={item.name}>{item.name}</div>
													<div className="text-xs text-slate-500 mt-1">{item.unit}</div>
												</td>
												<td className="px-6 py-4 text-slate-600">{item.category}</td>
												<td className="px-6 py-4 text-slate-600">{item.location}</td>
												<td className="px-6 py-4 text-right text-slate-900">{item.stock.toLocaleString()}</td>
												<td className="px-6 py-4 text-right text-slate-900">{item.minStock.toLocaleString()}</td>
												<td className="px-6 py-4 text-right text-red-600 font-semibold">{shortfall.toLocaleString()}</td>
												<td className="px-6 py-4">
													<span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800">
														{getLowStockStatusLabel(item)}
													</span>
												</td>
											</tr>
										);
									})
								) : (
									<tr>
										<td colSpan={9}>
											<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
												<XCircle className="w-12 h-12 text-slate-300" />
												<p className="text-sm font-medium">ไม่พบข้อมูลสินค้าต่ำกว่า Min Stock</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</div>

				<div className="flex items-center justify-between mt-6">
					<p className="text-sm text-slate-500">แสดง {currentItems.length} จาก {filteredItems.length} รายการ</p>
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
		</div>
	);
};

export default LowStockReportClient;
