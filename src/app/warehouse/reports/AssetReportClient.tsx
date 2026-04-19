"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Package,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Search,
	X,
} from "lucide-react";

const CsvIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#4caf6e"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">CSV</text>
	</svg>
);

const PdfIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#e53935"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
	</svg>
);
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

const ITEMS_PER_PAGE = 10;

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
	const [selectedStatus, setSelectedStatus] = useState("สถานะทั้งหมด");
	const [selectedDept, setSelectedDept] = useState("ทุกแผนก");
	const [currentPage, setCurrentPage] = useState(1);
	const [isStatusOpen, setIsStatusOpen] = useState(false);
	const [isDeptOpen, setIsDeptOpen] = useState(false);
	const [departments, setDepartments] = useState<DepartmentOption[]>([]);

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const [res, depts] = await Promise.all([
				apiClient.get<ApiResponse>("/v1/reports/assets", {
					params: { limit: 10 },
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
			const matchStatus = selectedStatus === "สถานะทั้งหมด" || r.status === Object.keys(STATUS_LABEL).find(k => STATUS_LABEL[k] === selectedStatus);
			const matchDept = selectedDept === "ทุกแผนก" || r.department === selectedDept;
			return matchSearch && matchStatus && matchDept;
		});
	}, [rows, searchTerm, selectedStatus, selectedDept]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));

	const paginated = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filtered.slice(start, start + ITEMS_PER_PAGE);
	}, [filtered, currentPage]);

	useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedStatus, selectedDept]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
			if (!target.closest("[data-filter-dept]")) setIsDeptOpen(false);
		};

		if (isStatusOpen || isDeptOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isStatusOpen, isDeptOpen]);

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
		printAsPdf("รายงานครุภัณฑ์", `กรองโดย: ${selectedStatus} | ${selectedDept}`, columns, pdfRows);
	};

	const statusOptions = [
		{ value: "สถานะทั้งหมด", label: "สถานะทั้งหมด" },
		...Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: v, label: v })),
	];

	const deptOptions = [
		{ value: "ทุกแผนก", label: "ทุกแผนก" },
		...departments.map((d) => ({ value: d.name, label: d.name })),
	];

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานครุภัณฑ์</h2>
				</div>
				<div className="flex items-center gap-3">
					{onBack && (
						<button
							type="button"
							onClick={onBack}
							className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 text-sm font-semibold transition-colors flex items-center gap-1.5"
						>
							ย้อนกลับ
						</button>
					)}
				</div>
			</div>

