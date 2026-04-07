"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Search,
	XCircle,
} from "lucide-react";
import { getLots } from "@/services/lotservice";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import type { ExpiringLot } from "@/services/dashboardService";
import type { UiLot } from "@/types/lot_type";

interface ExpiredLotsReportClientProps {
	initialLots: ExpiringLot[];
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

const formatDate = (dateStr?: string | null) => {
	if (!dateStr) return "-";
	const date = new Date(dateStr);
	return date.toLocaleDateString("th-TH", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
};

const calculateStatus = (expiryDateStr: string | null) => {
	if (!expiryDateStr) return "ปกติ";
	const now = new Date();
	const expiry = new Date(expiryDateStr);
	const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
	if (diffDays < 0) return "หมดอายุ";
	if (diffDays <= 30) return "ใกล้หมด";
	return "ปกติ";
};

const ExpiredLotsReportClient: React.FC<ExpiredLotsReportClientProps> = ({ onBack }) => {
	const [lots, setLots] = useState<UiLot[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
	const [statusFilter, setStatusFilter] = useState("EXPIRED");
	const [currentPage, setCurrentPage] = useState(1);
	const [isCategoryOpen, setIsCategoryOpen] = useState(false);
	const [isStatusOpen, setIsStatusOpen] = useState(false);

	const loadLots = useCallback(async () => {
		setLoading(true);
		try {
			const lotsData = await getLots(1, 10000);
			setLots(lotsData);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลล็อตหมดอายุ");
			setLots([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadLots();
	}, [loadLots]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-category]")) setIsCategoryOpen(false);
			if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
		};

		if (isCategoryOpen || isStatusOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isCategoryOpen, isStatusOpen]);

	const expiredLots = useMemo(() => {
		return lots.filter((lot) => calculateStatus(lot.expiryDate) === "หมดอายุ");
	}, [lots]);

	const categoryOptions = useMemo(
		() => ["ทั้งหมด", ...Array.from(new Set(expiredLots.map((lot) => lot.category).filter(Boolean)))],
		[expiredLots]
	);

	const filteredLots = useMemo(() => {
		const searchLower = searchTerm.trim().toLowerCase();

		return expiredLots.filter((lot) => {
			const name = lot.itemName || "";
			const code = lot.itemCode || "";
			const lotCode = lot.lotCode || "";
			const category = lot.category || "";
			const currentStatus = calculateStatus(lot.expiryDate);

			const matchesSearch =
				!searchLower ||
				name.toLowerCase().includes(searchLower) ||
				lotCode.toLowerCase().includes(searchLower) ||
				code.toLowerCase().includes(searchLower);

			const matchesCategory =
				selectedCategory === "ทั้งหมด" || category === selectedCategory;

			let matchesStatus = true;
			if (statusFilter === "EXPIRED") matchesStatus = currentStatus === "หมดอายุ";
			if (statusFilter === "ACTIVE") matchesStatus = lot.status === "ACTIVE";
			if (statusFilter === "INACTIVE") matchesStatus = lot.status !== "ACTIVE";

			return matchesSearch && matchesCategory && matchesStatus;
		});
	}, [expiredLots, searchTerm, selectedCategory, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredLots.length / ITEMS_PER_PAGE));
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const currentItems = filteredLots.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedCategory, statusFilter]);

	const handleExportCsv = () => {
		const csvRows = [
			["รหัสสินค้า", "รหัส LOT", "ชื่อสินค้า", "หมวดหมู่", "คงเหลือ", "วันหมดอายุ", "สถานะ"].join(","),
			...filteredLots.map((lot) => [
				lot.itemCode || "-",
				lot.lotCode || lot.id,
				lot.itemName || "-",
				lot.category || "-",
				`${lot.quantity.toLocaleString()} ${lot.unit || ""}`.trim(),
				formatDate(lot.expiryDate),
				lot.status !== "ACTIVE" ? "ระงับการใช้งาน" : "หมดอายุ",
			].join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `รายงานสินค้าหมดอายุ_${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานล็อตหมดอายุ</h2>
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
						placeholder="ค้นหา..."
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
							setIsStatusOpen(false);
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
												setCurrentPage(1);
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

				<div className="relative" data-filter-status>
					<button
						type="button"
						onClick={() => {
							setIsStatusOpen(!isStatusOpen);
							setIsCategoryOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{{ EXPIRED: "หมดอายุ", ACTIVE: "ใช้งานได้", INACTIVE: "ระงับการใช้งาน" }[statusFilter] || "หมดอายุ"}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
					</button>
					{isStatusOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{[
									{ value: "EXPIRED", label: "หมดอายุ" },
									{ value: "ACTIVE", label: "ใช้งานได้" },
									{ value: "INACTIVE", label: "ระงับการใช้งาน" },
								].map((status) => (
									<li key={status.value}>
										<button
											type="button"
											onClick={() => {
												setStatusFilter(status.value);
												setIsStatusOpen(false);
												setCurrentPage(1);
											}}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${statusFilter === status.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
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
					{loading && (
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
									<th className="px-6 py-4 w-[120px]">รหัสสินค้า</th>
									<th className="px-6 py-4 w-[120px]">รหัส LOT</th>
									<th className="px-6 py-4 w-[220px]">ชื่อสินค้า</th>
									<th className="px-6 py-4 w-[150px]">หมวดหมู่</th>
									<th className="px-6 py-4 w-[120px]">คงเหลือ</th>
									<th className="px-6 py-4 w-[120px]">วันหมดอายุ</th>
									<th className="px-6 py-4 w-[140px]">สถานะ</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 text-slate-700">
								{currentItems.length > 0 ? (
									currentItems.map((lot, idx) => {
										const currentStatus = calculateStatus(lot.expiryDate);
										const rowNumber = startIndex + idx + 1;
										return (
											<tr key={lot.id || idx} className="hover:bg-slate-50 transition-colors">
												<td className="px-6 py-4 text-center font-medium text-slate-600">{rowNumber}</td>
												<td className="px-6 py-4 font-mono text-sm text-slate-600">{lot.itemCode || "-"}</td>
												<td className="px-6 py-4 font-mono font-medium text-slate-600">{lot.lotCode || lot.id}</td>
												<td className="px-6 py-4">
													<div className="font-semibold text-slate-800 line-clamp-2" title={lot.itemName || "-"}>{lot.itemName || "-"}</div>
												</td>
												<td className="px-6 py-4 text-slate-600">{lot.category || "-"}</td>
												<td className="px-6 py-4">{lot.quantity.toLocaleString()} {lot.unit || ""}</td>
												<td className="px-6 py-4 text-red-600">{formatDate(lot.expiryDate)}</td>
												<td className="px-6 py-4">
													<span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${lot.status !== "ACTIVE" ? "bg-red-100 text-red-800" : currentStatus === "หมดอายุ" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>
														{lot.status !== "ACTIVE" ? "ระงับการใช้งาน" : currentStatus}
													</span>
												</td>
											</tr>
										);
									})
								) : (
									<tr>
										<td colSpan={8}>
											<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
												<XCircle className="w-12 h-12 text-slate-300" />
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
					<p className="text-sm text-slate-500">แสดง {currentItems.length} จาก {filteredLots.length} รายการ</p>
					<div className="flex items-center gap-2">
						<button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
						<span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
						<button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((page) => page + 1)} className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"><ChevronRight className="w-4 h-4" /></button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ExpiredLotsReportClient;