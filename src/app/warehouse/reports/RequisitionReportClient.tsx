"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	ClipboardCheck,
	Search,
	Download,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { getAllRequisitionsPages } from "@/services/requisitionService";
import { getDepartmentOptions } from "@/services/departmentService";
import type { RequisitionHeader } from "@/types/requisition_type";

interface RequisitionReportClientProps {
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

const TYPE_LABEL: Record<string, string> = {
	WITHDRAW: "เบิก",
	BORROW: "ยืม",
};

const TYPE_BADGE: Record<string, string> = {
	WITHDRAW: "bg-blue-50 text-blue-700 border-blue-100",
	BORROW:   "bg-emerald-50 text-emerald-700 border-emerald-100",
};

const STATUS_LABEL: Record<string, string> = {
	PENDING: "รออนุมัติ",
	APPROVED: "อนุมัติแล้ว",
	COMPLETED: "เสร็จสิ้น",
	BORROWING: "กำลังยืม",
	REJECTED: "ปฏิเสธ",
	DRAFT: "ร่าง",
	CANCELLED: "ยกเลิก",
};

const RequisitionReportClient: React.FC<RequisitionReportClientProps> = ({ onBack }) => {
	const [records, setRecords] = useState<RequisitionHeader[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedType, setSelectedType] = useState("ประเภททั้งหมด");
	const [selectedStatus, setSelectedStatus] = useState("");
	const [selectedDepartment, setSelectedDepartment] = useState("แผนกทั้งหมด");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [isTypeOpen, setIsTypeOpen] = useState(false);
	const [isStatusOpen, setIsStatusOpen] = useState(false);
	const [isDepartmentOpen, setIsDepartmentOpen] = useState(false);
	const [departmentLookup, setDepartmentLookup] = useState<Record<string, string>>({});

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [recordsData, departmentOptions] = await Promise.all([
				getAllRequisitionsPages({ limit: 100 }),
				getDepartmentOptions().catch(() => []),
			]);
			const lookup: Record<string, string> = {};

			departmentOptions.forEach((department) => {
				lookup[String(department.id)] = department.name;
			});

			const data = recordsData.map((record) => ({
				...record,
				department_name: record.department_name || lookup[String(record.department_id)] || record.department_name,
			}));

			setRecords(data);
			setDepartmentLookup(lookup);
		} catch (error) {
			console.error("Load requisition history failed", error);
			setRecords([]);
			setDepartmentLookup({});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const typeOptions = useMemo(() => ["ประเภททั้งหมด", "เบิก", "ยืม"], []);

	// unique raw status codes from data
	const statusOptions = useMemo(() => {
		const rawValues = Array.from(new Set(records.map((r) => String(r.status)).filter(Boolean)));
		// return objects { value: rawCode, label: thaiLabel }
		return [
			{ value: "", label: "สถานะทั้งหมด" },
			...rawValues.map((v) => ({ value: v, label: STATUS_LABEL[v] ?? v })),
		];
	}, [records]);

	const departmentOptions = useMemo(() => {
		const values = Array.from(
			new Set([
				...records.map((record) => record.department_name).filter(Boolean),
				...Object.values(departmentLookup).filter(Boolean),
			])
		) as string[];
		return ["แผนกทั้งหมด", ...values];
	}, [records, departmentLookup]);

	const filteredReports = useMemo(() => {
		let data = [...records];

		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			data = data.filter((record) => {
				const searchableText = [
					record.doc_no,
					record.requester,
					record.department_name,
					record.note,
					record.type,
					...(record.items || []).map((item) => item.code),
					...(record.items || []).map((item) => item.name),
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase();

				return searchableText.includes(term);
			});
		}

		if (selectedType !== "ประเภททั้งหมด") {
			data = data.filter((record) => TYPE_LABEL[record.type] === selectedType);
		}

		if (selectedStatus) {
			data = data.filter((record) => String(record.status) === selectedStatus);
		}

		if (selectedDepartment !== "แผนกทั้งหมด") {
			data = data.filter((record) => record.department_name === selectedDepartment);
		}

		if (dateFrom) {
			data = data.filter((record) => record.request_date >= dateFrom);
		}

		if (dateTo) {
			data = data.filter((record) => record.request_date <= dateTo);
		}

		return data;
	}, [records, searchTerm, selectedType, selectedStatus, selectedDepartment, dateFrom, dateTo]);

	const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));

	const paginatedReports = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredReports.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredReports, currentPage]);

	useEffect(() => {
		setCurrentPage(1);
	}, [searchTerm, selectedType, selectedStatus, selectedDepartment, dateFrom, dateTo]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-filter-type]")) setIsTypeOpen(false);
			if (!target.closest("[data-filter-status]")) setIsStatusOpen(false);
			if (!target.closest("[data-filter-department]")) setIsDepartmentOpen(false);
		};

		if (isTypeOpen || isStatusOpen || isDepartmentOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isTypeOpen, isStatusOpen, isDepartmentOpen]);

	const fmtDateTime = (value?: string | null) => {
		if (!value) return { date: "-", time: "" };
		const dateValue = new Date(value);
		if (Number.isNaN(dateValue.getTime())) return { date: value, time: "" };

		return {
			date: dateValue.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" }),
			time: dateValue.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
		};
	};

	const fmtDateTimeLine = (value?: string | null) => {
		const dateTime = fmtDateTime(value);
		return dateTime.time ? `${dateTime.date} ${dateTime.time}` : dateTime.date;
	};

	const STATUS_BADGE_CLASS: Record<string, string> = {
		COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-100",
		APPROVED:  "bg-blue-50 text-blue-700 border-blue-100",
		BORROWING: "bg-blue-50 text-blue-700 border-blue-100",
		REJECTED:  "bg-rose-50 text-rose-700 border-rose-100",
		PENDING:   "bg-amber-50 text-amber-700 border-amber-100",
		DRAFT:     "bg-slate-100 text-slate-500 border-slate-200",
		CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
	};

	const getStatusBadge = (status: string) => (
		<span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_BADGE_CLASS[status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}>
			{STATUS_LABEL[status] ?? status}
		</span>
	);

	const handleExportCsv = () => {
		const rows = [
			["เลขที่เอกสาร", "วันที่", "ประเภท", "ผู้ทำรายการ", "แผนก", "จำนวนรายการ", "สถานะ", "หมายเหตุ"].join(","),
			...filteredReports.map((record) => [
				record.doc_no,
				record.request_date,
				TYPE_LABEL[record.type] ?? record.type,
				record.requester || "-",
				record.department_name || "-",
				record.item_count ?? record.items.length,
				STATUS_LABEL[record.status] ?? record.status,
				record.note || "",
			].join(",")),
		].join("\n");

		const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = `รายงานคำขอเบิกยืม_${new Date().toISOString().slice(0, 10)}.csv`;
		anchor.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="flex flex-col min-h-screen bg-white p-8">
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-4">
					<h2 className="text-3xl font-bold text-gray-800">รายงานการเบิก/ยืม</h2>
				</div>
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

			<div className="flex flex-wrap gap-3 mb-6 items-center">
				<div className="relative w-72">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
					<input
						type="text"
						placeholder="ค้นหาเลขที่เอกสาร / ผู้ทำรายการ / แผนก / รายการ..."
						value={searchTerm}
						onChange={(event) => setSearchTerm(event.target.value)}
						className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-emerald-500 shadow-sm outline-none"
					/>
				</div>

				<div className="relative" data-filter-type>
					<button
						type="button"
						onClick={() => {
							setIsTypeOpen(!isTypeOpen);
							setIsStatusOpen(false);
							setIsDepartmentOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[180px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedType}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isTypeOpen ? "rotate-180" : ""}`} />
					</button>
					{isTypeOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{typeOptions.map((type) => (
									<li key={type}>
										<button
											type="button"
											onClick={() => {
												setSelectedType(type);
												setIsTypeOpen(false);
												setCurrentPage(1);
											}}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedType === type ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{type}
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
							setIsTypeOpen(false);
							setIsDepartmentOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
					>
						<span className="text-slate-800 font-medium">
							{statusOptions.find((s) => s.value === selectedStatus)?.label ?? "สถานะทั้งหมด"}
						</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isStatusOpen ? "rotate-180" : ""}`} />
					</button>
					{isStatusOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{statusOptions.map((s) => (
									<li key={s.value}>
										<button
											type="button"
											onClick={() => {
												setSelectedStatus(s.value);
												setIsStatusOpen(false);
												setCurrentPage(1);
											}}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedStatus === s.value ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{s.label}
										</button>
									</li>
								))}
							</ul>
						</div>
					)}
				</div>

				<div className="relative" data-filter-department>
					<button
						type="button"
						onClick={() => {
							setIsDepartmentOpen(!isDepartmentOpen);
							setIsTypeOpen(false);
							setIsStatusOpen(false);
						}}
						className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[220px] justify-between"
					>
						<span className="text-slate-800 font-medium">{selectedDepartment}</span>
						<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDepartmentOpen ? "rotate-180" : ""}`} />
					</button>
					{isDepartmentOpen && (
						<div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full max-h-64 overflow-y-auto">
							<ul className="py-1">
								{departmentOptions.map((department) => (
									<li key={department}>
										<button
											type="button"
											onClick={() => {
												setSelectedDepartment(department);
												setIsDepartmentOpen(false);
												setCurrentPage(1);
											}}
											className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${selectedDepartment === department ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700 hover:bg-slate-50"}`}
										>
											{department}
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
						value={dateFrom}
						onChange={(e) => setDateFrom(e.target.value)}
						className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
					/>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-slate-600 font-medium">วันที่สิ้นสุด</label>
					<input
						type="date"
						value={dateTo}
						onChange={(e) => setDateTo(e.target.value)}
						className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
					/>
				</div>

				<button
					type="button"
					onClick={handleExportCsv}
					className="ml-auto flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors text-sm font-semibold shadow-sm"
				>
					<Download className="w-4 h-4" />
					Export CSV
				</button>
			</div>

			<div className="rounded-lg bg-white shadow-lg border border-slate-300 overflow-hidden relative flex flex-col" style={{ height: "65vh" }}>
				{isLoading && (
					<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
						<div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
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
						<thead>
							<tr className="bg-slate-50 text-slate-700 text-[13px] font-semibold uppercase border-b border-slate-300 sticky top-0 z-10">
								<th className="px-6 py-4 w-[60px] text-center">#</th>
								<th className="px-6 py-4 w-[170px]">เลขที่เอกสาร</th>
								<th className="px-6 py-4 w-[170px]">วันที่และเวลา</th>
								<th className="px-6 py-4 w-[230px]">ชื่อผู้ทำรายการ</th>
								<th className="px-6 py-4 w-[220px]">แผนก</th>
								<th className="px-6 py-4 w-[120px]">ประเภท</th>
								<th className="px-6 py-4 w-[150px]">สถานะ</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100 text-slate-700">
							{paginatedReports.length > 0 ? (
								paginatedReports.map((record, index) => (
									<tr key={record.id} className="hover:bg-slate-50 transition-colors">
										<td className="px-6 py-4 text-slate-500 text-xs w-[60px] text-center">
											{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
										</td>
										<td className="px-6 py-4 font-mono text-xs text-slate-700 w-[170px]">{record.doc_no}</td>
										<td className="px-6 py-4 w-[170px]">
											<div className="text-slate-900 whitespace-nowrap">{fmtDateTimeLine(record.request_date)}</div>
										</td>
										<td className="px-6 py-4 w-[230px]">
											<div className="text-slate-900">{record.requester || "-"}</div>
										</td>
										<td className="px-6 py-4 text-slate-600 w-[220px]">{record.department_name || "ไม่ระบุแผนก"}</td>
										<td className="px-6 py-4 w-[120px]">
											<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${TYPE_BADGE[record.type] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
												{TYPE_LABEL[record.type] ?? record.type}
											</span>
										</td>
										<td className="px-6 py-4 w-[150px]">{getStatusBadge(record.status)}</td>
									</tr>
								))
							) : (
								<tr>
									<td colSpan={7} className="text-center py-12">
										<ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-sm text-slate-500">ไม่พบรายการคำขอเบิก/ยืม</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex items-center justify-between mt-6">
				<p className="text-sm text-slate-500">แสดง {paginatedReports.length} จาก {filteredReports.length} รายการ</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage === 1}
						onClick={() => setCurrentPage((page) => page - 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium">หน้า {currentPage} / {totalPages}</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setCurrentPage((page) => page + 1)}
						className="p-2 border border-slate-400 rounded-lg disabled:opacity-30 bg-white"
					>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

export default RequisitionReportClient;
