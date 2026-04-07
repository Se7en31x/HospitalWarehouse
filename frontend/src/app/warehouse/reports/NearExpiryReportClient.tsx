"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Search,
	AlertTriangle,
} from "lucide-react";
import type { ExpiringLot } from "@/services/dashboardService";
import {
	getNearExpiryWindowLabel,
	isNearExpiryDate,
} from "@/utils/nearExpiryUtils";

interface NearExpiryReportClientProps {
	initialLots: ExpiringLot[];
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

const formatDate = (dateStr: string | null) => {
	if (!dateStr) return "-";
	return new Date(dateStr).toLocaleDateString("th-TH", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
};

const NearExpiryReportClient: React.FC<NearExpiryReportClientProps> = ({
	initialLots,
	onBack,
}) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedWarehouse, setSelectedWarehouse] = useState("ทั้งหมด");
	const [daysFilter, setDaysFilter] = useState<"ทั้งหมด" | "30" | "60" | "90">("ทั้งหมด");
	const [currentPage, setCurrentPage] = useState(1);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
	const [isDaysOpen, setIsDaysOpen] = useState(false);

	const nearExpiryLots = useMemo(() => {
		return [...initialLots]
			.filter((lot) => isNearExpiryDate(lot.expired_at, 90))
			.sort((left, right) => new Date(left.expired_at || "").getTime() - new Date(right.expired_at || "").getTime());
	}, [initialLots]);

	const warehouseOptions = useMemo(
		() => ["ทั้งหมด", ...Array.from(new Set(nearExpiryLots.map((lot) => lot.warehouse_name).filter(Boolean)))],
		[nearExpiryLots]
	);

	const filteredLots = useMemo(() => {
		const keyword = searchTerm.trim().toLowerCase();

		return nearExpiryLots.filter((lot) => {
			const matchesSearch =
				!keyword ||
				lot.lot_code.toLowerCase().includes(keyword) ||
				lot.item_name.toLowerCase().includes(keyword) ||
				lot.item_code.toLowerCase().includes(keyword) ||
				lot.warehouse_name.toLowerCase().includes(keyword);

			const matchesWarehouse =
				selectedWarehouse === "ทั้งหมด" || lot.warehouse_name === selectedWarehouse;

			const matchesDays =
				daysFilter === "ทั้งหมด" || isNearExpiryDate(lot.expired_at, Number(daysFilter));

			return matchesSearch && matchesWarehouse && matchesDays;
		});
	}, [nearExpiryLots, searchTerm, selectedWarehouse, daysFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredLots.length / ITEMS_PER_PAGE));
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const currentItems = filteredLots.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedWarehouse, daysFilter]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-warehouse]")) setIsWarehouseOpen(false);
			if (!target.closest("[data-filter-days]")) setIsDaysOpen(false);
		};

		if (isWarehouseOpen || isDaysOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isWarehouseOpen, isDaysOpen]);

	const handleExportCsv = () => {
		const csvRows = [
			["รหัส LOT", "รหัสสินค้า", "ชื่อสินค้า", "คลัง", "จำนวน", "วันหมดอายุ", "สถานะ"].join(","),
			...filteredLots.map((lot) => [
				lot.lot_code,
				lot.item_code,
				lot.item_name,
				lot.warehouse_name,
				lot.quantity,
				formatDate(lot.expired_at),
				getNearExpiryWindowLabel(lot.expired_at),
			].join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `รายงานสินค้าใกล้หมดอายุ_${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานสินค้าใกล้หมดอายุ</h2>
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
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหา LOT / รหัสสินค้า / ชื่อสินค้า / คลัง..."
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				<div className="relative" data-filter-warehouse>
					<button
						type="button"
						onClick={() => {
							setIsWarehouseOpen(!isWarehouseOpen);
							setIsDaysOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[220px] justify-between"
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

				<div className="relative" data-filter-days>
					<button
						type="button"
						onClick={() => {
							setIsDaysOpen(!isDaysOpen);
							setIsWarehouseOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{daysFilter === "ทั้งหมด" ? "ทุกช่วงเวลา" : `ภายใน ${daysFilter} วัน`}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDaysOpen ? "rotate-180" : ""}`} />
					</button>
					{isDaysOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{["ทั้งหมด", "30", "60", "90"].map((value) => (
									<li key={value}>
										<button
											type="button"
											onClick={() => {
												setDaysFilter(value as "ทั้งหมด" | "30" | "60" | "90");
												setIsDaysOpen(false);
											}}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${daysFilter === value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{value === "ทั้งหมด" ? "ทุกช่วงเวลา" : `ภายใน ${value} วัน`}
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
					} as React.CSSProperties}
				>
					<style>{`div::-webkit-scrollbar { width: 0; height: 8px; } div::-webkit-scrollbar-track { background: #f1f5f9; } div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }`}</style>
					<table className="w-full text-sm text-left table-fixed">
						<thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
							<tr>
								<th className="px-6 py-4 w-[60px] text-center">#</th>
								<th className="px-6 py-4 w-[130px]">รหัส LOT</th>
								<th className="px-6 py-4 w-[130px]">รหัสสินค้า</th>
								<th className="px-6 py-4 w-[240px]">ชื่อสินค้า</th>
								<th className="px-6 py-4 w-[180px]">คลัง</th>
								<th className="px-6 py-4 w-[120px]">จำนวน</th>
								<th className="px-6 py-4 w-[120px]">วันหมดอายุ</th>
								<th className="px-6 py-4 w-[140px]">สถานะ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700">
							{currentItems.length > 0 ? (
								currentItems.map((lot, index) => {
									const rowNumber = startIndex + index + 1;
									return (
										<tr key={lot.id} className="hover:bg-slate-50 transition-colors">
											<td className="px-6 py-5 text-center font-medium text-slate-600">{rowNumber}</td>
											<td className="px-6 py-5 font-mono text-sm text-slate-600">{lot.lot_code}</td>
											<td className="px-6 py-5 font-mono text-sm text-slate-600">{lot.item_code}</td>
											<td className="px-6 py-5 text-slate-700">{lot.item_name}</td>
											<td className="px-6 py-5 text-slate-600">{lot.warehouse_name}</td>
											<td className="px-6 py-5 text-slate-900">{lot.quantity.toLocaleString()}</td>
											<td className="px-6 py-5 text-slate-700">{formatDate(lot.expired_at)}</td>
											<td className="px-6 py-5 text-slate-700">{getNearExpiryWindowLabel(lot.expired_at)}</td>
										</tr>
									);
								})
							) : (
								<tr>
									<td colSpan={8}>
										<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
											<AlertTriangle className="w-12 h-12 text-slate-300" />
											<p className="text-sm font-medium">ไม่พบข้อมูลสินค้าใกล้หมดอายุ</p>
										</div>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex items-center justify-between mt-6">
				<p className="text-sm text-slate-500">แสดง {currentItems.length} จาก {filteredLots.length} รายการ</p>
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

export default NearExpiryReportClient;
