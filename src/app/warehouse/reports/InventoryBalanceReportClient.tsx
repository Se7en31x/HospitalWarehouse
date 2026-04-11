"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	Download,
	FileText,
	RefreshCcw,
	Search,
	Warehouse,
} from "lucide-react";
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
		return { label: "หมดสต็อก", cls: "bg-rose-50 text-rose-700 border-rose-100" };
	if (item.minStock > 0 && item.currentStock <= item.minStock)
		return { label: "ต่ำกว่า Min", cls: "bg-amber-50 text-amber-700 border-amber-100" };
	return { label: "ปกติ", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" };
};

const InventoryBalanceReportClient: React.FC<InventoryBalanceReportClientProps> = ({ onBack }) => {
	const [warehouses, setWarehouses] = useState<WarehouseGroup[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [isFetching, setIsFetching] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(new Set());
	const [selectedWarehouse, setSelectedWarehouse] = useState("");
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);

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
		if (!searchTerm.trim()) return groups;
		const kw = searchTerm.trim().toLowerCase();
		return groups
			.map((g) => ({
				...g,
				items: g.items.filter(
					(item) =>
						item.name.toLowerCase().includes(kw) ||
						item.code.toLowerCase().includes(kw) ||
						item.category.toLowerCase().includes(kw),
				),
			}))
			.filter((g) => g.items.length > 0 || g.warehouse.toLowerCase().includes(kw));
	}, [warehouses, searchTerm, selectedWarehouse]);

	const toggleWarehouse = (name: string) => {
		setExpandedWarehouses((prev) => {
			const next = new Set(prev);
			if (next.has(name)) next.delete(name);
			else next.add(name);
			return next;
		});
	};

	const expandAll = () => setExpandedWarehouses(new Set(filteredWarehouses.map((g) => g.warehouse)));
	const collapseAll = () => setExpandedWarehouses(new Set());

	const warehouseOptions = useMemo(() => [
		{ value: "", label: "ทุกคลัง" },
		...warehouses.map((g) => ({ value: g.warehouse, label: g.warehouse })),
	], [warehouses]);

	const handleExportCsv = () => {
		const header = ["คลัง", "รหัสสินค้า", "ชื่อสินค้า", "หมวดหมู่", "หน่วย", "คงเหลือ", "Min Stock", "ระดับสต็อก"];
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
			{ header: "รหัสสินค้า",  key: "code" },
			{ header: "ชื่อสินค้า",  key: "name" },
			{ header: "หมวดหมู่",    key: "category" },
			{ header: "หน่วย",       key: "unit" },
			{ header: "คงเหลือ",     key: "stock",    align: "right" },
			{ header: "Min Stock",   key: "minStock",  align: "right" },
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
				<h2 className="text-3xl font-bold text-gray-800">รายงานคงคลังรายคลัง</h2>
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={loadData}
						disabled={isFetching}
						className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40"
						title="โหลดข้อมูลใหม่"
					>
						<RefreshCcw className={`w-4 h-4 text-slate-500 ${isFetching ? "animate-spin" : ""}`} />
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

			{/* Summary cards */}
			{!isFetching && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
					<div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
						<p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">จำนวนคลัง</p>
						<p className="text-2xl font-bold text-slate-800">{filteredWarehouses.length}</p>
					</div>
					<div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
						<p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">รายการสินค้า</p>
						<p className="text-2xl font-bold text-slate-800">{totalItems.toLocaleString()}</p>
					</div>
					<div className="rounded-xl border border-emerald-100 bg-emerald-50 px-5 py-4">
						<p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">รวมสต็อกทั้งหมด</p>
						<p className="text-2xl font-bold text-emerald-700">{grandTotalStock.toLocaleString()}</p>
					</div>
					<div className={`rounded-xl border px-5 py-4 ${grandBelowMin > 0 ? "border-rose-100 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
						<p className={`text-xs font-medium uppercase tracking-wide mb-1 ${grandBelowMin > 0 ? "text-rose-500" : "text-slate-500"}`}>
							ต่ำกว่า Min Stock
						</p>
						<p className={`text-2xl font-bold ${grandBelowMin > 0 ? "text-rose-700" : "text-slate-800"}`}>
							{grandBelowMin.toLocaleString()} รายการ
						</p>
					</div>
				</div>
			)}

			{/* Filters + actions */}
			<div className="flex flex-wrap gap-3 mb-5 items-center">
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหารหัส / ชื่อสินค้า / หมวดหมู่..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
					/>
				</div>

				{/* Warehouse filter */}
				<div className="relative">
					<button
						type="button"
						onClick={() => setIsWarehouseOpen((o) => !o)}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[160px]"
					>
						<span className="flex-1 text-left">{selectedWarehouse || "ทุกคลัง"}</span>
						<ChevronDown className="w-4 h-4 text-slate-400" />
					</button>
					{isWarehouseOpen && (
						<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] max-h-56 overflow-y-auto">
							{warehouseOptions.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => { setSelectedWarehouse(o.value); setIsWarehouseOpen(false); }}
									className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedWarehouse === o.value ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
								>
									{o.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Expand/collapse */}
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={expandAll}
						className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
					>
						ขยายทั้งหมด
					</button>
					<button
						type="button"
						onClick={collapseAll}
						className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
					>
						ย่อทั้งหมด
					</button>
				</div>

				<div className="ml-auto flex items-center gap-2">
					<button
						type="button"
						onClick={handleExportPdf}
						className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
					>
						<FileText className="w-4 h-4" />
						Export PDF
					</button>
					<button
						type="button"
						onClick={handleExportCsv}
						className="flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
					>
						<Download className="w-4 h-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* Content */}
			{isFetching ? (
				<div className="flex items-center justify-center h-64">
					<div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
				</div>
			) : filteredWarehouses.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-slate-400">
					<Warehouse className="w-12 h-12 mb-3" />
					<p className="text-sm font-medium">ไม่พบข้อมูลคงคลัง</p>
				</div>
			) : (
				<div className="space-y-3">
					{filteredWarehouses.map((group) => {
						const isExpanded = expandedWarehouses.has(group.warehouse);
						return (
							<div key={group.warehouse} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
								{/* Warehouse header row */}
								<button
									type="button"
									onClick={() => toggleWarehouse(group.warehouse)}
									className="w-full flex items-center gap-4 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
								>
									<ChevronRight
										className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
									/>
									<Warehouse className="w-4 h-4 text-emerald-600 flex-shrink-0" />
									<span className="font-semibold text-slate-800 text-[15px] flex-1">{group.warehouse}</span>
									<div className="flex items-center gap-4 text-sm">
										<span className="text-slate-500">
											{group.totalItems.toLocaleString()} รายการ
										</span>
										<span className="font-semibold text-slate-700">
											รวม {group.totalStock.toLocaleString()} หน่วย
										</span>
										{group.belowMin > 0 && (
											<span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-100">
												ต่ำกว่า Min: {group.belowMin}
											</span>
										)}
									</div>
								</button>

								{/* Expanded item table */}
								{isExpanded && (
									<div className="overflow-x-auto border-t border-slate-200">
										<table className="w-full text-sm text-left table-fixed">
											<thead>
												<tr className="bg-white text-slate-600 text-[12px] font-semibold uppercase border-b border-slate-100">
													<th className="px-5 py-3 w-[50px] text-center">#</th>
													<th className="px-5 py-3 w-[130px]">รหัสสินค้า</th>
													<th className="px-5 py-3 w-[280px]">ชื่อสินค้า</th>
													<th className="px-5 py-3 w-[160px]">หมวดหมู่</th>
													<th className="px-5 py-3 w-[80px]">หน่วย</th>
													<th className="px-5 py-3 w-[100px] text-right">คงเหลือ</th>
													<th className="px-5 py-3 w-[100px] text-right">Min Stock</th>
													<th className="px-5 py-3 w-[130px]">ระดับสต็อก</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-50 text-[13px]">
												{group.items.map((item, idx) => {
													const lvl = getStockLevel(item);
													return (
														<tr key={item.id} className="hover:bg-slate-50 transition-colors">
															<td className="px-5 py-3 text-center text-slate-400">{idx + 1}</td>
															<td className="px-5 py-3 font-mono text-slate-600">{item.code}</td>
															<td className="px-5 py-3 font-medium text-slate-900">{item.name}</td>
															<td className="px-5 py-3 text-slate-600">{item.category}</td>
															<td className="px-5 py-3 text-slate-500">{item.unit}</td>
															<td className={`px-5 py-3 text-right font-semibold tabular-nums ${item.minStock > 0 && item.currentStock <= item.minStock ? "text-rose-600" : "text-slate-800"}`}>
																{item.currentStock.toLocaleString()}
															</td>
															<td className="px-5 py-3 text-right text-slate-400 tabular-nums">
																{item.minStock > 0 ? item.minStock.toLocaleString() : "-"}
															</td>
															<td className="px-5 py-3">
																<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${lvl.cls}`}>
																	{lvl.label}
																</span>
															</td>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default InventoryBalanceReportClient;
