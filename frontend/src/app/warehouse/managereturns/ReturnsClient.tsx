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
    Activity,
    CheckCircle,
    X
} from "lucide-react";

import * as ReturnsSvc from "@/services/returnsService";
import * as Returns from "@/types/returns_type";
import { socket } from "../../../lib/socket";

const getErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	return String(error);
};

// ============ MOCK DATA ============
const MOCK_RETURNS: Returns.UiReturn[] = [
	{
		id: "BRW-202603-001",
		itemName: "เครื่องวัดออกซิเจนปลายนิ้ว (Pulse Oximeter)",
		itemCode: "MED-001",
		category: "เครื่องมือแพทย์",
		unit: "เครื่อง",
		quantity: 2,
		borrowedBy: "ดร. สมชาย ใจดี",
		borrowDate: "2026-03-20T08:00:00Z",
		dueDate: "2026-03-25T17:00:00Z",
		status: "รอการคืน",
		daysOverdue: 0,
		notes: "ยืมไปใช้ที่แผนกฉุกเฉิน",
	},
	{
		id: "BRW-202603-002",
		itemName: "รถเข็นผู้ป่วย (Wheelchair)",
		itemCode: "MED-005",
		category: "อุปกรณ์ทางการแพทย์",
		unit: "คัน",
		quantity: 1,
		borrowedBy: "พยาบาล สมศรี มานะ",
		borrowDate: "2026-03-15T09:30:00Z",
		dueDate: "2026-03-20T17:00:00Z",
		status: "ค้างคืน",
		daysOverdue: 5,
		notes: "รถเข็นผู้ป่วยสูญหายชิ้นส่วน",
	},
	{
		id: "BRW-202603-003",
		itemName: "เสาน้ำเกลือแบบล้อเลื่อน",
		itemCode: "MED-012",
		category: "อุปกรณ์ทั่วไป",
		unit: "ต้น",
		quantity: 3,
		borrowedBy: "นาย วีระศักดิ์ ยิ่งใหญ่",
		borrowDate: "2026-03-22T10:15:00Z",
		dueDate: "2026-03-24T17:00:00Z",
		status: "ค้างคืน",
		daysOverdue: 1,
	},
	{
		id: "BRW-202603-004",
		itemName: "เครื่องกระตุกหัวใจ (Defibrillator)",
		itemCode: "MED-009",
		category: "เครื่องมือแพทย์",
		unit: "เครื่อง",
		quantity: 1,
		borrowedBy: "นพ. กิตติพงษ์ รักษา",
		borrowDate: "2026-03-25T08:00:00Z",
		dueDate: "2026-03-26T17:00:00Z",
		status: "รอการคืน",
		daysOverdue: 0,
	},
    {
		id: "BRW-202603-005",
		itemName: "เครื่องวัดความดันโลหิตแบบดิจิทัล",
		itemCode: "MED-015",
		category: "เครื่องมือแพทย์",
		unit: "เครื่อง",
		quantity: 2,
		borrowedBy: "ดร. สมชาย ใจดี",
		borrowDate: "2026-03-18T08:00:00Z",
		dueDate: "2026-03-20T17:00:00Z",
		returnDate: "2026-03-19T10:00:00Z",
		status: "คืนแล้ว",
		daysOverdue: 0,
	}
];

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
			// ใช้ Mock Data ตามที่ขอ
			setReturns(MOCK_RETURNS);
			setStats({
				totalBorrowed: 9,
				returned: 2,
				pending: 3,
				overdue: 4,
				totalQuantity: 9
			});
			/* Original API Call Object
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
			*/
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
		<div className="flex flex-col min-h-screen bg-white p-8">
			<Toaster position="top-right" />

			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">จัดการรับคืนพัสดุ</h2>
				</div>
			</div>

            {/* Stats Cards (Kept but integrated into layout if needed, or removed. I will keep them but restyle just a bit to fit, wait: user explicitly asked for ItemsClient, which has no Stats. Let's remove stats to comply fully with exactly what ItemsClient looks like) */}

			{/* Filters */}
			<div className="flex flex-wrap gap-3 mb-6 items-center">
				<div className="relative w-64">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหารหัสสินค้า ชื่อ..."
						value={searchTerm}
						onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
						className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
					/>
				</div>
                <div className="relative w-[200px]">
                    <select
                        value={selectedStatus}
                        onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                        className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white hover:border-slate-300 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    >
                        {statusOptions.map((s) => (
                            <option key={s} value={s}>
                                สถานะ: {s}
                            </option>
                        ))}
                    </select>
                </div>
			</div>

			{/* Table Content */}
            <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ height: '65vh' }}>
                {isFetching && (
                    <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
                        <div className="animate-spin">
                            <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto overflow-y-auto flex-1">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 w-[150px]">เลขที่เอกสาร</th>
                                <th className="px-6 py-4 w-[250px]">ชื่อพัสดุ</th>
                                <th className="px-6 py-4 w-[180px]">ผู้ยืม</th>
                                <th className="px-6 py-4 w-[120px] text-center">จำนวน</th>
                                <th className="px-6 py-4 w-[140px]">กำหนดคืน</th>
                                <th className="px-6 py-4 w-[120px]">สถานะ</th>
                                <th className="px-6 py-4 w-[100px] text-center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {paginatedReturns.map((ret, idx) => {
                                const isOverdue = ret.daysOverdue && ret.daysOverdue > 0;
                                let statusBg = "bg-gray-100 text-gray-800";
                                if (ret.status === "รอการคืน") statusBg = "bg-yellow-100 text-yellow-800";
                                else if (ret.status === "คืนแล้ว") statusBg = "bg-green-100 text-green-800";
                                else if (ret.status === "ค้างคืน") statusBg = "bg-red-100 text-red-800";

                                return (
                                    <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 w-[150px]">
                                            {ret.id}
                                        </td>
                                        <td className="px-6 py-4 w-[250px]">
                                            <div className="truncate">{ret.itemName}</div>
                                        </td>
                                        <td className="px-6 py-4 w-[180px] truncate">
                                            {ret.borrowedBy}
                                        </td>
                                        <td className="px-6 py-4 w-[120px] text-center">
                                            {ret.quantity} <span className="text-slate-500 text-xs">{ret.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 w-[140px]">
                                            <div className="flex items-center gap-2">
                                                <div className={`text-sm ${isOverdue ? "text-red-600 font-bold" : "text-slate-700 font-medium"}`}>
                                                    {new Date(ret.dueDate).toLocaleDateString("th-TH")}
                                                </div>
                                                {isOverdue ? (
                                                    <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-md font-medium whitespace-nowrap">เกิน {ret.daysOverdue} วัน</span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 w-[120px]">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusBg}`}>
                                                {ret.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 w-[100px] text-center">
                                            <div className="flex justify-center gap-1 w-[80px] mx-auto">
                                                {ret.status === "รอการคืน" ? (
                                                    <button
                                                        onClick={() => handleMarkReturned(ret.id)}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all inline-flex items-center justify-center w-8 h-8"
                                                        title="บันทึกการคืน"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                ) : (
                                                    <div className="w-8 h-8 shrink-0"></div>
                                                )}
                                                <button
                                                    onClick={() => openDetailModal(ret)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center justify-center w-8 h-8"
                                                    title="ดูรายละเอียด"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedReturns.length === 0 && !isFetching && (
                                <tr>
                                    <td colSpan={7}>
                                        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                                            </svg>
                                            <p className="text-sm font-medium">ไม่พบข้อมูลพัสดุ</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

			{/* Pagination */}
            <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-500">แสดง {paginatedReturns.length} จาก {filteredReturns.length} รายการ</p>
                <div className="flex items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <span className="text-sm font-medium">หน้า {currentPage} / {totalPages || 1}</span>
                    <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                </div>
            </div>

			{/* Detail Modal */}
			{showDetailModal && selectedReturn && (
				<ReturnDetailModal
					isOpen={showDetailModal}
					onClose={handleModalClose}
					data={selectedReturn!}
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
		<>
			{/* Overlay */}
			<div
				className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
				onClick={onClose}
			/>

			{/* Modal */}
			<div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
				<div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto pointer-events-auto flex flex-col">
					{/* Header */}
					<div className="sticky top-0 bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between z-10 shrink-0">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-indigo-100 rounded-lg">
								<Package className="w-6 h-6 text-indigo-600" />
							</div>
							<div>
								<h2 className="text-2xl font-bold text-slate-900">รายละเอียดการยืม</h2>
								<p className="text-sm text-slate-500 mt-1">ข้อมูลการยืมพัสดุและกำหนดเวลาคืน</p>
							</div>
						</div>
						<button
							onClick={onClose}
							className="p-2 hover:bg-slate-100 rounded-full transition-colors"
						>
							<X className="w-5 h-5 text-slate-400" />
						</button>
					</div>

					{/* Content */}
					<div className="p-8 space-y-6 flex-1 overflow-y-auto">
						{/* Item Info Card */}
						<div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
							<h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
								<Package className="w-5 h-5 text-slate-500" />
								ข้อมูลพัสดุ
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">รหัสเอกสาร</label>
									<p className="text-base text-slate-900 font-medium">{data.id}</p>
								</div>
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">รหัสสินค้า</label>
									<p className="text-base text-slate-900 font-medium">{data.itemCode}</p>
								</div>
								<div className="md:col-span-2">
									<label className="block text-sm font-semibold mb-1 text-slate-600">ชื่อสินค้า</label>
									<p className="text-base text-slate-900 font-medium">{data.itemName}</p>
								</div>
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">หมวดหมู่</label>
									<p className="text-base text-slate-900">{data.category}</p>
								</div>
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">จำนวนที่ยืม</label>
									<p className="text-base text-slate-900 font-medium">
										{data.quantity} <span className="text-slate-500 text-sm font-normal">{data.unit}</span>
									</p>
								</div>
							</div>
						</div>

						{/* Borrow Info Card */}
						<div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
							<h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
								<Clock className="w-5 h-5 text-slate-500" />
								ข้อมูลการยืม
							</h3>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">ชื่อผู้ยืม</label>
									<p className="text-base text-slate-900">{data.borrowedBy}</p>
								</div>
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">สถานะ</label>
									<div>
										<span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
											data.status === "รอการคืน" ? "bg-yellow-100 text-yellow-800" :
											data.status === "คืนแล้ว" ? "bg-green-100 text-green-800" :
											"bg-red-100 text-red-800"
										}`}>
											{data.status}
										</span>
									</div>
								</div>
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">วันที่ยืม</label>
									<p className="text-base text-slate-900">
										{borrowDate.toLocaleDateString("th-TH")}
									</p>
								</div>
								<div>
									<label className="block text-sm font-semibold mb-1 text-slate-600">วันครบกำหนด</label>
									<p className={`text-base font-semibold ${daysOverdue > 0 ? "text-red-600" : "text-slate-900"}`}>
										{dueDate.toLocaleDateString("th-TH")}
										{daysOverdue > 0 && (
											<span className="block text-xs text-red-600 mt-1 font-medium">
												ค้างคืน {daysOverdue} วัน
											</span>
										)}
									</p>
								</div>
								{data.returnDate && (
									<div>
										<label className="block text-sm font-semibold mb-1 text-slate-600">วันที่คืนพัสดุจริง</label>
										<p className="text-base text-slate-900">
											{new Date(data.returnDate).toLocaleDateString("th-TH")}
										</p>
									</div>
								)}
								{data.notes && (
									<div className="md:col-span-2">
										<label className="block text-sm font-semibold mb-1 text-slate-600">หมายเหตุ</label>
										<p className="text-base text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
											{data.notes}
										</p>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Actions Footer */}
					<div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-4 flex gap-3 justify-end shrink-0 z-10">
						<button
							onClick={onClose}
							className="px-6 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
						>
							ปิด
						</button>
						{data.status === "รอการคืน" && (
							<button
								onClick={() => {
									onMarkReturn(data.id);
									onClose();
								}}
								className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center gap-2"
							>
								<Check className="w-4 h-4" />
								บันทึกการคืน
							</button>
						)}
					</div>
				</div>
			</div>
		</>
	);
}
