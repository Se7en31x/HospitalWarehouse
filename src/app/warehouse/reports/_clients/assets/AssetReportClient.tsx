"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Inbox, Search, X } from "lucide-react";
import { fmtDate, fmtDateLong } from "@/utils/dateUtils";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { getDepartmentOptions, type DepartmentOption } from "@/services/departmentService";
import { ReportDetailPageHeader } from "../../_components/ReportDetailPageHeader";

// ── Icons ─────────────────────────────────────────────────────────────────────

const XlsxIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#16a34a"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">XLSX</text>
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

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface AssetReportClientProps {
	onBack?: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 20;

const STATUS_LABEL: Record<string, string> = {
	READY:    "พร้อมใช้งาน",
	IN_USE:   "กำลังใช้งาน",
	REPAIR:   "ซ่อมบำรุง",
	DISPOSED: "เลิกใช้งาน",
};

const STATUS_BADGE: Record<string, string> = {
	READY:    "bg-emerald-50 text-emerald-700 border-emerald-200",
	IN_USE:   "bg-blue-50 text-blue-700 border-blue-200",
	REPAIR:   "bg-amber-50 text-amber-700 border-amber-200",
	DISPOSED: "bg-slate-100 text-slate-500 border-slate-200",
};

const STATUS_OPTIONS = [
	{ value: "", label: "สถานะทั้งหมด" },
	...Object.entries(STATUS_LABEL).map(([k, v]) => ({ value: k, label: v })),
];

// ── Component ─────────────────────────────────────────────────────────────────

const AssetReportClient: React.FC<AssetReportClientProps> = ({ onBack }) => {
	const { profile } = useUser();

	const [rows,        setRows]        = useState<AssetRow[]>([]);
	const [isFetching,  setIsFetching]  = useState(true);
	const [searchTerm,  setSearchTerm]  = useState("");
	const [statusFilter,setStatusFilter]= useState("");
	const [deptFilter,  setDeptFilter]  = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [openDd,      setOpenDd]      = useState<"status" | "dept" | null>(null);
	const [departments, setDepartments] = useState<DepartmentOption[]>([]);

	const printDate = fmtDateLong(new Date());
	const thaiDateShort = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });
	const printedByName = [profile?.title?.name, profile?.firstname_th, profile?.lastname_th].filter(Boolean).join("") || undefined;

	const loadData = useCallback(async () => {
		setIsFetching(true);
		try {
			const [res, depts] = await Promise.all([
				apiClient.get<ApiResponse>("/v1/reports/assets", { params: { limit: 9999 } }),
				getDepartmentOptions().catch(() => [] as DepartmentOption[]),
			]);
			setRows((res.data as ApiResponse).items ?? []);
			setDepartments(depts);
		} catch {
			setRows([]);
		} finally {
			setIsFetching(false);
		}
	}, []);

	useEffect(() => { loadData(); }, [loadData]);

	useEffect(() => {
		if (!openDd) return;
		const h = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest(`[data-dd="${openDd}"]`)) setOpenDd(null);
		};
		document.addEventListener("mousedown", h);
		return () => document.removeEventListener("mousedown", h);
	}, [openDd]);

	const filtered = useMemo(() => {
		const kw = searchTerm.trim().toLowerCase();
		return rows.filter(r => {
			if (kw && ![r.assetCode, r.serialNo, r.itemName, r.itemCode, r.department, r.category]
				.some(s => s?.toLowerCase().includes(kw))) return false;
			if (statusFilter && r.status !== statusFilter) return false;
			if (deptFilter   && r.department !== deptFilter) return false;
			return true;
		});
	}, [rows, searchTerm, statusFilter, deptFilter]);

	const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
	const paginated  = useMemo(() => filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filtered, currentPage]);
	useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, deptFilter]);

	const hasFilter = !!(searchTerm || statusFilter || deptFilter);
	const clearAll  = () => { setSearchTerm(""); setStatusFilter(""); setDeptFilter(""); };

	const deptOptions = [
		{ value: "", label: "ทุกแผนก" },
		...departments.map(d => ({ value: d.name, label: d.name })),
	];

	// Dropdown helper
	const Dropdown = ({ id, value, options, onChange }: { id: "status" | "dept"; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) => {
		const cur = options.find(o => o.value === value)?.label ?? options[0].label;
		return (
			<div className="relative" data-dd={id}>
				<button type="button" onClick={() => setOpenDd(p => p === id ? null : id)}
					className="flex h-10 items-center gap-2 border border-slate-300 rounded-lg px-3 text-sm bg-white shadow-sm hover:bg-slate-50 min-w-[170px]">
					<span className="flex-1 text-left text-slate-700 truncate">{cur}</span>
					<ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openDd === id ? "rotate-180" : ""}`} />
				</button>
				{openDd === id && (
					<div className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-full min-w-[170px] max-h-60 overflow-y-auto">
						{options.map(o => (
							<button key={o.value} type="button" onClick={() => { onChange(o.value); setOpenDd(null); }}
								className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${value === o.value ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-700"}`}>
								{o.label}
							</button>
						))}
					</div>
				)}
			</div>
		);
	};

	// ── PDF export ────────────────────────────────────────────────────────────
	const handleExportPdf = () => {
		const columns: PrintColumn[] = [
			{ header: "#",            key: "_no",          align: "center" },
			{ header: "รหัสครุภัณฑ์", key: "assetCode",    align: "left"   },
			{ header: "ชื่อครุภัณฑ์", key: "itemName",     align: "left"   },
			{ header: "หมวดหมู่",     key: "category",     align: "left"   },
			{ header: "แผนก",         key: "department",   align: "left"   },
			{ header: "สถานะ",        key: "statusLabel",  align: "center" },
			{ header: "วันที่ซื้อ",   key: "purchaseFmt",  align: "center" },
			{ header: "วันหมดประกัน", key: "warrantyFmt",  align: "center" },
			{ header: "หน่วยย่อย",   key: "unitCount",    align: "center" },
		];
		const pdfRows = filtered.map((r, i) => ({
			_no:         String(i + 1),
			assetCode:   r.assetCode,
			itemName:    r.itemName,
			category:    r.category,
			department:  r.department,
			statusLabel: STATUS_LABEL[r.status] ?? r.status,
			purchaseFmt: fmtDate(r.purchaseDate),
			warrantyFmt: fmtDate(r.warrantyExpire),
			unitCount:   String(r.unitCount),
		}));

		const filterParts: string[] = [];
		if (statusFilter) filterParts.push(`สถานะ: ${STATUS_LABEL[statusFilter] ?? statusFilter}`);
		if (deptFilter)   filterParts.push(`แผนก: ${deptFilter}`);

		printWarehouseReport({
			reportTitle:   "รายงานครุภัณฑ์",
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
				{ role: "ผู้ออกรายงาน", name: printedByName, date: thaiDateShort },
				{ role: "ผู้ตรวจสอบ" },
				{ role: "ผู้อนุมัติ" },
			],
		});
	};

	// ── XLSX export ───────────────────────────────────────────────────────────
	const handleExportXlsx = async () => {
		if (filtered.length === 0) return;
		const ExcelJS  = (await import("exceljs")).default;
		const wb       = new ExcelJS.Workbook();
		wb.creator     = "HPK WMS";
		wb.created     = new Date();

		const FONT      = "TH Sarabun New";
		const HEADER_BG = "FF37474F";
		const COLS      = 9;

		const ws = wb.addWorksheet("ครุภัณฑ์");
		ws.columns = [
			{ width: 6  }, { width: 18 }, { width: 16 }, { width: 36 }, { width: 20 },
			{ width: 24 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 10 },
		];

		const r1 = ws.addRow(["รายงานครุภัณฑ์"]);
		ws.mergeCells(r1.number, 1, r1.number, COLS);
		r1.height = 28;
		r1.getCell(1).style = { font: { name: FONT, size: 16, bold: true, color: { argb: "FF0D47A1" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3F2FD" } }, alignment: { horizontal: "center", vertical: "middle" } };

		const r2 = ws.addRow(["ระบบบริหารคลังสินค้า HPK"]);
		ws.mergeCells(r2.number, 1, r2.number, COLS);
		r2.height = 18;
		r2.getCell(1).style = { font: { name: FONT, size: 11, color: { argb: "FF546E7A" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } }, alignment: { horizontal: "center", vertical: "middle" } };

		const r3 = ws.addRow([`รวม ${filtered.length.toLocaleString()} รายการ    |    วันที่สร้าง: ${new Date().toLocaleDateString("th-TH")}`]);
		ws.mergeCells(r3.number, 1, r3.number, COLS);
		r3.height = 16;
		r3.getCell(1).style = { font: { name: FONT, size: 10, color: { argb: "FF546E7A" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAFA" } }, alignment: { horizontal: "center", vertical: "middle" } };

		ws.addRow([]);

		const hr = ws.addRow(["#", "รหัสครุภัณฑ์", "เลขซีเรียล", "ชื่อครุภัณฑ์", "หมวดหมู่", "แผนก", "สถานะ", "วันที่ซื้อ", "วันหมดประกัน", "หน่วยย่อย"]);
		hr.height = 22;
		hr.eachCell(cell => {
			cell.style = { font: { name: FONT, size: 12, bold: true, color: { argb: "FFFFFFFF" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } }, alignment: { horizontal: "center", vertical: "middle" }, border: { top: { style: "thin", color: { argb: "FF546E7A" } }, left: { style: "thin", color: { argb: "FF546E7A" } }, bottom: { style: "thin", color: { argb: "FF546E7A" } }, right: { style: "thin", color: { argb: "FF546E7A" } } } };
		});

		const statusBg: Record<string, string> = { AVAILABLE: "FFD1FAE5", IN_USE: "FFDBEAFE", MAINTENANCE: "FFFEF3C7", RETIRED: "FFF1F5F9", LOST: "FFFEE2E2" };
		filtered.forEach((r, i) => {
			const bg  = i % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC";
			const sBg = statusBg[r.status] ?? bg;
			const dr  = ws.addRow([i + 1, r.assetCode, r.serialNo || "-", r.itemName, r.category, r.department, STATUS_LABEL[r.status] ?? r.status, fmtDate(r.purchaseDate), fmtDate(r.warrantyExpire), r.unitCount]);
			dr.height = 18;
			dr.eachCell({ includeEmpty: true }, (cell, col) => {
				cell.font   = { name: FONT, size: 11 };
				cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: col === 7 ? sBg : bg } };
				cell.border = { top: { style: "thin", color: { argb: "FFB0BEC5" } }, left: { style: "thin", color: { argb: "FFB0BEC5" } }, bottom: { style: "thin", color: { argb: "FFB0BEC5" } }, right: { style: "thin", color: { argb: "FFB0BEC5" } } };
				if ([1, 7, 8, 9, 10].includes(col)) cell.alignment = { horizontal: "center" };
			});
		});

		ws.addRow([]);
		const fr = ws.addRow(["** รายงานนี้สร้างโดยระบบ HPK WMS อัตโนมัติ **"]);
		ws.mergeCells(fr.number, 1, fr.number, COLS);
		fr.getCell(1).style = { font: { name: FONT, size: 10, italic: true, color: { argb: "FF9E9E9E" } }, alignment: { horizontal: "right" } };

		const buf  = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
		const url  = URL.createObjectURL(blob);
		const a    = document.createElement("a");
		a.href     = url;
		a.download = `รายงานครุภัณฑ์_${new Date().toISOString().slice(0, 10)}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	};

	// ── Render ────────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col min-h-screen bg-slate-50">

			<ReportDetailPageHeader
				reportPage="assets"
				title="รายงานครุภัณฑ์ภายในองค์กรณ์"
				subtitle={`ระบบบริหารคลังสินค้า HPK · พิมพ์วันที่ ${printDate}`}
				onBack={onBack}
			/>

			{/* Content */}
			<div className="flex-1 px-8 py-6">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

					{/* Toolbar */}
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
							<input type="text" placeholder="ค้นหารหัสครุภัณฑ์ / ชื่อ / หมวดหมู่..."
								value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
								className="h-10 pl-9 pr-3 w-68 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
						</div>
						<Dropdown id="status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
						<Dropdown id="dept"   value={deptFilter}   options={deptOptions}    onChange={setDeptFilter} />
						{hasFilter && (
							<button type="button" onClick={clearAll}
								className="h-10 flex items-center gap-1.5 px-3 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50">
								<X className="w-3.5 h-3.5" /> ล้างตัวกรอง
							</button>
						)}
						<div className="ml-auto flex items-center gap-2">
							<button type="button" title="Export XLSX" onClick={handleExportXlsx}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-green-50 transition-all shadow-sm">
								<XlsxIcon />
							</button>
							<button type="button" title="Export PDF" onClick={handleExportPdf}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm">
								<PdfIcon />
							</button>
						</div>
					</div>

					{/* Row count strip */}
					<div className="flex items-center gap-4 px-5 py-2.5 bg-white border-b border-slate-100">
						<span className="text-xs text-slate-500">
							พบ <span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span> รายการ
							&nbsp;จากทั้งหมด&nbsp;
							<span className="font-semibold text-slate-700">{rows.length.toLocaleString()}</span>
						</span>
					</div>

					{/* Table */}
					<div className="relative w-full overflow-x-auto">
						{isFetching && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full text-sm text-left min-w-[900px]">
							<colgroup>
								<col className="w-[48px]" />
								<col className="w-[140px]" />
								<col className="w-[200px]" />
								<col className="w-[140px]" />
								<col className="w-[170px]" />
								<col className="w-[120px]" />
								<col className="w-[110px]" />
								<col className="w-[115px]" />
								<col className="w-[80px]" />
							</colgroup>
							<thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
								<tr>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">รหัสครุภัณฑ์</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">ชื่อครุภัณฑ์</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หมวดหมู่</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">แผนก</th>
									<th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">สถานะ</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">วันที่ซื้อ</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">วันหมดประกัน</th>
									<th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">หน่วยย่อย</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{!isFetching && paginated.length === 0 ? (
									<tr><td colSpan={9}>
										<div className="flex flex-col items-center justify-center py-16 gap-2">
											<Inbox className="w-12 h-12 text-slate-200" />
											<p className="text-sm text-slate-400">ไม่พบรายการครุภัณฑ์</p>
										</div>
									</td></tr>
								) : paginated.map((r, idx) => (
									<tr key={r.id} className="bg-white hover:bg-slate-50 transition-colors">
										<td className="px-4 py-3 text-center text-xs text-slate-400 tabular-nums">
											{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
										</td>
										<td className="px-4 py-3 text-sm font-mono text-slate-700">{r.assetCode}</td>
										<td className="px-4 py-3 text-sm text-slate-700 truncate max-w-0" title={r.itemName}>{r.itemName}</td>
										<td className="px-4 py-3 text-sm text-slate-600 truncate max-w-0">{r.category}</td>
										<td className="px-4 py-3 text-sm text-slate-600 truncate max-w-0">{r.department || "ไม่ระบุ"}</td>
										<td className="px-4 py-3">
											<span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_BADGE[r.status] ?? "bg-slate-100 text-slate-500 border-slate-200"}`}>
												{STATUS_LABEL[r.status] ?? r.status}
											</span>
										</td>
										<td className="px-4 py-3 text-center text-sm text-slate-600 tabular-nums whitespace-nowrap">{fmtDate(r.purchaseDate)}</td>
										<td className="px-4 py-3 text-center text-sm text-slate-600 tabular-nums whitespace-nowrap">{fmtDate(r.warrantyExpire)}</td>
										<td className="px-4 py-3 text-center text-sm font-semibold text-slate-700 tabular-nums">{r.unitCount}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-xs text-slate-500">
							แสดง <span className="font-semibold text-slate-700">{paginated.length}</span> จาก{" "}
							<span className="font-semibold text-slate-700">{filtered.length.toLocaleString()}</span> รายการ
						</p>
						{totalPages > 1 && (
							<div className="flex items-center gap-2">
								<button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
									<ChevronLeft className="w-4 h-4" />
								</button>
								<span className="text-xs font-medium px-2 text-slate-600">หน้า {currentPage} / {totalPages}</span>
								<button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}
									className="p-1.5 border border-slate-200 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50">
									<ChevronRight className="w-4 h-4" />
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="border-t border-slate-200 bg-white px-8 py-3">
				<p className="text-xs text-slate-400 text-center">HPK Warehouse Management System &nbsp;·&nbsp; รายงานครุภัณฑ์</p>
			</div>
		</div>
	);
};

export default AssetReportClient;
