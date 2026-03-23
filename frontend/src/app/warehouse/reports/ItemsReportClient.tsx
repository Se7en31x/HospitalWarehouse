"use client";

import React, { useState, useMemo } from "react";
import {
	Package,
	Search,
	Download,
	Filter,
	ChevronDown,
	ChevronUp,
	ArrowUpDown,
} from "lucide-react";
import type { UiItem } from "@/services/itemsService";

interface ItemsReportClientProps {
	initialItems: UiItem[];
}

type SortField = "code" | "name" | "category" | "stock" | "location";
type SortDir = "asc" | "desc";

const ItemsReportClient: React.FC<ItemsReportClientProps> = ({
	initialItems,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [warehouseFilter, setWarehouseFilter] = useState("all");
	const [showFilters, setShowFilters] = useState(false);
	const [sortField, setSortField] = useState<SortField>("code");
	const [sortDir, setSortDir] = useState<SortDir>("asc");

	// Unique categories & warehouses
	const categories = useMemo(
		() => Array.from(new Set(initialItems.map((i) => i.category).filter(Boolean))),
		[initialItems]
	);
	const warehouses = useMemo(
		() => Array.from(new Set(initialItems.map((i) => i.location).filter(Boolean))),
		[initialItems]
	);

	// Filter + sort
	const filteredItems = useMemo(() => {
		let items = [...initialItems];

		if (searchTerm) {
			const s = searchTerm.toLowerCase();
			items = items.filter(
				(i) =>
					i.code.toLowerCase().includes(s) ||
					i.name.toLowerCase().includes(s) ||
					i.category.toLowerCase().includes(s)
			);
		}
		if (categoryFilter !== "all") {
			items = items.filter((i) => i.category === categoryFilter);
		}
		if (warehouseFilter !== "all") {
			items = items.filter((i) => i.location === warehouseFilter);
		}

		items.sort((a, b) => {
			const va = a[sortField] ?? "";
			const vb = b[sortField] ?? "";
			if (typeof va === "number" && typeof vb === "number") {
				return sortDir === "asc" ? va - vb : vb - va;
			}
			return sortDir === "asc"
				? String(va).localeCompare(String(vb), "th")
				: String(vb).localeCompare(String(va), "th");
		});

		return items;
	}, [initialItems, searchTerm, categoryFilter, warehouseFilter, sortField, sortDir]);

	const handleSort = (field: SortField) => {
		if (sortField === field) {
			setSortDir((d) => (d === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDir("asc");
		}
	};

	const SortIcon = ({ field }: { field: SortField }) => {
		if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
		return sortDir === "asc" ? (
			<ChevronUp className="w-3 h-3 text-hospital" />
		) : (
			<ChevronDown className="w-3 h-3 text-hospital" />
		);
	};

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

	// Summary stats
	const totalStock = initialItems.reduce((s, i) => s + i.stock, 0);
	const lowStockCount = initialItems.filter(
		(i) => i.minStock > 0 && i.stock <= i.minStock
	).length;

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
					<div className="p-2 bg-blue-100 text-blue-600 rounded-lg w-fit mb-2">
						<Package className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-slate-800">
						{initialItems.length.toLocaleString()}
					</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						รายการสินค้าทั้งหมด
					</p>
				</div>
				<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
					<div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg w-fit mb-2">
						<Package className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-slate-800">
						{totalStock.toLocaleString()}
					</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						จำนวนคงเหลือรวม
					</p>
				</div>
				<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
					<div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit mb-2">
						<Package className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-slate-800">{lowStockCount}</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						สินค้าต่ำกว่า Min Stock
					</p>
				</div>
			</div>

			{/* Filters */}
			<div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6">
				<div className="flex items-center justify-between mb-3">
					<div className="relative flex-1 max-w-md">
						<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
						<input
							type="text"
							placeholder="ค้นหาด้วยรหัส, ชื่อ หรือหมวดหมู่..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hospital focus:border-transparent text-sm"
						/>
					</div>
					<div className="flex items-center gap-2 ml-3">
						<button
							onClick={() => setShowFilters(!showFilters)}
							className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
						>
							<Filter className="w-4 h-4" />
							ตัวกรอง
						</button>
						<button
							onClick={() => {
								// Simple CSV export
								const csv = [
									["รหัส", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "หน่วย", "คงเหลือ", "Min Stock"].join(","),
									...filteredItems.map((i) =>
										[i.code, i.name, i.category, i.location, i.unit, i.stock, i.minStock].join(",")
									),
								].join("\n");
								const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
								const url = URL.createObjectURL(blob);
								const a = document.createElement("a");
								a.href = url;
								a.download = `รายงานสินค้าทั้งหมด_${new Date().toISOString().slice(0, 10)}.csv`;
								a.click();
								URL.revokeObjectURL(url);
							}}
							className="flex items-center gap-1.5 px-3 py-2 bg-hospital text-white rounded-lg hover:bg-hospital-dark transition-colors text-sm"
						>
							<Download className="w-4 h-4" />
							Export CSV
						</button>
					</div>
				</div>

				{showFilters && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-3 mt-3">
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								หมวดหมู่
							</label>
							<select
								value={categoryFilter}
								onChange={(e) => setCategoryFilter(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-hospital focus:border-transparent"
							>
								<option value="all">ทั้งหมด</option>
								{categories.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-xs font-medium text-gray-700 mb-1">
								คลังสินค้า
							</label>
							<select
								value={warehouseFilter}
								onChange={(e) => setWarehouseFilter(e.target.value)}
								className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-hospital focus:border-transparent"
							>
								<option value="all">ทั้งหมด</option>
								{warehouses.map((w) => (
									<option key={w} value={w}>
										{w}
									</option>
								))}
							</select>
						</div>
					</div>
				)}
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl shadow-sm overflow-hidden">
				<div className="px-4 sm:px-5 py-3 border-b border-gray-200 flex items-center justify-between">
					<h2 className="text-sm font-semibold text-gray-900">
						รายการสินค้า ({filteredItems.length.toLocaleString()})
					</h2>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 text-left">
								<th className="px-4 py-3 font-medium text-gray-600 w-8">#</th>
								<th
									className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-hospital"
									onClick={() => handleSort("code")}
								>
									<span className="flex items-center gap-1">
										รหัส <SortIcon field="code" />
									</span>
								</th>
								<th
									className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-hospital"
									onClick={() => handleSort("name")}
								>
									<span className="flex items-center gap-1">
										ชื่อสินค้า <SortIcon field="name" />
									</span>
								</th>
								<th
									className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-hospital"
									onClick={() => handleSort("category")}
								>
									<span className="flex items-center gap-1">
										หมวดหมู่ <SortIcon field="category" />
									</span>
								</th>
								<th
									className="px-4 py-3 font-medium text-gray-600 cursor-pointer select-none hover:text-hospital"
									onClick={() => handleSort("location")}
								>
									<span className="flex items-center gap-1">
										คลัง <SortIcon field="location" />
									</span>
								</th>
								<th className="px-4 py-3 font-medium text-gray-600">หน่วย</th>
								<th
									className="px-4 py-3 font-medium text-gray-600 text-right cursor-pointer select-none hover:text-hospital"
									onClick={() => handleSort("stock")}
								>
									<span className="flex items-center justify-end gap-1">
										คงเหลือ <SortIcon field="stock" />
									</span>
								</th>
								<th className="px-4 py-3 font-medium text-gray-600 text-right">
									Min Stock
								</th>
								<th className="px-4 py-3 font-medium text-gray-600">สถานะ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredItems.length > 0 ? (
								filteredItems.map((item, idx) => (
									<tr
										key={item.id}
										className="hover:bg-gray-50 transition-colors"
									>
										<td className="px-4 py-3 text-gray-400 text-xs">
											{idx + 1}
										</td>
										<td className="px-4 py-3 font-mono text-xs text-gray-700">
											{item.code}
										</td>
										<td className="px-4 py-3 font-medium text-gray-900">
											{item.name}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{item.category}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{item.location}
										</td>
										<td className="px-4 py-3 text-gray-600">
											{item.unit}
										</td>
										<td className="px-4 py-3 text-right font-semibold text-gray-900">
											{item.stock.toLocaleString()}
										</td>
										<td className="px-4 py-3 text-right text-gray-500">
											{item.minStock > 0 ? item.minStock.toLocaleString() : "-"}
										</td>
										<td className="px-4 py-3">{getStockBadge(item)}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={9} className="text-center py-12">
										<Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
										<p className="text-sm text-gray-500">ไม่พบรายการสินค้า</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
};

export default ItemsReportClient;
