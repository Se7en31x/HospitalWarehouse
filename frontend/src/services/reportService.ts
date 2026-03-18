/**
 * Report Service - Hospital Warehouse System
 * Handles all report-related API calls
 */

import Cookies from "js-cookie";
import * as ReportTypes from "@/types/reports_type";

// Type exports for external use
export type Report = ReportTypes.Report;
export type ReportType = ReportTypes.ReportType;
export type ReportStatus = ReportTypes.ReportStatus;
export type ReportFilterParams = ReportTypes.ReportFilterParams;
export type ReportResponse = ReportTypes.ReportResponse;
export type ReportSummary = ReportTypes.ReportSummary;
export type StockInReport = ReportTypes.StockInReport;
export type StockOutReport = ReportTypes.StockOutReport;
export type AdjustmentReport = ReportTypes.AdjustmentReport;
export type RequisitionReport = ReportTypes.RequisitionReport;
export type ReturnReport = ReportTypes.ReturnReport;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Get authorization headers with Bearer token
 */
const getHeaders = () => ({
	"Content-Type": "application/json",
	Authorization: `Bearer ${Cookies.get("user_token") || ""}`,
});

/**
 * Generic JSON parser
 */
async function parseJson<T>(res: Response): Promise<T> {
	const contentType = res.headers.get("content-type") || "";
	if (!contentType.includes("application/json")) {
		const raw = await res.text();
		throw new Error(raw.slice(0, 120) || "Invalid response");
	}
	return (await res.json()) as T;
}

/**
 * Generic request handler
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
	if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");

	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			...getHeaders(),
			...(options?.headers || {}),
		},
		cache: "no-store",
	});

	const body = await parseJson<{ data: T; message?: string; error?: string }>(res);
	if (!res.ok) {
		throw new Error(body.error || body.message || "Request failed");
	}

	return body.data;
}

/**
 * Get all requisitions (for requisition reports)
 * @param params - Filter parameters
 * @returns Array of requisition reports
 */
export async function getRequisitionReports(
	params?: ReportTypes.ReportQueryParams
): Promise<ReportTypes.RequisitionReport[]> {
	try {
		const queryString = new URLSearchParams();
		if (params?.type) queryString.append("type", params.type);
		if (params?.status) queryString.append("status", params.status);
		if (params?.dateFrom) queryString.append("dateFrom", params.dateFrom);
		if (params?.dateTo) queryString.append("dateTo", params.dateTo);
		if (params?.search) queryString.append("search", params.search);
		if (params?.department_name) queryString.append("department_name", params.department_name);

		const data = await request<any[]>(`/v1/requisition?${queryString.toString()}`);

		return (data || []).map((req) => ({
			id: String(req.id),
			reportNo: req.doc_no || "-",
			type: "requisition" as const,
			date: req.request_date?.split("T")[0] || new Date().toISOString().split("T")[0],
			requester: req.requester?.name || "Unknown",
			department: req.department_name || "-",
			totalItems: req.requisition_item?.length || 0,
			totalValue: calculateReqTotal(req.requisition_item || []),
			status: req.status?.toUpperCase() as ReportTypes.ReportStatus,
			items: (req.requisition_item || []).map((item: any) => ({
				id: String(item.id),
				itemId: item.item_id || "",
				itemCode: item.items?.code || "-",
				itemName: item.items?.name || "-",
				category: item.items?.categories?.name || "-",
				quantity: item.req_qty || 0,
				unit: item.items?.unit?.name || "-",
				unitPrice: item.items?.sell_price ? Number(item.items.sell_price) : 0,
				totalPrice:
					(item.req_qty || 0) * (item.items?.sell_price ? Number(item.items.sell_price) : 0),
				warehouse: item.items?.warehouses?.name || "-",
			})),
			approver: req.approver?.name || undefined,
			dueDate: req.due_date?.split("T")[0],
			returnDate: req.return_date?.split("T")[0],
			notes: req.note,
			createdAt: req.created_at,
		}));
	} catch (error) {
		console.error("Error fetching requisition reports:", error);
		return [];
	}
}

/**
 * Get stock movement reports (stock in, out, adjustments)
 * @param params - Filter parameters
 * @returns Array of stock movement reports
 */
export async function getStockMovementReports(
	params?: ReportTypes.ReportQueryParams
): Promise<(ReportTypes.StockInReport | ReportTypes.StockOutReport | ReportTypes.AdjustmentReport)[]> {
	try {
		const queryString = new URLSearchParams();
		if (params?.type) queryString.append("type", params.type);
		if (params?.dateFrom) queryString.append("dateFrom", params.dateFrom);
		if (params?.dateTo) queryString.append("dateTo", params.dateTo);
		if (params?.warehouse_id) queryString.append("warehouse_id", params.warehouse_id);

		// For now, this will return empty array until backend API is ready
		// You can integrate with /v1/lots endpoint when stock movement tracking is implemented
		const data: any[] = [];

		return data.map((movement): StockInReport | StockOutReport | AdjustmentReport => {
			const baseReport = {
				id: String(movement.id),
				reportNo: movement.code || "-",
				type: movement.type?.toLowerCase() as "stockin" | "stockout" | "adjustment",
				date: movement.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
				warehouse: movement.warehouse?.name || "-",
				status: "COMPLETED" as const,
				totalItems: 1,
				totalValue: 0,
				items: [],
			};

			// Return as AdjustmentReport since that has extra required fields
			if (baseReport.type === "adjustment") {
				return {
					...baseReport,
					type: "adjustment",
					adjustedBy: movement.created_by || "-",
				} as AdjustmentReport;
			}

			return baseReport as any;
		});
	} catch (error) {
		console.error("Error fetching stock movement reports:", error);
		return [];
	}
}