<div className="flex flex-wrap gap-3 mb-6 items-center">
			{/* Search */}
			<div className="relative w-64">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
				<input
					type="text"
					placeholder="ค้นหารหัสครุภัณฑ์ / ชื่อสินค้า..."
					value={searchTerm}
					onChange={(e) => {
						setSearchTerm(e.target.value);
						setCurrentPage(1);
					}}
					className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-blue-500 shadow-sm outline-none"
				/>
			</div>

			{/* Status dropdown */}
			<div className="relative" data-filter-status>
				<button
					type="button"
					onClick={() => {
						setIsStatusOpen(!isStatusOpen);
						setIsDeptOpen(false);
					}}
					className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
				>
					<span className="text-slate-800 font-medium">{selectedStatus}</span>
					<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
				</button>
				{isStatusOpen && (
					<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
						<ul className="py-1">
							{statusOptions.map((o) => (
								<li key={o.value}>
									<button
										type="button"
										onClick={() => {
											setSelectedStatus(o.value);
											setIsStatusOpen(false);
											setCurrentPage(1);
										}}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
									>
										{o.label}
									</button>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			{/* Department dropdown */}
			<div className="relative" data-filter-dept>
				<button
					type="button"
					onClick={() => {
						setIsDeptOpen(!isDeptOpen);
						setIsStatusOpen(false);
					}}
					className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
				>
					<span className="text-slate-800 font-medium">{selectedDept}</span>
					<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDeptOpen ? "rotate-180" : ""}`} />
				</button>
				{isDeptOpen && (
					<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
						<ul className="py-1">
							{deptOptions.map((o) => (
								<li key={o.value}>
									<button
										type="button"
										onClick={() => {
											setSelectedDept(o.value);
											setIsDeptOpen(false);
											setCurrentPage(1);
										}}
										className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDept === o.value ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
									>
										{o.label}
									</button>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			{/* Export buttons */}
			{(searchTerm || selectedStatus !== "สถานะทั้งหมด" || selectedDept !== "ทุกแผนก") && (
				<button
					type="button"
					onClick={() => {
						setSearchTerm("");
						setSelectedStatus("สถานะทั้งหมด");
						setSelectedDept("ทุกแผนก");
						setCurrentPage(1);
					}}
					className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm"
				>
					<X className="w-3.5 h-3.5" />
					ล้างตัวกรอง
				</button>
			)}
			<button
				type="button"
				onClick={() => {
					const csvRows = [
						["รหัสครุภัณฑ์", "เลขซีเรียล", "ชื่อสินค้า", "รหัสสินค้า", "หมวดหมู่", "แผนก", "สถานะ", "วันที่ซื้อ", "วันหมดประกัน", "จำนวนหน่วยย่อย"].join(","),
						...filtered.map((r) => [
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
						].join(",")),
					].join("\n");
					const blob = new Blob(["\uFEFF" + csvRows], { type: "text/csv;charset=utf-8;" });
					const url = URL.createObjectURL(blob);
					const anchor = document.createElement("a");
					anchor.href = url;
					anchor.download = `รายงานครุภัณฑ์_${new Date().toISOString().slice(0, 10)}.csv`;
					anchor.click();
					URL.revokeObjectURL(url);
				}}
				className="ml-auto relative flex items-center p-1 bg-green-50 text-green-700 border border-green-300 rounded-lg hover:bg-green-100 transition-all shadow-sm shrink-0"
				title="Export CSV"
			>
				<CsvIcon />
			</button>
			<button
				type="button"
				title="Export PDF"
				onClick={handleExportPdf}
				className="relative flex items-center p-1 bg-red-50 text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-all shadow-sm shrink-0"
			>
				<PdfIcon />
			</button>
			</div>

			{/* Table */}
			<div className="rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden relative flex flex-col" style={{ height: "63vh" }}>
				{isFetching && (
					<div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
						<div className="animate-spin">
							<div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
						</div>
					</div>
				)}
			<div style={{ overflowX: "auto", overflowY: "auto", scrollbarWidth: "auto", msOverflowStyle: "auto" }} className="flex-1">
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
					<thead className="bg-slate-50 text-slate-700 font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
						<tr>
							<th className="px-6 py-4 w-[50px]">#</th>
							<th className="px-6 py-4 w-[140px]">รหัสครุภัณฑ์</th>
							<th className="px-6 py-4 w-[220px]">ชื่อสินค้า</th>
							<th className="px-6 py-4 w-[130px]">หมวดหมู่</th>
							<th className="px-6 py-4 w-[160px]">แผนก</th>
							<th className="px-6 py-4 w-[130px]">สถานะ</th>
							<th className="px-6 py-4 w-[120px]">วันที่ซื้อ</th>
							<th className="px-6 py-4 w-[130px]">วันหมดประกัน</th>
							<th className="px-6 py-4 w-[90px] text-center">หน่วยย่อย</th>
						</tr>
					</thead>
					<tbody className="text-slate-600">
						{paginated.map((r, idx) => (
							<tr key={r.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
								<td className="px-6 py-4 w-[50px] text-center text-slate-500">{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
								<td className="px-6 py-4 font-mono text-slate-700">{r.assetCode}</td>
								<td className="px-6 py-4 text-slate-600">{r.itemName}</td>
								<td className="px-6 py-4 text-slate-600">{r.category}</td>
								<td className="px-6 py-4 text-slate-600">{r.department}</td>
								<td className="px-6 py-4 text-slate-600">{STATUS_LABEL[r.status] ?? r.status}</td>
								<td className="px-6 py-4 text-slate-500 whitespace-nowrap">{fmtDate(r.purchaseDate)}</td>
								<td className="px-6 py-4 text-slate-500 whitespace-nowrap">{fmtDate(r.warrantyExpire)}</td>
								<td className="px-6 py-4 text-center text-slate-700">{r.unitCount}</td>
							</tr>
						))}
						{paginated.length === 0 && !isFetching && (
							<tr>
								<td colSpan={9}>
									<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
										<Package className="w-12 h-12 text-slate-300" />
										<p className="text-sm font-medium">ไม่พบรายการครุภัณฑ์</p>
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
				<p className="text-sm text-slate-500">
					แสดง {paginated.length} จาก {filtered.length} รายการ
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((p) => p - 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setCurrentPage((p) => p + 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default AssetReportClient;
