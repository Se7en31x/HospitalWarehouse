/**
 * Report Service - Hospital Warehouse System
 * Handles all report-related API calls with clean error handling
 */

import Cookies from "js-cookie";
import * as ReportTypes from "@/types/reports_type";

// --- Types & Constants ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// --- Helper Functions ---

/**
 * ดึง Header สำหรับ Request (รองรับทั้งช่วงเทส และช่วงใช้งานจริง)
 */
const getHeaders = () => {
    const token = Cookies.get("user_token");
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
};

/**
 * ตรวจสอบและแปลง Response เป็น JSON อย่างปลอดภัย
 */
async function parseJson<T>(res: Response): Promise<T> {
    const contentType = res.headers.get("content-type") || "";
    
    // ถ้าไม่ใช่ JSON (เช่น ได้ HTML 404/500 กลับมา) ให้โยน Error พร้อมข้อความจากหน้าเว็บ
    if (!contentType.includes("application/json")) {
        const raw = await res.text();
        const errorSnippet = raw.slice(0, 100).replace(/<[^>]*>?/gm, ''); // ตัด tag HTML ออก
        throw new Error(`Server Error: ${errorSnippet || "Invalid response format"}`);
    }
    
    return (await res.json()) as T;
}

/**
 * ฟังก์ชันกลางสำหรับยิง API
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
    if (!API_URL) throw new Error("NEXT_PUBLIC_API_URL is not configured");

    // จัดการเรื่อง slash ให้ถูกต้อง (ป้องกัน // ใน URL)
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    const res = await fetch(`${baseUrl}${cleanPath}`, {
        ...options,
        headers: {
            ...getHeaders(),
            ...(options?.headers || {}),
        },
        cache: "no-store",
    });

    // แกะก้อนข้อมูล { success, data, message }
    const result = await parseJson<{ success: boolean; data: T; message?: string; error?: string }>(res);
    
    if (!res.ok || result.success === false) {
        throw new Error(result.error || result.message || `Request failed with status ${res.status}`);
    }

    return result.data;
}

// --- Main Service Functions ---

/**
 * ดึงรายงานการเบิกพัสดุ (Requisition Reports)
 */
export async function getRequisitionReports(
    params?: ReportTypes.ReportQueryParams
): Promise<ReportTypes.RequisitionReport[]> {
    try {
        const query = new URLSearchParams();
        if (params?.type) query.append("type", params.type);
        if (params?.status) query.append("status", params.status);
        if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
        if (params?.dateTo) query.append("dateTo", params.dateTo);
        if (params?.search) query.append("search", params.search);
        if (params?.department_name) query.append("department_name", params.department_name);

        // ✅ แก้ไขเป็น /v1/requisitions (พหูพจน์) ตาม Route ของ Backend
        const data = await request<any[]>(`/v1/requisitions?${query.toString()}`);

        return (data || []).map((req) => ({
            id: String(req.id),
            reportNo: req.doc_no || "-",
            type: "requisition" as const,
            date: req.created_at?.split("T")[0] || new Date().toISOString().split("T")[0],
            requester: req.requester?.display_name || "Tester Mode",
            department: req.department_name || "-",
            totalItems: req.requisition_item?.length || 0,
            totalValue: calculateReqTotal(req.requisition_item || []),
            status: (req.status || "PENDING").toUpperCase() as ReportTypes.ReportStatus,
            items: (req.requisition_item || []).map((item: any) => ({
                id: String(item.id),
                itemId: item.item_id || "",
                itemCode: item.items?.code || "-",
                itemName: item.items?.name || "-",
                category: item.items?.category || "-",
                quantity: item.req_qty || 0,
                unit: item.items?.unit || "-",
                unitPrice: Number(item.items?.price || 0),
                totalPrice: (item.req_qty || 0) * Number(item.items?.price || 0),
                warehouse: item.items?.location || "-",
            })),
            notes: req.note,
            createdAt: req.created_at,
        }));
    } catch (error) {
        console.error("🚫 Error fetching requisition reports:", error);
        return [];
    }
}

/**
 * สรุปสถิติสำหรับ Dashboard
 */
export function getReportSummary(reports: ReportTypes.Report[]): ReportTypes.ReportSummary[] {
    const summaryMap: Record<string, ReportTypes.ReportSummary> = {
        requisition: {
            type: "requisition",
            label: "รายการเบิก/ยืม",
            count: 0,
            totalValue: 0,
            totalItems: 0,
            color: "text-indigo-600",
            bgColor: "bg-indigo-100",
            icon: "📋",
        },
        // เพิ่มประเภทอื่นๆ ได้ที่นี่
    };

    reports.forEach((report) => {
        if (summaryMap[report.type]) {
            summaryMap[report.type].count += 1;
            summaryMap[report.type].totalValue += report.totalValue || 0;
            summaryMap[report.type].totalItems += report.totalItems || 0;
        }
    });

    return Object.values(summaryMap);
}

// --- Internal Helpers ---

function calculateReqTotal(items: any[]): number {
    return items.reduce((sum, item) => {
        const price = Number(item.items?.price || 0);
        return sum + (item.req_qty || 0) * price;
    }, 0);
}

/**
 * ดึงรายงานทั้งหมดแบบรวมศูนย์
 */
export async function getAllReports(filters?: ReportTypes.ReportFilterParams): Promise<ReportTypes.Report[]> {
    try {
        // ดึงเฉพาะ Requisition ก่อนในเวอร์ชันนี้
        const reports = await getRequisitionReports({
            type: filters?.type,
            status: filters?.status,
            dateFrom: filters?.startDate,
            dateTo: filters?.endDate,
            search: filters?.searchTerm,
            department_name: filters?.department,
        });

        // เรียงลำดับตามวันที่ล่าสุด
        return reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
        console.error("🚫 Error in getAllReports:", error);
        return [];
    }
}