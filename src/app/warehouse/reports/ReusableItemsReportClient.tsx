"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	RefreshCcw,
	Search,
} from "lucide-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { apiClient } from "@/lib/apiClient";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";
import { getDepartmentOptions, type DepartmentOption } from "@/services/departmentService";

interface ReusableItemsReportClientProps {
	onBack?: () => void;
}

interface ReusableItemRow {
	id: number | string;
	unitCode: string;
	serialNo: string;
	itemName: string;
	itemCode: string;
	category: string;
	unit: string;
	department: string;
	status: string;
	condition: string;
	note: string;
	createdAt: string | null;
}

interface ApiResponse {
	items: ReusableItemRow[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

const ITEMS_PER_PAGE = 15;

const STATUS_LABEL: Record<string, string> = {
	AVAILABLE:  "พร้อมใช้งาน",
	IN_USE:     "กำลังใช้งาน",
	BORROWED:   "ถูกยืม",
	MAINTENANCE:"ซ่อมบำรุง",
	RETIRED:    "เลิกใช้งาน",
	LOST:       "สูญหาย",
};

const STATUS_BADGE: Record<string, string> = {
	AVAILABLE:   "bg-emerald-50 text-emerald-700 border-emerald-100",
	IN_USE:      "bg-blue-50 text-blue-700 border-blue-100",
	BORROWED:    "bg-indigo-50 text-indigo-700 border-indigo-100",
	MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-100",
	RETIRED:     "bg-slate-100 text-slate-500 border-slate-200",
	LOST:        "bg-rose-50 text-rose-700 border-rose-100",
};

const CONDITION_LABEL: Record<string, string> = {
	GOOD:      "ดี",
	FAIR:      "พอใช้",
	POOR:      "แย่",
	DAMAGED:   "เสียหาย",
};

const CONDITION_BADGE: Record<string, string> = {
	GOOD:    "bg-emerald-50 text-emerald-700 border-emerald-100",
	FAIR:    "bg-amber-50 text-amber-700 border-amber-100",
	POOR:    "bg-orange-50 text-orange-700 border-orange-100",
	DAMAGED: "bg-rose-50 text-rose-700 border-rose-100",
};

const ReusableItemsReportClient: React.FC<ReusableItemsReportClientProps> = ({ onBack }) => {
	const [rows, setRows] = useState<ReusableItemRow[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("");
	const [selectedCondition, setSelectedCondition] = useState("");
	const [selectedDept, setSelectedDept] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [isStatusOpen, setIsStatusOpen] = useState(false);
	const [isConditionOpen, setIsConditionOpen] = useState(false);
	const [isDeptOpen, setIsDeptOpen] = useState(false);
	const [departments, setDepartments] = useState<DepartmentOption[]>([]);

	const closeAllDropdowns = () => {
		setIsStatusOpen(false);
		setIsConditionOpen(false);
		setIsDeptOpen(false);
	};

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const [res, depts] = await Promise.all([
				apiClient.get<ApiResponse>("/v1/reports/reusable-items", {
					params: { limit: 500 },
				}),
				getDepartmentOptions().catch(() => [] as DepartmentOption[]),
			]);
			setRows((res.data as ApiResponse).items ?? []);
			setDepartments(depts);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลของใช้ซ้ำ");
			setRows([]);
		} finally {
			setIsFetching(false);
		}
	}, []);

	useEffect(() => { loadData(); }, [loadData]);

