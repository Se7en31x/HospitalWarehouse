"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FlaskConical, Search, X } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate, formatReportPeriod } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";
import { downloadCsv } from "@/utils/downloadCsv";
import { SweetAlertUtils } from "@/utils/sweetAlert";
import { OutlinedDateField } from "../../_components/OutlinedDateField";
import { ReportDetailPageHeader } from "../../_components/ReportDetailPageHeader";

const PdfIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#e53935"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">PDF</text>
	</svg>
);

const CsvIcon = () => (
	<svg viewBox="0 0 56 64" width="32" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path d="M6 0 H38 L50 12 V60 Q50 64 46 64 H6 Q2 64 2 60 V4 Q2 0 6 0Z" fill="#e8eaed"/>
		<path d="M38 0 L50 12 H42 Q38 12 38 8 Z" fill="#c5c9d0"/>
		<rect x="4" y="36" width="48" height="20" rx="4" fill="#0ea5e9"/>
		<text x="28" y="50" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold" fontFamily="Arial,sans-serif" letterSpacing="0.5">CSV</text>
	</svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExpiredLot {
	id: string;
	lotCode: string;
	itemCode: string;
	itemName: string;
	warehouse: string;
	quantity: number;
	unit: string;
	expiredAt: string | null;
}

interface ApiResponse {
	items: ExpiredLot[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

interface Props {
	onBack?: () => void;
}

const ITEMS_PER_PAGE = 10;

function daysExpired(dateStr: string | null): number {
	if (!dateStr) return 0;
	const diff = Date.now() - new Date(dateStr).getTime();
	return Math.max(0, Math.ceil(diff / 86400000));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExpiredLotsReportClient({ onBack }: Props) {
	const { profile } = useUser();

	const [rows, setRows]             = useState<ExpiredLot[]>([]);
	const [total, setTotal]           = useState(0);
	const [page, setPage]             = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading]       = useState(false);
	const [search, setSearch]         = useState("");
	const [dateFrom, setDateFrom]     = useState("");
	const [dateTo, setDateTo]         = useState("");

	const buildParams = useCallback((p: number, overrideLimit?: number) => {
		const params = new URLSearchParams({
			page: String(p),
			limit: String(overrideLimit ?? ITEMS_PER_PAGE),
		});
		if (search)   params.set("search",   search);
		if (dateFrom) params.set("dateFrom", dateFrom);
		if (dateTo)   params.set("dateTo",   dateTo);
		return params;
	}, [search, dateFrom, dateTo]);

	const fetchData = useCallback(async (p: number) => {
		setLoading(true);
		try {
			const res = await apiClient.get<ApiResponse>(`/v1/reports/expired-lots?${buildParams(p)}`);
			setRows(res.data?.items ?? []);
			setTotal(res.data?.total ?? 0);
			setTotalPages(Math.max(1, res.data?.totalPages ?? 1));
		} catch {
			SweetAlertUtils.error("เกิดข้อผิดพลาดในการโหลดข้อมูลล็อตหมดอายุ");
			setRows([]);
			setTotal(0);
			setTotalPages(1);
		} finally {
			setLoading(false);
		}
	}, [buildParams]);

	useEffect(() => {
		setPage(1);
		void fetchData(1);
	}, [search, dateFrom, dateTo, fetchData]);

	const hasFilter = !!(search.trim() || dateFrom || dateTo);

	const fetchAllForExport = useCallback(async (): Promise<ExpiredLot[]> => {
		try {
			const res = await apiClient.get<ApiResponse>(`/v1/reports/expired-lots?${buildParams(1, 9999)}`);
			return res.data?.items ?? [];
		} catch {
			return rows;
		}
	}, [buildParams, rows]);

	const handleExportPdf = async () => {
		const columns: PrintColumn[] = [
			{ header: "#",             key: "_no",         align: "center" },
			{ header: "รหัสล็อต",      key: "lotCode",     align: "left" },
			{ header: "รหัสรายการ",    key: "itemCode",    align: "left" },
			{ header: "ชื่อพัสดุ",     key: "itemName",    align: "left" },
			{ header: "คลัง",          key: "warehouse",   align: "left" },
			{ header: "วันหมดอายุ",   key: "expiredAt",   align: "center" },
			{ header: "เกินมา (วัน)", key: "daysExpired", align: "center" },
			{ header: "จำนวน",        key: "quantity",    align: "right" },
			{ header: "หน่วย",        key: "unit",        align: "left" },
		];

		const allForPrint = await fetchAllForExport();

		const buckets = { recent: 0, week: 0, month: 0, longer: 0 };
		for (const r of allForPrint) {
			const d = daysExpired(r.expiredAt);
			if (d <= 7) buckets.recent++;
			else if (d <= 30) buckets.week++;
			else if (d <= 90) buckets.month++;
			else buckets.longer++;
		}

		const filterParts = [
			search.trim() ? `คำค้น: ${search.trim()}` : null,
			`รวม ${allForPrint.length.toLocaleString()} LOT`,
			`เกิน ≤7 วัน: ${buckets.recent.toLocaleString()}`,
			`8–30 วัน: ${buckets.week.toLocaleString()}`,
			`31–90 วัน: ${buckets.month.toLocaleString()}`,
			`>90 วัน: ${buckets.longer.toLocaleString()}`,
		].filter(Boolean);

		const hasDateFilter = Boolean(dateFrom || dateTo);
		const periodLabel = hasDateFilter
			? formatReportPeriod(dateFrom, dateTo, { subjectLabel: "วันหมดอายุ" })
			: formatReportPeriod();

		const pdfRows = allForPrint.map((r, i) => ({
			_no:         String(i + 1),
			lotCode:     r.lotCode,
			itemCode:    r.itemCode,
			itemName:    r.itemName,
			warehouse:   r.warehouse || "-",
			quantity:    r.quantity.toLocaleString(),
			unit:        r.unit,
			expiredAt:   r.expiredAt ? fmtDate(r.expiredAt) : "-",
			daysExpired: String(daysExpired(r.expiredAt)),
		}));

		printWarehouseReport({
			reportTitle: "รายงานล็อตพัสดุหมดอายุ",
			period:      periodLabel,
			filterSummary: filterParts.length ? filterParts.join(" | ") : `ทั้งหมด ${total.toLocaleString()} LOT`,
			columns,
			rows: pdfRows,
			printedBy: {
				title:      profile?.title?.name,
				firstName:  profile?.firstname_th,
				lastName:   profile?.lastname_th,
				department: profile?.departments?.[0]?.name,
			},
		});
	};

	const handleExportCsv = async () => {
		const allRows = await fetchAllForExport();
		downloadCsv({
			headers: ["#", "รหัสล็อต", "รหัสรายการ", "ชื่อพัสดุ", "คลัง", "วันหมดอายุ", "เกินมา (วัน)", "จำนวน", "หน่วย"],
			rows: allRows.map((r, i) => [
				i + 1,
				r.lotCode,
				r.itemCode,
				r.itemName,
				r.warehouse || "-",
				r.expiredAt ? fmtDate(r.expiredAt) : "-",
				daysExpired(r.expiredAt),
				r.quantity,
				r.unit,
			]),
			filename: `รายงานล็อตหมดอายุ_${new Date().toISOString().slice(0, 10)}.csv`,
		});
	};

	return (
		<div className="flex flex-col min-h-screen bg-slate-50">
			<ReportDetailPageHeader
				reportPage="expired-lots"
				title="รายงาน LOT หมดอายุ"
				subtitle={
					<>
						<span>ระบบบริหารคลังสินค้า HPK</span>
						<span className="block text-xs text-slate-500 font-normal mt-1.5 max-w-2xl leading-relaxed">
							แสดงเฉพาะล็อตที่มียอดคงเหลือมากกว่า 0 และวันหมดอายุผ่านมาแล้ว (ก่อน 00:00 น. ของวันนี้ตามเวลาของเซิร์ฟเวอร์ — สอดคล้องกับจำนวนบนหน้าแดชบอร์ด)
							ช่วงวันที่ด้านล่างใช้กรอง «วันหมดอายุ» ของล็อต ไม่ใช่วันที่สร้างรายงาน
						</span>
					</>
				}
				onBack={onBack}
			/>

			<div className="flex-1 px-8 py-6">
				<div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
					<div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
					<div className="relative w-72">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="ค้นหารหัสล็อต / รหัสรายการ / ชื่อพัสดุ..."
							className="w-full h-10 rounded-lg border border-slate-300 py-0 pl-9 pr-4 text-sm leading-none shadow-sm outline-none bg-white focus:ring-2 focus:ring-blue-500 box-border"
						/>
					</div>

					<OutlinedDateField label="หมดอายุตั้งแต่" value={dateFrom} onChange={setDateFrom} />
					<OutlinedDateField label="ถึงวันที่" value={dateTo} onChange={setDateTo} />

						<div className="ml-auto flex items-center gap-2">
							{hasFilter && (
								<button
									type="button"
									onClick={() => {
										setSearch("");
										setDateFrom("");
										setDateTo("");
										setPage(1);
									}}
									className="flex h-10 items-center gap-1.5 px-3 text-sm leading-none text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 hover:text-slate-700 transition-colors shadow-sm box-border bg-white"
								>
									<X className="w-3.5 h-3.5" />
									ล้างตัวกรอง
								</button>
							)}
							<button
								type="button"
								title="Export PDF"
								onClick={() => void handleExportPdf()}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-red-50 transition-all shadow-sm"
							>
								<PdfIcon />
							</button>
							<button
								type="button"
								title="Export CSV (.csv)"
								onClick={() => void handleExportCsv()}
								className="flex items-center p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-sky-50 transition-all shadow-sm"
							>
								<CsvIcon />
							</button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 bg-white border-b border-slate-100 text-sm">
						<span className="text-slate-500">
							พบ <span className="font-semibold text-red-600">{total.toLocaleString()}</span> LOT
						</span>
						{(() => {
							const buckets = { recent: 0, week: 0, month: 0, longer: 0 };
							for (const r of rows) {
								const d = daysExpired(r.expiredAt);
								if (d <= 7) buckets.recent++;
								else if (d <= 30) buckets.week++;
								else if (d <= 90) buckets.month++;
								else buckets.longer++;
							}
							return (
								<>
									<span className="text-slate-300">·</span>
									<span className="text-red-700">เกิน ≤7 วัน <span className="font-semibold">{buckets.recent.toLocaleString()}</span></span>
									<span className="text-orange-700">8–30 วัน <span className="font-semibold">{buckets.week.toLocaleString()}</span></span>
									<span className="text-amber-700">31–90 วัน <span className="font-semibold">{buckets.month.toLocaleString()}</span></span>
									<span className="text-slate-600">{">"}90 วัน <span className="font-semibold">{buckets.longer.toLocaleString()}</span></span>
								</>
							);
						})()}
					</div>

					<div className="relative w-full overflow-x-auto">
						{loading && (
							<div className="absolute inset-0 bg-white/70 z-20 flex items-center justify-center">
								<div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
							</div>
						)}
						<table className="w-full table-fixed text-sm text-left min-w-[1160px]">
							<thead className="bg-slate-50 text-slate-700 text-base font-semibold uppercase shadow-[inset_0_-1px_0_0_#e2e8f0] sticky top-0 z-10">
								<tr>
									<th className="px-4 py-4 w-[48px] text-center whitespace-nowrap">#</th>
									<th className="px-3 py-4 w-[140px] whitespace-nowrap">รหัสล็อต</th>
									<th className="px-3 py-4 w-[120px] whitespace-nowrap">รหัสรายการ</th>
									<th className="px-3 py-4 w-[200px] whitespace-nowrap">ชื่อพัสดุ</th>
									<th className="px-3 py-4 w-[120px] whitespace-nowrap">คลัง</th>
									<th className="px-6 py-4 w-[120px] whitespace-nowrap text-center">วันหมดอายุ</th>
									<th className="px-6 py-4 w-[110px] whitespace-nowrap text-center">เกินมา (วัน)</th>
									<th className="px-6 py-4 w-[100px] whitespace-nowrap text-right">จำนวน</th>
									<th className="px-6 py-4 w-[80px] whitespace-nowrap">หน่วย</th>
								</tr>
							</thead>
							<tbody className="text-slate-600">
								{!loading && rows.length === 0 ? (
									<tr>
										<td colSpan={9}>
											<div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
												<FlaskConical className="w-12 h-12 text-slate-300" />
												<p className="text-sm font-medium">ไม่พบข้อมูลล็อตหมดอายุ</p>
											</div>
										</td>
									</tr>
								) : (
									rows.map((row, idx) => {
										const expired = daysExpired(row.expiredAt);
										return (
											<tr key={row.id} className="bg-white hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
												<td className="px-6 py-3 text-center text-slate-600">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
												<td className="px-3 py-3 truncate font-mono text-xs" title={row.lotCode}>{row.lotCode}</td>
												<td className="px-3 py-3 truncate" title={row.itemCode}>{row.itemCode}</td>
												<td className="px-3 py-3">
													<span className="block truncate min-w-0 font-medium text-slate-900" title={row.itemName}>{row.itemName}</span>
												</td>
												<td className="px-3 py-3 truncate text-slate-600" title={row.warehouse}>{row.warehouse || "-"}</td>
												<td className="px-6 py-3 text-center whitespace-nowrap text-slate-600">{row.expiredAt ? fmtDate(row.expiredAt) : "-"}</td>
												<td className="px-6 py-3 text-center">
													<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
														{expired} วัน
													</span>
												</td>
												<td className="px-6 py-3 text-right font-bold text-slate-800">{row.quantity}</td>
												<td className="px-6 py-3 truncate max-w-0" title={row.unit}>{row.unit}</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>

					<div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
						<p className="text-sm text-slate-500">
							แสดง {rows.length.toLocaleString()} จาก {total.toLocaleString()} รายการ
						</p>
						<div className="flex items-center gap-2">
							<button
								type="button"
								disabled={page <= 1 || loading}
								onClick={() => { const p = page - 1; setPage(p); void fetchData(p); }}
								className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<span className="text-sm font-medium px-2 text-slate-600">
								หน้า {page} / {totalPages}
							</span>
							<button
								type="button"
								disabled={page >= totalPages || loading}
								onClick={() => { const p = page + 1; setPage(p); void fetchData(p); }}
								className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-30 bg-white hover:bg-slate-50"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
