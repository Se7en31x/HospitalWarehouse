"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Box,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Download,
	FileText,
	Search,
} from "lucide-react";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { apiClient } from "@/lib/apiClient";
import { printAsPdf, type PdfColumn } from "@/utils/printAsPdf";
import { getDepartmentOptions, type DepartmentOption } from "@/services/departmentService";

interface AssetReportClientProps {
	onBack?: () => void;
}

interface AssetRow {
	id: number | string;
	assetCode: string;
	serialNo: string;
	itemName: string;
	itemCode: string;
	category: string;
	department: string;
	status: string;
	purchaseDate: string | null;
	warrantyExpire: string | null;
	unitCount: number;
	note: string;
	createdAt: string | null;
}

interface ApiResponse {
	items: AssetRow[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

const ITEMS_PER_PAGE = 15;

const STATUS_LABEL: Record<string, string> = {
	AVAILABLE:    "พร้อมใช้งาน",
	IN_USE:       "กำลังใช้งาน",
	MAINTENANCE:  "ซ่อมบำรุง",
	RETIRED:      "เลิกใช้งาน",
	LOST:         "สูญหาย",
};

const STATUS_BADGE: Record<string, string> = {
	AVAILABLE:    "bg-emerald-50 text-emerald-700 border-emerald-100",
	IN_USE:       "bg-blue-50 text-blue-700 border-blue-100",
	MAINTENANCE:  "bg-amber-50 text-amber-700 border-amber-100",
	RETIRED:      "bg-slate-100 text-slate-500 border-slate-200",
	LOST:         "bg-rose-50 text-rose-700 border-rose-100",
};

const fmtDate = (value?: string | null) => {
	if (!value) return "-";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return value;
	return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const AssetReportClient: React.FC<AssetReportClientProps> = ({ onBack }) => {
	const [rows, setRows] = useState<AssetRow[]>([]);
	const [isFetching, setIsFetching] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedStatus, setSelectedStatus] = useState("");
	const [selectedDept, setSelectedDept] = useState<string>("");
	const [currentPage, setCurrentPage] = useState(1);
	const [isStatusOpen, setIsStatusOpen] = useState(false);
	const [isDeptOpen, setIsDeptOpen] = useState(false);
	const [departments, setDepartments] = useState<DepartmentOption[]>([]);

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const [res, depts] = await Promise.all([
				apiClient.get<ApiResponse>("/v1/reports/assets", {
					params: { limit: 500 },
				}),
				getDepartmentOptions().catch(() => [] as DepartmentOption[]),
			]);
			setRows((res.data as ApiResponse).items ?? []);
			setDepartments(depts);
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลครุภัณฑ์");
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
				r.assetCode.toLowerCase().includes(kw) ||
				r.serialNo.toLowerCase().includes(kw) ||
				r.itemName.toLowerCase().includes(kw) ||
				r.itemCode.toLowerCase().includes(kw) ||
				r.department.toLowerCase().includes(kw);
			const matchStatus = !selectedStatus || r.status === selectedStatus;
			const matchDept = !selectedDept || r.department === selectedDept;
			return matchSearch && matchStatus && matchDept;
		});
	}, [rows, searchTerm, selectedStatus, selectedDept]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

	const paginated = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus, selectedDept]);

	const handleExportCsv = () => {
		const header = ["รหัสครุภัณฑ์", "เลขซีเรียล", "ชื่อสินค้า", "รหัสสินค้า", "หมวดหมู่", "แผนก", "สถานะ", "วันที่ซื้อ", "วันหมดประกัน", "จำนวนหน่วยย่อย"];
		const csvRows = filtered.map((r) => [
			r.assetCode,
			r.serialNo,
			r.itemName,
			r.itemCode,
			r.category,
			r.department,
			STATUS_LABEL[r.status] ?? r.status,
			fmtDate(r.purchaseDate),
			fmtDate(r.warrantyExpire),
			String(r.unitCount),
		].map((v) => `"${v}"`).join(","));
		const blob = new Blob(["\uFEFF" + [header.join(","), ...csvRows].join("\n")], {
			type: "text/csv;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `รายงานครุภัณฑ์_${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportPdf = () => {
		const columns: PdfColumn[] = [
			{ header: "#", key: "_no", align: "center" },
			{ header: "รหัสครุภัณฑ์", key: "assetCode" },
			{ header: "ชื่อสินค้า", key: "itemName" },
			{ header: "หมวดหมู่", key: "category" },
			{ header: "แผนก", key: "department" },
			{ header: "สถานะ", key: "statusLabel", align: "center" },
			{ header: "วันที่ซื้อ", key: "purchaseDateFmt", align: "center" },
			{ header: "วันหมดประกัน", key: "warrantyFmt", align: "center" },
			{ header: "หน่วยย่อย", key: "unitCount", align: "center" },
		];
		const pdfRows = filtered.map((r, i) => ({
			_no:            String(i + 1),
			assetCode:      r.assetCode,
			itemName:       r.itemName,
			category:       r.category,
			department:     r.department,
			statusLabel:    STATUS_LABEL[r.status] ?? r.status,
			purchaseDateFmt: fmtDate(r.purchaseDate),
			warrantyFmt:    fmtDate(r.warrantyExpire),
			unitCount:      String(r.unitCount),
		}));
		printAsPdf("รายงานครุภัณฑ์", `กรองโดย: ${selectedStatus ? STATUS_LABEL[selectedStatus] : "ทุกสถานะ"} | ${selectedDept || "ทุกแผนก"}`, columns, pdfRows);
	};

	const statusOptions = [
		{ value: "", label: "สถานะทั้งหมด" },
		...Object.entries(STATUS_LABEL).map(([v, l]) => ({ value: v, label: l })),
	];

	const deptOptions = [
		{ value: "", label: "ทุกแผนก" },
		...departments.map((d) => ({ value: d.name, label: d.name })),
	];

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-3xl font-bold text-gray-800">รายงานครุภัณฑ์</h2>
				<div className="flex items-center gap-3">
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
						placeholder="ค้นหารหัสครุภัณฑ์ / ชื่อสินค้า / แผนก..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
					/>
				</div>

				{/* Status dropdown */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsStatusOpen((o) => !o); setIsDeptOpen(false); }}
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

				{/* Department dropdown */}
				<div className="relative">
					<button
						type="button"
						onClick={() => { setIsDeptOpen((o) => !o); setIsStatusOpen(false); }}
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
			<div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
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
								<th className="px-4 py-4 w-[140px]">รหัสครุภัณฑ์</th>
								<th className="px-4 py-4 w-[220px]">ชื่อสินค้า</th>
								<th className="px-4 py-4 w-[130px]">หมวดหมู่</th>
								<th className="px-4 py-4 w-[160px]">แผนก</th>
								<th className="px-4 py-4 w-[130px]">สถานะ</th>
								<th className="px-4 py-4 w-[120px]">วันที่ซื้อ</th>
								<th className="px-4 py-4 w-[130px]">วันหมดประกัน</th>
								<th className="px-4 py-4 w-[90px] text-center">หน่วยย่อย</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-[13px] text-slate-700">
							{paginated.length > 0 ? (
								paginated.map((r, idx) => (
									<tr key={r.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-4 py-4 text-center text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
										<td className="px-4 py-4 font-mono text-slate-700">{r.assetCode}</td>
										<td className="px-4 py-4 text-slate-900 font-medium">{r.itemName}</td>
										<td className="px-4 py-4 text-slate-600">{r.category}</td>
										<td className="px-4 py-4 text-slate-700">{r.department}</td>
										<td className="px-4 py-4">
											<span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_BADGE[r.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
												{STATUS_LABEL[r.status] ?? r.status}
											</span>
										</td>
										<td className="px-4 py-4 text-slate-500 whitespace-nowrap">{fmtDate(r.purchaseDate)}</td>
										<td className="px-4 py-4 text-slate-500 whitespace-nowrap">{fmtDate(r.warrantyExpire)}</td>
										<td className="px-4 py-4 text-center font-semibold text-slate-700">{r.unitCount}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={9} className="text-center py-12">
										<Box className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบรายการครุภัณฑ์</p>
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

export default AssetReportClient;