	const filtered = useMemo(() => {
		const kw = searchTerm.trim().toLowerCase();
		return rows.filter((r) => {
			const matchSearch =
				!kw ||
				r.unitCode.toLowerCase().includes(kw) ||
				r.serialNo.toLowerCase().includes(kw) ||
				r.itemName.toLowerCase().includes(kw) ||
				r.itemCode.toLowerCase().includes(kw) ||
				r.department.toLowerCase().includes(kw);
			const matchStatus    = !selectedStatus    || r.status    === selectedStatus;
			const matchCondition = !selectedCondition || r.condition === selectedCondition;
			const matchDept      = !selectedDept      || r.department === selectedDept;
			return matchSearch && matchStatus && matchCondition && matchDept;
		});
	}, [rows, searchTerm, selectedStatus, selectedCondition, selectedDept]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

	const paginated = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus, selectedCondition, selectedDept]);

	const handleExportCsv = () => {
		const header = ["รหัสหน่วย", "เลขซีเรียล", "ชื่อสินค้า", "รหัสสินค้า", "หมวดหมู่", "หน่วย", "แผนก", "สถานะ", "สภาพ", "หมายเหตุ"];
		const csvRows = filtered.map((r) => [
			r.unitCode,
			r.serialNo,
			r.itemName,
			r.itemCode,
			r.category,
			r.unit,
			r.department,
			STATUS_LABEL[r.status]    ?? r.status,
			CONDITION_LABEL[r.condition] ?? r.condition,
			r.note,
		].map((v) => `"${v}"`).join(","));
		const blob = new Blob(["\uFEFF" + [header.join(","), ...csvRows].join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `รายงานของใช้ซ้ำ_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#",          key: "_no",          align: "center" },
			{ header: "รหัสหน่วย",  key: "unitCode" },
			{ header: "เลขซีเรียล", key: "serialNo" },
			{ header: "ชื่อสินค้า", key: "itemName" },
			{ header: "หมวดหมู่",   key: "category" },
			{ header: "แผนก",       key: "department" },
			{ header: "สถานะ",      key: "statusLabel",    align: "center" },
			{ header: "สภาพ",       key: "conditionLabel", align: "center" },
		];
		const pdfRows = filtered.map((r, i) => ({
			_no:            String(i + 1),
			unitCode:       r.unitCode,
			serialNo:       r.serialNo,
			itemName:       r.itemName,
			category:       r.category,
			department:     r.department,
			statusLabel:    STATUS_LABEL[r.status]       ?? r.status,
			conditionLabel: CONDITION_LABEL[r.condition] ?? r.condition,
		}));
		printAsPdf(
			"รายงานของใช้ซ้ำรายชิ้น",
			`กรองโดย: ${selectedStatus ? STATUS_LABEL[selectedStatus] : "ทุกสถานะ"} | ${selectedCondition ? CONDITION_LABEL[selectedCondition] : "ทุกสภาพ"} | ${selectedDept || "ทุกแผนก"}`,
			columns,
			pdfRows,
		);
	};

	const statusOptions = [
		{ value: "", label: "สถานะทั้งหมด" },
		...Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
	];

	const conditionOptions = [
		{ value: "", label: "ทุกสภาพ" },
		...Object.entries(CONDITION_LABEL).map(([v, l]) => ({ value: v, label: l })),
	];

	const deptOptions = [
		{ value: "", label: "ทุกแผนก" },
		...departments.map((d) => ({ value: d.name, label: d.name })),
	];

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-3xl font-bold text-gray-800">รายงานของใช้ซ้ำรายชิ้น</h2>
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

			{/* Filters */}
			<div className="flex flex-wrap gap-3 mb-6 items-center">
				{/* Search */}
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหารหัสหน่วย / ชื่อสินค้า / เลขซีเรียล..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
					/>
				</div>

				{/* Status dropdown */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsStatusOpen((o) => !o); setIsConditionOpen(false); setIsDeptOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[150px]"
					>
						<span className="flex-1 text-left">{statusOptions.find((o) => o.value === selectedStatus)?.label ?? "สถานะทั้งหมด"}</span>
						<ChevronDown className="w-4 h-4 text-slate-400" />
					</button>
					{isStatusOpen && (
						<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px]">
							{statusOptions.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => { setSelectedStatus(o.value); setIsStatusOpen(false); }}
									className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedStatus === o.value ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
								>
									{o.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Condition dropdown */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsConditionOpen((o) => !o); setIsStatusOpen(false); setIsDeptOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[130px]"
					>
						<span className="flex-1 text-left">{conditionOptions.find((o) => o.value === selectedCondition)?.label ?? "ทุกสภาพ"}</span>
						<ChevronDown className="w-4 h-4 text-slate-400" />
					</button>
					{isConditionOpen && (
						<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[140px]">
							{conditionOptions.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => { setSelectedCondition(o.value); setIsConditionOpen(false); }}
									className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedCondition === o.value ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
								>
									{o.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Department dropdown */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsDeptOpen((o) => !o); setIsStatusOpen(false); setIsConditionOpen(false); }}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[160px]"
					>
						<span className="flex-1 text-left">{selectedDept || "ทุกแผนก"}</span>
						<ChevronDown className="w-4 h-4 text-slate-400" />
					</button>
					{isDeptOpen && (
						<div className="absolute top-full mt-1 left-0 z-30 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] max-h-56 overflow-y-auto">
							{deptOptions.map((o) => (
								<button
									key={o.value}
									type="button"
									onClick={() => { setSelectedDept(o.value); setIsDeptOpen(false); }}
									className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${selectedDept === o.value ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700"}`}
								>
									{o.label}
								</button>
							))}
						</div>
					)}
				</div>

				{/* Export buttons */}
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

			{/* Table */}
			<div
				className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col"
				style={{ height: "65vh" }}
				onClick={closeAllDropdowns}
			>
				{isFetching && (
					<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
						<div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
					</div>
				)}
				<div className="flex-1" style={{ overflowX: "auto", overflowY: "auto" }}>
					<table className="w-full text-sm text-left table-fixed">
						<thead>
							<tr className="bg-slate-50 text-slate-700 text-[13px] font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
								<th className="px-4 py-4 w-[50px] text-center">#</th>
								<th className="px-4 py-4 w-[130px]">รหัสหน่วย</th>
								<th className="px-4 py-4 w-[130px]">เลขซีเรียล</th>
								<th className="px-4 py-4 w-[220px]">ชื่อสินค้า</th>
								<th className="px-4 py-4 w-[120px]">หมวดหมู่</th>
								<th className="px-4 py-4 w-[160px]">แผนก</th>
								<th className="px-4 py-4 w-[130px]">สถานะ</th>
								<th className="px-4 py-4 w-[100px]">สภาพ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
							{paginated.length > 0 ? (
								paginated.map((r, idx) => (
									<tr key={r.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-4 text-center text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
										<td className="px-4 py-4 font-mono text-slate-700">{r.unitCode}</td>
										<td className="px-4 py-4 font-mono text-slate-500">{r.serialNo}</td>
										<td className="px-4 py-4 text-slate-900 font-medium">{r.itemName}</td>
										<td className="px-4 py-4 text-slate-600">{r.category}</td>
										<td className="px-4 py-4 text-slate-700">{r.department}</td>
										<td className="px-4 py-4">
											<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[r.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
												{STATUS_LABEL[r.status] ?? r.status}
											</span>
										</td>
										<td className="px-4 py-4">
											<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${CONDITION_BADGE[r.condition] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
												{CONDITION_LABEL[r.condition] ?? r.condition}
											</span>
										</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={8} className="text-center py-12">
										<RefreshCcw className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบรายการของใช้ซ้ำ</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between mt-6">
				<p className="text-sm text-slate-500">
					แสดง {paginated.length} จาก {filtered.length} รายการ
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => p - 1)}
						className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setCurrentPage((p) => p + 1)}
						className="p-2 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default ReusableItemsReportClient;
