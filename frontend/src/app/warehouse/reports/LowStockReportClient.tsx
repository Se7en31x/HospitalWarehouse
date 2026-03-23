"use client";

import React, { useState, useMemo } from "react";
import {
	TrendingDown,
	Search,
	Download,
	AlertTriangle,
} from "lucide-react";
import type { UiItem } from "@/services/itemsService";

interface LowStockReportClientProps {
	initialItems: UiItem[];
}

const LowStockReportClient: React.FC<LowStockReportClientProps> = ({
	initialItems,
}) => {
	const [searchTerm, setSearchTerm] = useState("");

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
		// Sort by severity: lower ratio = more critical
		items.sort((a, b) => {
			const ratioA = a.minStock > 0 ? a.stock / a.minStock : 1;
			const ratioB = b.minStock > 0 ? b.stock / b.minStock : 1;
			return ratioA - ratioB;
		});
		return items;
	}, [initialItems, searchTerm]);

	const criticalCount = initialItems.filter(
		(i) => i.minStock > 0 && i.stock === 0
	).length;
	const warningCount = initialItems.filter(
		(i) => i.minStock > 0 && i.stock > 0 && i.stock <= i.minStock
	).length;

	const getSeverity = (item: UiItem) => {
		if (item.stock === 0) {
			return {
				label: "หมดสต็อก",
				color: "bg-red-100 text-red-700",
				barColor: "bg-red-500",
			};
		}
		const ratio = item.minStock > 0 ? item.stock / item.minStock : 1;
		if (ratio <= 0.5) {
			return {
				label: "วิกฤต",
				color: "bg-red-100 text-red-700",
				barColor: "bg-red-500",
			};
		}
		return {
			label: "ต่ำ",
			color: "bg-amber-100 text-amber-700",
			barColor: "bg-amber-500",
		};
	};

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 sm:p-6">
			{/* Summary cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
				<div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
					<div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit mb-2">
						<TrendingDown className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-slate-800">
						{initialItems.length}
					</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						สินค้าต่ำกว่า Min Stock ทั้งหมด
					</p>
				</div>
				<div className="bg-white rounded-2xl border border-red-200 shadow-sm p-4">
					<div className="p-2 bg-red-100 text-red-600 rounded-lg w-fit mb-2">
						<AlertTriangle className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-red-600">{criticalCount}</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						หมดสต็อก (0 ชิ้น)
					</p>
				</div>
				<div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-4">
					<div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit mb-2">
						<TrendingDown className="w-4 h-4" />
					</div>
					<p className="text-2xl font-bold text-amber-600">{warningCount}</p>
					<p className="text-xs text-slate-500 font-medium mt-0.5">
						ต่ำกว่าเกณฑ์
					</p>
				</div>
			</div>

			{/* Search + Export */}
			<div className="bg-white rounded-xl shadow-sm p-4 sm:p-5 mb-6">
				<div className="flex items-center justify-between">
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
					<button
						onClick={() => {
							const csv = [
								["รหัส", "ชื่อสินค้า", "หมวดหมู่", "คลัง", "หน่วย", "คงเหลือ", "Min Stock", "สถานะ"].join(","),
								...filteredItems.map((i) => {
									const sev = getSeverity(i);
									return [i.code, i.name, i.category, i.location, i.unit, i.stock, i.minStock, sev.label].join(",");
								}),
							].join("\n");
							const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
							const url = URL.createObjectURL(blob);
							const a = document.createElement("a");
							a.href = url;
							a.download = `รายงานสินค้าต่ำกว่าMin_${new Date().toISOString().slice(0, 10)}.csv`;
							a.click();
							URL.revokeObjectURL(url);
						}}
						className="flex items-center gap-1.5 px-3 py-2 bg-hospital text-white rounded-lg hover:bg-hospital-dark transition-colors text-sm ml-3"
					>
						<Download className="w-4 h-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl shadow-sm overflow-hidden">
				<div className="px-4 sm:px-5 py-3 border-b border-gray-200">
					<h2 className="text-sm font-semibold text-gray-900">
						รายการสินค้าต่ำกว่า Min Stock ({filteredItems.length})
					</h2>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 text-left">
								<th className="px-4 py-3 font-medium text-gray-600 w-8">#</th>
								<th className="px-4 py-3 font-medium text-gray-600">รหัส</th>
								<th className="px-4 py-3 font-medium text-gray-600">ชื่อสินค้า</th>
								<th className="px-4 py-3 font-medium text-gray-600">หมวดหมู่</th>
								<th className="px-4 py-3 font-medium text-gray-600">คลัง</th>
								<th className="px-4 py-3 font-medium text-gray-600 text-right">
									คงเหลือ
								</th>
								<th className="px-4 py-3 font-medium text-gray-600 text-right">
									Min Stock
								</th>
								<th className="px-4 py-3 font-medium text-gray-600 w-32">
									ระดับ
								</th>
								<th className="px-4 py-3 font-medium text-gray-600">สถานะ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filteredItems.length > 0 ? (
								filteredItems.map((item, idx) => {
									const severity = getSeverity(item);
									const ratio =
										item.minStock > 0
											? Math.min((item.stock / item.minStock) * 100, 100)
											: 0;
									return (
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
											<td className="px-4 py-3 text-right font-semibold text-gray-900">
												{item.stock.toLocaleString()}
											</td>
											<td className="px-4 py-3 text-right text-gray-500">
												{item.minStock.toLocaleString()}
											</td>
											<td className="px-4 py-3">
												<div className="w-full bg-gray-200 rounded-full h-2">
													<div
														className={`h-2 rounded-full ${severity.barColor} transition-all`}
														style={{ width: `${ratio}%` }}
													/>
												</div>
												<p className="text-[10px] text-gray-400 mt-0.5">
													{item.stock}/{item.minStock}
												</p>
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${severity.color}`}
												>
													{severity.label}
												</span>
											</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={9} className="text-center py-12">
										<TrendingDown className="w-10 h-10 text-gray-300 mx-auto mb-2" />
										<p className="text-sm text-gray-500">
											{initialItems.length === 0
												? "ไม่มีสินค้าที่ต่ำกว่า Min Stock"
												: "ไม่พบรายการที่ตรงกับการค้นหา"}
										</p>
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

export default LowStockReportClient;
