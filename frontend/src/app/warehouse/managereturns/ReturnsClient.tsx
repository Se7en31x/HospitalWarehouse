"use client";

import { useState, useCallback, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
	Package,
	Search,
	Check,
	Eye,
	ChevronLeft,
	ChevronRight,
	Calendar,
	AlertTriangle,
	Clock,
} from "lucide-react";

import * as ReturnsSvc from "@/services/returnsService";
import * as Returns from "@/types/returns_type";
import { socket } from "../../../lib/socket";

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	return String(error);
};

export default function ReturnsClient() {
	// ✅ State สำหรับรายการยืม
	const [returns, setReturns] = useState<Returns.UiReturn[]>([]);
	const [stats, setStats] = useState<Returns.ReturnStats | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(false);

	// --- [Data Fetching Logic] ---
	const refreshData = useCallback(async () => {
		setIsFetching(true);
		try {
			const [returnsData, statsData] = await Promise.all([
				ReturnsSvc.getBorrowedItems(1, 100).catch(() => ({
					data: [],
					total: 0,
					page: 1,
					limit: 100,
				})),
				ReturnsSvc.getReturnStats().catch(() => null),
			]);
			setReturns(returnsData.data || []);
			setStats(statsData);
		} catch (error) {
			console.error("Fetch error:", error);
			toast.error("โหลดข้อมูลล้มเหลว");
		} finally {
			setIsFetching(false);
		}
	}, []);

	// --- [Real-time Socket.io Connection] ---
	useEffect(() => {
		if (!socket.connected) socket.connect();

		const handleRefreshSignal = (message: string) => {
			if (message === "ITEMS" || message === "BORROW") {
				console.log("⚡ Socket: Received Refresh Signal -> Reloading Data...");
				refreshData();
			}
		};

		socket.on("REFRESH_DATA", handleRefreshSignal);

		return () => {
			socket.off("REFRESH_DATA", handleRefreshSignal);
		};
	}, [refreshData]);

	useEffect(() => {
		refreshData();
	}, [refreshData]);

	// --- [Search & Filter States] ---
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("ทั้งหมด");
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;

	const [selectedReturn, setSelectedReturn] = useState<Returns.UiReturn | null>(null);
	const [showDetailModal, setShowDetailModal] = useState(false);

	// Filter logic
	const statusOptions = ["ทั้งหมด", "รอการคืน", "คืนแล้ว", "ค้างคืน"];

	const filteredReturns = returns.filter((ret) => {
		const term = searchTerm.toLowerCase();
		const matchesSearch =
			(ret.itemCode || "").toLowerCase().includes(term) ||
			(ret.itemName || "").toLowerCase().includes(term) ||
			(ret.borrowedBy || "").toLowerCase().includes(term);

		const matchesStatus =
			selectedStatus === "ทั้งหมด" || ret.status === selectedStatus;

		return matchesSearch && matchesStatus;
	});

	const totalPages = Math.ceil(filteredReturns.length / itemsPerPage);
	const paginatedReturns = filteredReturns.slice(
		(currentPage - 1) * itemsPerPage,
		currentPage * itemsPerPage
	);

	// --- [Handlers] ---
	const handleMarkReturned = async (id: string) => {
		const returnDate = new Date().toISOString().split("T")[0];
		try {
			await ReturnsSvc.recordReturn(id, returnDate);
			toast.success("บันทึกการคืนเรียบร้อย");
			refreshData();
		} catch (error) {
			toast.error(getErrorMessage(error));
		}
	};

	const openDetailModal = (ret: Returns.UiReturn) => {
		setSelectedReturn(ret);
		setShowDetailModal(true);
	};

	const handleModalClose = () => {
		setShowDetailModal(false);
		setSelectedReturn(null);
	};

	return (
		<div className="flex flex-col min-h-screen bg-gray-50 p-8">
			<Toaster position="top-right" />

			{/* Header */}
			<div className="flex items-center justify-between mb-8">
				<div className="flex items-center gap-4">
					<div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
						<Package className="w-6 h-6 text-blue-600" />
					</div>
					<h2 className="text-3xl font-bold text-gray-900">จัดการการคืน</h2>
				</div>
			</div>

			{/* Filters */}
			<div className="flex flex-col md:flex-row gap-4 mb-6 md:items-center">
				<div className="relative w-full md:w-1/3">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
					<input
						type="text"
						placeholder="ค้นหารหัสสินค้า ชื่อ หรือผู้ยืม..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-xl border border-gray-200 py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>
				<select
					value={selectedStatus}
					onChange={(e) => setSelectedStatus(e.target.value)}
					className="border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
				>
					{statusOptions.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
			</div>

			{/* Table Content */}
		<div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
			{isFetching && (
				<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
					<div className="animate-spin">
						<div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
					</div>
				</div>
			)}
			<div className="overflow-x-auto overflow-y-auto flex-1">
				<table className="w-full text-sm text-left table-fixed">
					<thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
						<tr>
					<th className="px-6 py-4 w-[40px]">#</th>
					<th className="px-6 py-4 w-[100px]">เลขที่เอกสาร</th>
					<th className="px-6 py-4 w-[120px]">ผู้ยืม</th>
					<th className="px-6 py-4">ชื่อสินค้า</th>
					<th className="px-6 py-4 w-[70px] text-center">จำนวน</th>
					<th className="px-6 py-4 w-[130px]">วันครบกำหนด</th>
					<th className="px-6 py-4 w-[90px] text-right">จัดการ</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100">
						{paginatedReturns.map((ret, idx) => {
							const isOverdue = ret.daysOverdue && ret.daysOverdue > 0;
							return (
								<tr key={ret.id} className="hover:bg-slate-50 transition-colors">
								<td className="px-6 py-4 w-[40px]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
								<td className="px-6 py-4 w-[100px] font-medium">{ret.id}</td>
								<td className="px-6 py-4 w-[120px]">{ret.borrowedBy}</td>
								<td className="px-6 py-4">{ret.itemName}</td>
								<td className="px-6 py-4 w-[70px] text-center">
									{ret.quantity} {ret.unit}
								</td>
								<td className="px-6 py-4 w-[130px]">
										<div className="flex flex-col gap-1">
											<span className={`font-semibold ${isOverdue ? "text-red-600" : "text-slate-900"}`}>
												{new Date(ret.dueDate).toLocaleDateString("th-TH")}
											</span>
											{isOverdue && (
												<span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded w-fit font-semibold">
													ค้างคืน {ret.daysOverdue} วัน
												</span>
											)}
										</div>
										<div className="flex justify-end gap-1">
											<button
												onClick={() => openDetailModal(ret)}
												className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
												title="ดูรายละเอียด"
											>
												<Eye className="w-4 h-4" />
											</button>
											{ret.status === "รอการคืน" && (
												<button
													onClick={() => handleMarkReturned(ret.id)}
													className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
													title="บันทึกการคืน"
												>
													<Check className="w-4 h-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
							);
						})}
						{paginatedReturns.length === 0 && !isFetching && (
							<tr>
								<td colSpan={7} className="text-center py-10 text-slate-500">ไม่พบข้อมูล</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>

		{/* Pagination */}
		<div className="flex items-center justify-between mt-6">
			<p className="text-sm text-slate-500">
				แสดง {paginatedReturns.length} จาก {filteredReturns.length} รายการ
			</p>
			<div className="flex items-center gap-2">
				<button
					disabled={currentPage === 1}
					onClick={() => setCurrentPage((p) => p - 1)}
					className="p-2 border rounded-lg disabled:opacity-30"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-sm font-medium">
					หน้า {currentPage} / {totalPages || 1}
				</span>
				<button
					disabled={currentPage >= totalPages}
					onClick={() => setCurrentPage((p) => p + 1)}
					className="p-2 border rounded-lg disabled:opacity-30"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>
		</div>

		{/* Detail Modal */}
		{showDetailModal && selectedReturn && (
			<ReturnDetailModal
				isOpen={showDetailModal}
				onClose={handleModalClose}
				data={selectedReturn}
				onMarkReturn={handleMarkReturned}
			/>
		)}
	</div>
);
}

// --- [Return Detail Modal] ---
function ReturnDetailModal({
	isOpen,
	onClose,
	data,
	onMarkReturn,
}: {
	isOpen: boolean;
	onClose: () => void;
	data: Returns.UiReturn;
	onMarkReturn: (id: string) => Promise<void>;
}) {
	if (!isOpen) return null;

	const borrowDate = new Date(data.borrowDate);
	const dueDate = new Date(data.dueDate);
	const today = new Date();
	const daysOverdue = dueDate < today ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
				{/* Header */}
				<div className="sticky top-0 bg-blue-50 border-b border-blue-200 px-6 py-4 flex items-center justify-between">
					<h3 className="text-lg font-bold text-gray-900">รายละเอียดการยืม</h3>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
					>
						✕
					</button>
				</div>

				{/* Content */}
				<div className="p-6 space-y-6">
					{/* Item Info */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
								รหัสสินค้า
							</label>
							<p className="text-sm text-gray-900 font-semibold">{data.itemCode}</p>
						</div>
						<div>
							<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
								ชื่อสินค้า
							</label>
							<p className="text-sm text-gray-900">{data.itemName}</p>
						</div>
						<div>
							<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
								หมวดหมู่
							</label>
							<p className="text-sm text-gray-900">{data.category}</p>
						</div>
						<div>
							<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
								หน่วย
							</label>
							<p className="text-sm text-gray-900">{data.unit}</p>
						</div>
					</div>

					<div className="border-t pt-4">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
									จำนวน
								</label>
								<p className="text-sm text-gray-900 font-semibold">
									{data.quantity}
								</p>
							</div>
							<div>
								<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
									ผู้ยืม
								</label>
								<p className="text-sm text-gray-900">{data.borrowedBy}</p>
							</div>
							<div>
								<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
									วันยืม
								</label>
								<p className="text-sm text-gray-900">
									{borrowDate.toLocaleDateString("th-TH")}
								</p>
							</div>
							<div>
								<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
									วันครบกำหนด
								</label>
								<p className={`text-sm font-semibold ${daysOverdue > 0 ? "text-red-600" : "text-gray-900"}`}>
									{dueDate.toLocaleDateString("th-TH")}
									{daysOverdue > 0 && (
										<span className="block text-xs text-red-600 mt-1">
											ค้างคืน {daysOverdue} วัน
										</span>
									)}
								</p>
							</div>
						</div>
					</div>

					{data.returnDate && (
						<div className="border-t pt-4">
							<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
								วันที่คืน
							</label>
							<p className="text-sm text-gray-900">
								{new Date(data.returnDate).toLocaleDateString("th-TH")}
							</p>
						</div>
					)}

					{data.notes && (
						<div className="border-t pt-4">
							<label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
								หมายเหตุ
							</label>
							<p className="text-sm text-gray-700">{data.notes}</p>
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
					{data.status === "รอการคืน" && (
						<button
							onClick={() => onMarkReturn(data.id)}
							className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm transition-colors"
						>
							บันทึกการคืน
						</button>
					)}
					<button
						onClick={onClose}
						className={`${
							data.status === "รอการคืน" ? "flex-1" : "w-full"
						} px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-semibold text-sm transition-colors`}
					>
						ปิด
					</button>
				</div>
			</div>
		</div>
	);
}