/**
 * Get return reports
 * @param params - Filter parameters
 * @returns Array of return reports
 */
export async function getReturnReports(
	params?: ReportTypes.ReportQueryParams
): Promise<ReportTypes.ReturnReport[]> {
	try {
		// This will be populated when returns tracking API is ready
		const data: ReportTypes.ReturnReport[] = [];
		return data;
	} catch (error) {
		console.error("Error fetching return reports:", error);
		return [];
	}
}

/**
 * Get all reports combined
 * @param filters - Filter parameters
 * @returns Combined report response
 */
export async function getAllReports(
	filters?: ReportTypes.ReportFilterParams
): Promise<ReportTypes.Report[]> {
	try {
		let reports: ReportTypes.Report[] = [];

		// Fetch requisition reports
		if (!filters?.type || filters.type === "requisition") {
			const reqReports = await getRequisitionReports({
				type: filters?.type,
				status: filters?.status,
				dateFrom: filters?.startDate,
				dateTo: filters?.endDate,
				search: filters?.searchTerm,
				department_name: filters?.department,
			});
			reports = [...reports, ...reqReports];
		}

		// Fetch stock movement reports
		if (!filters?.type || ["stockin", "stockout", "adjustment"].includes(filters.type)) {
			const stockReports = await getStockMovementReports({
				type: filters?.type,
				dateFrom: filters?.startDate,
				dateTo: filters?.endDate,
				warehouse_id: filters?.warehouse,
			});
			reports = [...reports, ...stockReports];
		}

		// Fetch return reports
		if (!filters?.type || filters.type === "return") {
			const returnReports = await getReturnReports({
				dateFrom: filters?.startDate,
				dateTo: filters?.endDate,
			});
			reports = [...reports, ...returnReports];
		}

		// Sort by date (descending)
		reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		// Filter by search term if provided
		if (filters?.searchTerm) {
			const search = filters.searchTerm.toLowerCase();
			reports = reports.filter(
				(r) =>
					r.reportNo.toLowerCase().includes(search) ||
					("requester" in r && r.requester?.toLowerCase().includes(search)) ||
					("department" in r && r.department?.toLowerCase().includes(search))
			);
		}

		return reports;
	} catch (error) {
		console.error("Error fetching all reports:", error);
		return [];
	}
}

/**
 * Get report summary statistics
 * @param reports - Array of reports
 * @returns Summary statistics for each report type
 */
export function getReportSummary(reports: ReportTypes.Report[]): ReportTypes.ReportSummary[] {
	const summary: Record<ReportTypes.ReportType, ReportTypes.ReportSummary> = {
		stockin: {
			type: "stockin",
			label: "การนำเข้า",
			count: 0,
			totalValue: 0,
			totalItems: 0,
			color: "text-blue-600",
			bgColor: "bg-blue-100",
			icon: "📥",
		},
		stockout: {
			type: "stockout",
			label: "การนำออก",
			count: 0,
			totalValue: 0,
			totalItems: 0,
			color: "text-rose-600",
			bgColor: "bg-rose-100",
			icon: "📤",
		},
		requisition: {
			type: "requisition",
			label: "คำขอ/ยืม",
			count: 0,
			totalValue: 0,
			totalItems: 0,
			color: "text-indigo-600",
			bgColor: "bg-indigo-100",
			icon: "📋",
		},
		adjustment: {
			type: "adjustment",
			label: "ปรับปรุง",
			count: 0,
			totalValue: 0,
			totalItems: 0,
			color: "text-amber-600",
			bgColor: "bg-amber-100",
			icon: "⚙️",
		},
		return: {
			type: "return",
			label: "คืนสินค้า",
			count: 0,
			totalValue: 0,
			totalItems: 0,
			color: "text-green-600",
			bgColor: "bg-green-100",
			icon: "↩️",
		},
	};

	reports.forEach((report) => {
		if (summary[report.type]) {
			summary[report.type].count += 1;
			summary[report.type].totalValue += report.totalValue || 0;
			summary[report.type].totalItems += report.totalItems || 0;
		}
	});

	return Object.values(summary);
}

/**
 * Helper function to calculate requisition total
 */
function calculateReqTotal(items: any[]): number {
	return items.reduce((sum, item) => {
		const price = item.items?.sell_price ? Number(item.items.sell_price) : 0;
		return sum + (item.req_qty || 0) * price;
	}, 0);
}

/**
 * Export report to PDF (placeholder)
 * @param reports - Reports to export
 * @param format - Export format
 */
export async function exportReports(
	reports: ReportTypes.Report[],
	format: "pdf" | "excel"
): Promise<void> {
	try {
		// Implementation depends on backend support
		console.log(`Exporting ${reports.length} reports as ${format}`);
		// TODO: Implement actual export logic
	} catch (error) {
		console.error("Error exporting reports:", error);
		throw error;
	}
}
