"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Search,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	X,
	Inbox,
} from "lucide-react";
import { fmtDate, fmtDateTime, fmtDateLong, formatReportPeriod } from "@/utils/dateUtils";
import { OutlinedDateField } from "../../_components/OutlinedDateField";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { downloadCsv } from "@/utils/downloadCsv";
import { useUser } from "@/context/UserContext";
import { getAllRequisitionsPages } from "@/services/requisitionService";
import { getDepartmentOptions } from "@/services/departmentService";
import type { RequisitionHeader } from "@/types/requisition_type";
import { ReportDetailPageHeader } from "../../_components/ReportDetailPageHeader";

// ── Icons ─────────────────────────────────────────────────────────────────────

const CsvIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#0ea5e9"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">CSV</text>
	</svg>
);

const PdfIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#dc2626"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
	</svg>
);

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

const TYPE_LABEL: Record<string, string> = {
	WITHDRAW: "เบิก",
	BORROW:   "ยืม",
};

const TYPE_BADGE: Record<string, string> = {
	WITHDRAW: "bg-blue-50 text-blue-700 border-blue-200",
	BORROW:   "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_LABEL: Record<string, string> = {
	PENDING:              "รออนุมัติ",
	APPROVED:             "อนุมัติแล้ว",
	COMPLETED:            "เสร็จสิ้น",
	BORROWING:            "กำลังยืม",
	REJECTED:             "ปฏิเสธ",
	DRAFT:                "ร่าง",
	CANCELLED:            "ยกเลิก",
	PENDING_RETURN_CHECK: "รอตรวจสอบคืน",
};

