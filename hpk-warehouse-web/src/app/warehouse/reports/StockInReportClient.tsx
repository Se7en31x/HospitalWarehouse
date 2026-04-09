"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ArrowDownToLine,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	Search,
} from "lucide-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { getAllStockMovements } from "@/services/stockMovementService";
import { getAllReceivesPages } from "@/services/receiveService";
import type { StockMovement } from "@/types/stockmovement_type";

interface StockInReportClientProps {
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

type StockInMovementRow = StockMovement & {
	docNo: string | null;
	supplierName: string;
	receiveType: string;
};

const TYPE_LABEL: Record<string, string> = {
	PURCHASE: "จัดซื้อ",
	DONATION: "บริจาค",
	PURCHASE_ASSET: "ครุภัณฑ์",
	REUSABLE_UNIT: "ของใช้ซ้ำรายชิ้น",
};

const extractReceiveDocNo = (note?: string | null) => {
	if (!note) return null;
	const match = note.match(/^Receive IN:\s*(.+)$/i);
	return match?.[1]?.trim() || null;
};

const fmtDateTime = (value?: string | null) => {
	if (!value) return "-";
	const dateValue = new Date(value);
	if (Number.isNaN(dateValue.getTime())) return value;
	return `${dateValue.toLocaleDateString("th-TH", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})} ${dateValue.toLocaleTimeString("th-TH", {
		hour: "2-digit",
		minute: "2-digit",
	})}`;
};

const typeOptions = [
	{ value: "", label: "ประเภททั้งหมด" },
	{ value: "PURCHASE", label: "จัดซื้อ" },
	{ value: "DONATION", label: "บริจาค" },
	{ value: "PURCHASE_ASSET", label: "ครุภัณฑ์" },
	{ value: "REUSABLE_UNIT", label: "ของใช้ซ้ำรายชิ้น" },
];

const StockInReportClient: React.FC<StockInReportClientProps> = ({ onBack }) => {
	const [movements, setMovements] = useState<StockInMovementRow[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedType, setSelectedType] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [isTypeOpen, setIsTypeOpen] = useState(false);

	const loadMovements = useCallback(async () => {
		setIsFetching(true);
		try {
			const [movementData, receiveHeaders] = await Promise.all([
				getAllStockMovements({ type: "RECEIVE_IN" }),
				getAllReceivesPages(),
			]);

			const supplierByDocNo = new Map(
				receiveHeaders.map((header) => [
					header.doc_no,
					header.supplier_name || header.donor_name || "-",
				])
			);

			const receiveTypeByDocNo = new Map(
				receiveHeaders.map((header) => [
					header.doc_no,
					header.type || "-",
				])
			);

			setMovements(
				movementData.map((movement) => {
					const docNo = extractReceiveDocNo(movement.note);
					return {
						...movement,
						docNo,
						supplierName: (docNo && supplierByDocNo.get(docNo)) || "-",
						receiveType: (docNo && receiveTypeByDocNo.get(docNo)) || "-",
					};
				})
			);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลรับเข้า");
			setMovements([]);
		} finally {
			setIsFetching(false);
		}
	}, []);

	useEffect(() => {
		loadMovements();
	}, [loadMovements]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-type]")) setIsTypeOpen(false);
		};
		if (isTypeOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isTypeOpen]);

	const filteredMovements = useMemo(() => {
		const keyword = searchTerm.trim().toLowerCase();

		return movements.filter((movement) => {
			const itemCode = movement.item?.code ?? "";
			const itemName = movement.item?.name ?? "";
			const supplierName = movement.supplierName ?? "";
			const createdBy = movement.created_by ?? "";
			const note = movement.note ?? "";
			const createdAt = new Date(movement.created_at);

			const matchesSearch =
				!keyword ||
				itemCode.toLowerCase().includes(keyword) ||
				itemName.toLowerCase().includes(keyword) ||
				supplierName.toLowerCase().includes(keyword) ||
				createdBy.toLowerCase().includes(keyword) ||
				note.toLowerCase().includes(keyword);

			const matchesType = !selectedType || movement.receiveType === selectedType;

			let matchesDate = true;
			if (startDate) {
				matchesDate = matchesDate && createdAt >= new Date(startDate);
			}
			if (endDate) {
				const end = new Date(endDate);
				end.setHours(23, 59, 59, 999);
				matchesDate = matchesDate && createdAt <= end;
			}

			return matchesSearch && matchesType && matchesDate;
		});
	}, [movements, searchTerm, selectedType, startDate, endDate]);

	const totalPages = Math.max(1, Math.ceil(filteredMovements.length / ITEMS_PER_PAGE));

	const paginatedMovements = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredMovements.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredMovements, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedType, startDate, endDate]);

	const handleExportCsv = () => {
		const rows = [
			["รหัสสินค้า", "ชื่อสินค้า", "ผู้จำหน่าย", "ประเภท", "จำนวน", "ผู้ดำเนินการ", "วันที่และเวลา", "หมายเหตุ"].join(","),
			...filteredMovements.map((movement) => [
				movement.item?.code || "-",
				movement.item?.name || "-",
				movement.supplierName || "-",
				TYPE_LABEL[movement.receiveType] || movement.receiveType || "-",
				`${movement.quantity} ${movement.item?.unit || ""}`.trim(),
				movement.created_by || "-",
				fmtDateTime(movement.created_at),
				movement.note || "-",
			].join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `รายงานรับเข้า_${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานรับเข้า</h2>
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
						placeholder="ค้นหารหัสสินค้า / ชื่อสินค้า / ผู้จำหน่าย / ผู้ดำเนินการ..."
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				<div className="relative" data-filter-type>
					<button
						type="button"
						onClick={() => setIsTypeOpen(!isTypeOpen)}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">{typeOptions.find(t => t.value === selectedType)?.label || "ประเภททั้งหมด"}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
					</button>
					{isTypeOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{typeOptions.map(t => (
									<li key={t.value}>
										<button
											type="button"
											onClick={() => { setSelectedType(t.value); setIsTypeOpen(false); }}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedType === t.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{t.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className="flex items-center gap-2">
					<label className="text-sm text-slate-600 font-medium">วันที่เริ่มต้น</label>
					<input
						type="date"
						value={startDate}
						onChange={(event) => setStartDate(event.target.value)}
						className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-slate-600 font-medium">วันที่สิ้นสุด</label>
					<input
						type="date"
						value={endDate}
						onChange={(event) => setEndDate(event.target.value)}
						className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>

				<button
					type="button"
					onClick={handleExportCsv}
					className="ml-auto flex items-center gap-2 px-4 py-2 bg-hospital text-white rounded-lg hover:bg-hospital-dark transition-colors text-sm font-medium shadow-sm"
				>
					<Download className="w-4 h-4" />
					Export CSV
				</button>
			</div>

			<div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
				{isFetching && (
					<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
						<div className="animate-spin">
							<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
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
					<style>{`div::-webkit-scrollbar { width: 0; height: 8px; } div::-webkit-scrollbar-track { background: #f1f5f9; } div::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } div::-webkit-scrollbar-thumb:hover { background: #94a3b8; }`}</style>
					<table className="w-full text-sm text-left table-fixed">
						<thead>
							<tr className="bg-slate-50 text-slate-700 text-[13px] font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
								<th className="px-6 py-4 w-[60px] text-center">#</th>
								<th className="px-6 py-4 w-[160px]">รหัสสินค้า</th>
								<th className="px-6 py-4 w-[240px]">ชื่อสินค้า</th>
								<th className="px-6 py-4 w-[220px]">ผู้จำหน่าย</th>						<th className="px-6 py-4 w-[160px]">ประเภท</th>								<th className="px-6 py-4 w-[140px]">จำนวน</th>
								<th className="px-6 py-4 w-[180px]">ผู้ดำเนินการ</th>
								<th className="px-6 py-4 w-[200px]">วันที่และเวลา</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
							{paginatedMovements.length > 0 ? (
								paginatedMovements.map((movement, index) => (
									<tr key={movement.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-6 py-5 w-[60px] text-center text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
										<td className="px-6 py-5 w-[160px] font-mono text-slate-700 font-normal">{movement.item?.code ?? "-"}</td>
										<td className="px-6 py-5 w-[240px] text-slate-900 font-normal">{movement.item?.name ?? "ไม่ระบุสินค้า"}</td>
										<td className="px-6 py-5 w-[220px] text-slate-700 font-normal">{movement.supplierName || "-"}</td>
										<td className="px-6 py-5 w-[160px] text-slate-700 font-normal">{TYPE_LABEL[movement.receiveType] || movement.receiveType || "-"}</td>
										<td className="px-6 py-5 w-[140px] text-slate-900 font-normal">{movement.quantity.toLocaleString()} {movement.item?.unit ?? ""}</td>
										<td className="px-6 py-5 w-[180px] text-slate-700 font-normal">{movement.created_by || "-"}</td>
										<td className="px-6 py-5 w-[200px] font-normal">
											<div className="text-slate-900 whitespace-nowrap">{fmtDateTime(movement.created_at)}</div>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={8} className="text-center py-12">
										<ArrowDownToLine className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบรายการรับเข้า</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex items-center justify-between mt-6">
				<p className="text-sm text-slate-500">แสดง {paginatedMovements.length} จาก {filteredMovements.length} รายการ</p>
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

export default StockInReportClient;