const STATUS_BADGE: Record<string, string> = {
	COMPLETED:            "bg-emerald-50 text-emerald-700 border-emerald-200",
	APPROVED:             "bg-blue-50 text-blue-700 border-blue-200",
	BORROWING:            "bg-cyan-50 text-cyan-700 border-cyan-200",
	REJECTED:             "bg-rose-50 text-rose-700 border-rose-200",
	PENDING:              "bg-amber-50 text-amber-700 border-amber-200",
	DRAFT:                "bg-slate-100 text-slate-500 border-slate-200",
	CANCELLED:            "bg-slate-100 text-slate-400 border-slate-200",
	PENDING_RETURN_CHECK: "bg-violet-50 text-violet-700 border-violet-200",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequisitionReportClientProps {
	onBack?: () => void;
}

// ── Dropdown helper ───────────────────────────────────────────────────────────

interface DropdownProps {
	attr: string;
	label: string;
	value: string;
	options: { value: string; label: string }[];
	open: boolean;
	onToggle: () => void;
	onChange: (v: string) => void;
	width?: string;
}

const FilterDropdown: React.FC<DropdownProps> = ({ attr, label, value, options, open, onToggle, onChange, width = "min-w-[160px]" }) => {
	const current = options.find(o => o.value === value)?.label ?? label;
	return (
		<div className="relative" data-filter={attr}>
			<button
				type="button"
				onClick={onToggle}
				className={`flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 text-sm bg-white shadow-sm hover:bg-slate-50 ${width}`}
			>
				<span className="flex-1 text-left text-slate-700 truncate">{current}</span>
				<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
			</button>
			{open && (
				<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-full min-w-[160px]">
					{options.map(opt => (
						<button
							key={opt.value}
							type="button"
							onClick={() => onChange(opt.value)}
							className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${value === opt.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}
						>
							{opt.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

// ── Component ─────────────────────────────────────────────────────────────────

const RequisitionReportClient: React.FC<RequisitionReportClientProps> = ({ onBack }) => {
	const { profile } = useUser();

	const [records,       setRecords]       = useState<RequisitionHeader[]>([]);
	const [isLoading,     setIsLoading]     = useState(true);
	const [searchTerm,    setSearchTerm]    = useState("");
	const [selectedType,  setSelectedType]  = useState("");
	const [selectedStatus,     setSelectedStatus]     = useState("");
	const [selectedDepartment, setSelectedDepartment] = useState("");
	const [dateFrom,      setDateFrom]      = useState("");
	const [dateTo,        setDateTo]        = useState("");
	const [currentPage,   setCurrentPage]   = useState(1);

	const [openDropdown, setOpenDropdown] = useState<"type" | "status" | "department" | null>(null);
	const [departmentLookup, setDepartmentLookup] = useState<Record<string, string>>({});

	const printDate = fmtDateLong(new Date());

	const loadData = useCallback(async () => {
		setIsLoading(true);
		try {
			const [recordsData, departmentOptions] = await Promise.all([
				getAllRequisitionsPages(),
				getDepartmentOptions().catch(() => []),
			]);
			const lookup: Record<string, string> = {};
			departmentOptions.forEach(d => { lookup[String(d.id)] = d.name; });

			setRecords(recordsData.map(r => ({
				...r,
				department_name: r.department_name || lookup[String(r.department_id)] || r.department_name,
			})));
			setDepartmentLookup(lookup);
		} catch (error) {
			console.error("Load requisition history failed", error);
			setRecords([]);
			setDepartmentLookup({});
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => { loadData(); }, [loadData]);

	// Close dropdown on outside click
	useEffect(() => {
		if (!openDropdown) return;
		const h = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest(`[data-filter="${openDropdown}"]`))
				setOpenDropdown(null);
		};
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [openDropdown]);

	const typeOptions = useMemo(() => [
		{ value: "", label: "ประเภททั้งหมด" },
		{ value: "WITHDRAW", label: "เบิก" },
		{ value: "BORROW",   label: "ยืม" },
	], []);

	const statusOptions = useMemo(() => {
		const raw = Array.from(new Set(records.map(r => String(r.status)).filter(Boolean)));
		return [
			{ value: "", label: "สถานะทั้งหมด" },
			...raw.map(v => ({ value: v, label: STATUS_LABEL[v] ?? v })),
		];
	}, [records]);

	const departmentOptions = useMemo(() => {
		const vals = Array.from(new Set([
			...records.map(r => r.department_name).filter(Boolean),
			...Object.values(departmentLookup).filter(Boolean),
		])) as string[];
		return [
			{ value: "", label: "แผนกทั้งหมด" },
			...vals.map(v => ({ value: v, label: v })),
		];
	}, [records, departmentLookup]);

	const filteredReports = useMemo(() => {
		let data = [...records];

		if (searchTerm) {
			const term = searchTerm.toLowerCase();
			data = data.filter(r =>
				[r.doc_no, r.requester, r.department_name, r.note, r.type,
					...(r.items || []).map(i => i.code),
					...(r.items || []).map(i => i.name),
				].filter(Boolean).join(" ").toLowerCase().includes(term)
			);
		}
		if (selectedType)       data = data.filter(r => r.type === selectedType);
		if (selectedStatus)     data = data.filter(r => String(r.status) === selectedStatus);
		if (selectedDepartment) data = data.filter(r => r.department_name === selectedDepartment);
		if (dateFrom)           data = data.filter(r => r.request_date >= dateFrom);
		if (dateTo)             data = data.filter(r => r.request_date <= dateTo);

		return data;
	}, [records, searchTerm, selectedType, selectedStatus, selectedDepartment, dateFrom, dateTo]);

	const totalPages = Math.max(1, Math.ceil(filteredReports.length / ITEMS_PER_PAGE));

	const paginatedReports = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredReports.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredReports, currentPage]);

	useEffect(() => { setCurrentPage(1); },
		[searchTerm, selectedType, selectedStatus, selectedDepartment, dateFrom, dateTo]);

	const hasFilter = !!(searchTerm || selectedType || selectedStatus || selectedDepartment || dateFrom || dateTo);

	const summaryStats = useMemo(() => {
		const totalLines = filteredReports.reduce((s, r) => s + (r.item_count ?? r.items?.length ?? 0), 0);
		const avgLines = filteredReports.length > 0 ? totalLines / filteredReports.length : 0;
		const statusCount: Record<string, number> = {};
		for (const r of filteredReports) {
			const s = String(r.status);
			statusCount[s] = (statusCount[s] ?? 0) + 1;
		}
		const typeCount = {
			WITHDRAW: filteredReports.filter(r => r.type === "WITHDRAW").length,
			BORROW:   filteredReports.filter(r => r.type === "BORROW").length,
		};
		return { totalLines, avgLines, statusCount, typeCount };
	}, [filteredReports]);
	const clearFilters = () => {
		setSearchTerm(""); setSelectedType(""); setSelectedStatus("");
		setSelectedDepartment(""); setDateFrom(""); setDateTo(""); setCurrentPage(1);
	};

	const handleExportCsv = () => {
		downloadCsv({
			headers: ["เลขที่คำขอ", "วันที่", "ประเภท", "ผู้ทำรายการ", "แผนก", "จำนวนรายการ", "สถานะ", "หมายเหตุ"],
			rows: filteredReports.map(r => [
				r.doc_no,
				r.request_date,
				TYPE_LABEL[r.type] ?? r.type,
				r.requester || "-",
				r.department_name || "-",
				r.item_count ?? r.items.length,
				STATUS_LABEL[r.status] ?? r.status,
				r.note || "",
			]),
			filename: `รายงานคำขอเบิกยืม_${new Date().toISOString().slice(0, 10)}.csv`,
		});
	};

	const handleExportPdf = () => {
		const columns: PrintColumn[] = [
			{ header: "เลขที่คำขอ",  key: "doc_no" },
			{ header: "วันที่",       key: "dateFmt" },
			{ header: "ผู้ทำรายการ", key: "requester" },
			{ header: "แผนก",         key: "department" },
			{ header: "ประเภท",       key: "typeLabel",   align: "center" },
			{ header: "รายการ",       key: "itemCount",   align: "center" },
			{ header: "สถานะ",        key: "statusLabel" },
		];
		const pdfRows = filteredReports.map(r => ({
			doc_no:      r.doc_no,
			dateFmt:     fmtDate(r.request_date),
			requester:   r.requester || "-",
			department:  r.department_name || "ไม่ระบุแผนก",
			typeLabel:   TYPE_LABEL[r.type] ?? r.type,
			itemCount:   String(r.item_count ?? r.items.length),
			statusLabel: STATUS_LABEL[r.status] ?? r.status,
		}));

		const period = formatReportPeriod(dateFrom, dateTo);

		const filterParts: string[] = [];
		if (selectedType)       filterParts.push(`ประเภท: ${TYPE_LABEL[selectedType] ?? selectedType}`);
		if (selectedStatus)     filterParts.push(`สถานะ: ${STATUS_LABEL[selectedStatus] ?? selectedStatus}`);
		if (selectedDepartment) filterParts.push(`แผนก: ${selectedDepartment}`);

		const printedByName = [profile?.title?.name, profile?.firstname_th, profile?.lastname_th]
			.filter(Boolean).join("") || undefined;

		printWarehouseReport({
			reportTitle:   "รายงานคำขอเบิก/ยืมพัสดุ",
			period,
			filterSummary: filterParts.length ? filterParts.join(" | ") : undefined,
			columns,
			rows:          pdfRows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
			signers: [
				{
					role: "ผู้ออกรายงาน",
					name: printedByName,
					date: new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" }),
				},
				{ role: "ผู้ตรวจสอบ" },
				{ role: "ผู้อนุมัติ" },
			],
		});
	};

	const toggle = (d: typeof openDropdown) =>
		setOpenDropdown(prev => (prev === d ? null : d));

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			<ReportDetailPageHeader
				reportPage="requisition"
				title="รายงานคำขอเบิก/ยืม"
				subtitle={`ระบบบริหารคลังสินค้า HPK · พิมพ์วันที่ ${printDate}`}
				onBack={onBack}
			/>

			{/* ── Content ──────────────────────────────────────────────────────── */}
			<div className="flex-1 px-8 py-6">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* ── Toolbar ───────────────────────────────────────────────── */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">

						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input
								type="text"
								placeholder="ค้นหาเลขที่คำขอ / ผู้ทำรายการ / แผนก..."
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
								className="h-10 pl-9 pr-3 w-72 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						{/* Type */}
						<FilterDropdown
							attr="type"
							label="ประเภททั้งหมด"
							value={selectedType}
							options={typeOptions}
							open={openDropdown === "type"}
							onToggle={() => toggle("type")}
							onChange={v => { setSelectedType(v); setOpenDropdown(null); }}
							width="min-w-[150px]"
						/>

						{/* Status */}
						<FilterDropdown
							attr="status"
							label="สถานะทั้งหมด"
							value={selectedStatus}
							options={statusOptions}
							open={openDropdown === "status"}
							onToggle={() => toggle("status")}
							onChange={v => { setSelectedStatus(v); setOpenDropdown(null); }}
							width="min-w-[160px]"
						/>

						{/* Department */}
						<FilterDropdown
							attr="department"
							label="แผนกทั้งหมด"
							value={selectedDepartment}
							options={departmentOptions}
							open={openDropdown === "department"}
							onToggle={() => toggle("department")}
							onChange={v => { setSelectedDepartment(v); setOpenDropdown(null); }}
							width="min-w-[180px]"
						/>

						{/* Date range */}
						<OutlinedDateField label="วันที่เริ่มต้น" value={dateFrom} onChange={setDateFrom} />
						<OutlinedDateField label="วันที่สิ้นสุด"  value={dateTo}   onChange={setDateTo} />

						{/* Clear */}
						{hasFilter && (
							<button type="button" onClick={clearFilters}
								className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
								<X className="w-3.5 h-3.5" />
								ล้างตัวกรอง
							</button>
						)}

						{/* Export */}
						<div className="ml-auto flex items-center gap-2">
							<button type="button" title="Export CSV (.csv)" onClick={handleExportCsv}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
								<CsvIcon />
							</button>
							<button type="button" title="Export PDF" onClick={handleExportPdf}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
								<PdfIcon />
							</button>
						</div>
					</div>

					{/* ── Row count strip ────────────────────────────────────────── */}
					<div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 bg-white border-b border-slate-100 text-sm">
						<span className="text-slate-500">
							พบ <span className="font-semibold text-slate-700">{filteredReports.length.toLocaleString()}</span> รายการ
						</span>
						<span className="text-slate-300">·</span>
						<span className="text-blue-700">เบิก <span className="font-semibold">{summaryStats.typeCount.WITHDRAW.toLocaleString()}</span></span>
						<span className="text-indigo-700">ยืม <span className="font-semibold">{summaryStats.typeCount.BORROW.toLocaleString()}</span></span>
						<span className="text-slate-300">·</span>
						<span className="text-emerald-700">เสร็จสิ้น <span className="font-semibold">{(summaryStats.statusCount.COMPLETED ?? 0).toLocaleString()}</span></span>
						<span className="text-amber-700">รออนุมัติ <span className="font-semibold">{(summaryStats.statusCount.PENDING ?? 0).toLocaleString()}</span></span>
						<span className="text-red-700">ปฏิเสธ/ยกเลิก <span className="font-semibold">{((summaryStats.statusCount.REJECTED ?? 0) + (summaryStats.statusCount.CANCELLED ?? 0)).toLocaleString()}</span></span>
						<span className="text-slate-300">·</span>
						<span className="text-slate-600">รายการรวม <span className="font-semibold">{summaryStats.totalLines.toLocaleString()}</span></span>
						<span className="text-slate-600">เฉลี่ย <span className="font-semibold">{summaryStats.avgLines.toFixed(1)}</span> ราย/ใบ</span>
						{hasFilter && (
							<span className="ml-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
								กำลังกรองข้อมูล
							</span>
						)}
					</div>

					{/* ── Table ─────────────────────────────────────────────────── */}
					<div className="relative w-full overflow-x-auto">
						{isLoading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full text-sm text-left min-w-[880px]">
							<colgroup>
								<col className="w-[48px]" />
								<col className="w-[140px]" />
								<col className="w-[148px]" />
								<col className="w-[200px]" />
								<col className="w-[170px]" />
								<col className="w-[88px]" />
								<col className="w-[80px]" />
								<col className="w-[140px]" />
							</colgroup>
							<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">เลขที่คำขอ</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">วันที่และเวลา</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ผู้ทำรายการ</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">แผนก</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ประเภท</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">รายการ</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">สถานะ</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{paginatedReports.length === 0 && !isLoading ? (
									<tr>
										<td colSpan={8}>
											<div className="flex flex-col items-center justify-center py-16 gap-2">
												<Inbox className="w-12 h-12 text-slate-200" />
												<p className="text-sm text-slate-400">ไม่พบรายการคำขอเบิก/ยืม</p>
											</div>
										</td>
									</tr>
								) : (
									paginatedReports.map((record, index) => (
										<tr key={record.id} className="bg-white hover:bg-slate-50 transition-colors">
											<td className="px-4 py-3 text-center text-xs text-slate-700 tabular-nums">
												{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
											</td>
											<td className="px-4 py-3 text-sm text-slate-700 font-mono tabular-nums">
												{record.doc_no}
											</td>
											<td className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap tabular-nums">
												{fmtDateTime(record.request_date)}
											</td>
											<td className="px-4 py-3 text-sm text-slate-700 truncate">
												{record.requester || "-"}
											</td>
											<td className="px-4 py-3 text-sm text-slate-700 truncate">
												{record.department_name || "ไม่ระบุแผนก"}
											</td>
											<td className="px-4 py-3 text-center">
												<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${TYPE_BADGE[record.type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
													{TYPE_LABEL[record.type] ?? record.type}
												</span>
											</td>
											<td className="px-4 py-3 text-center text-sm text-slate-700 tabular-nums">
												{(record.item_count ?? record.items?.length ?? 0).toLocaleString()}
											</td>
											<td className="px-4 py-3">
												<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[record.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
													{STATUS_LABEL[record.status] ?? record.status}
												</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>

					{/* ── Pagination ────────────────────────────────────────────── */}
					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-xs text-slate-500">
							แสดง <span className="font-semibold text-slate-700">{paginatedReports.length}</span> จาก{" "}
							<span className="font-semibold text-slate-700">{filteredReports.length.toLocaleString()}</span> รายการ
						</p>
						{totalPages > 1 && (
							<div className="flex items-center gap-2">
								<button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs font-medium px-2 text-slate-600">หน้า {currentPage} / {totalPages}</span>
								<button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50 transition-colors">
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Footer ──────────────────────────────────────────────────────── */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานคำขอเบิก/ยืม</p>
			</div>
		</div>
	);
};

export default RequisitionReportClient;
