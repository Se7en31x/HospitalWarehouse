"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  FileText, Package, Clock, CheckCircle, AlertCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import * as reusableSvc from "@/services/reusableUnitService";
import { fmtDateTime } from "@/utils/dateUtils";

// ─── Status Badge ─────────────────────────────────────────────────────────────

const getStatusBadgeColor = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-900 border-amber-200",
    APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
    REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    PENDING_RETURN_CHECK: "bg-sky-100 text-sky-800 border-sky-200",
  };
  return map[status] || "bg-slate-100 text-slate-800 border-slate-200";
};
// 
const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    PENDING: "รออนุมัติ",
    APPROVED: "อนุมัติแล้ว",
    REJECTED: "ถูกปฏิเสธ",
    COMPLETED: "เสร็จสิ้น",
    PENDING_RETURN_CHECK: "รอตรวจรับคืน",
  };
  return map[status] || status;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "PENDING": return <Clock className="w-3 h-3" />;
    case "APPROVED": return <CheckCircle className="w-3 h-3" />;
    case "REJECTED": return <AlertCircle className="w-3 h-3" />;
    case "COMPLETED": return <CheckCircle className="w-3 h-3" />;
    case "PENDING_RETURN_CHECK": return <Loader2 className="w-3 h-3 animate-spin" />;
    default: return <Clock className="w-3 h-3" />;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReturnItemDetailClient() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [detail, setDetail] = useState<reusableSvc.ReusableReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    reusableSvc.getReusableReturnRequestById(Number(id))
      .then(setDetail)
      .catch(() => toast.error("โหลดรายละเอียดไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, [id]);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!id || !detail) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        ไม่พบข้อมูล
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">รายละเอียดคำขอคืน</h2>
        <button
          onClick={() => router.push("/request/return-requests")}
          className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
        >
          ย้อนกลับ
        </button>
      </div>

      <div className="space-y-6 flex-1">
        {/* Document Info */}
        <section className="rounded-lg bg-white border border-slate-300 p-6">
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold">ข้อมูลคำขอคืน</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <p className="text-xs text-slate-500">เลขที่คำขอ</p>
              <p className="font-mono text-base font-semibold text-slate-800">{detail.doc_no}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">แผนก</p>
              <p className="text-base font-medium text-slate-800">{detail.department_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">สถานะ</p>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold items-center gap-1 ${getStatusBadgeColor(detail.status)}`}>
                {getStatusIcon(detail.status)}
                {getStatusLabel(detail.status)}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">วันที่สร้าง</p>
              <p className="text-base text-slate-800">{fmtDateTime(detail.created_at)}</p>
            </div>
            {detail.preferred_pickup_at && (
              <div>
                <p className="text-xs text-slate-500">วันเวลานัดรับของ</p>
                <p className="text-base text-slate-800">{fmtDateTime(detail.preferred_pickup_at)}</p>
              </div>
            )}
          </div>

          {detail.note && (
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-1">หมายเหตุ</p>
              <p className="text-base text-slate-800">{detail.note}</p>
            </div>
          )}
        </section>

        {/* Items Table */}
        <section className="rounded-lg bg-white border border-slate-300 p-6 overflow-hidden flex flex-col" style={{ height: "350px" }}>
          <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
            <Package className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">รายการย่อย ({detail.items?.length || 0} รายการ)</h2>
          </div>

          <div className="flex-1 border border-slate-200 rounded-lg overflow-auto">
            <table className="w-full text-base text-left table-fixed">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10 tracking-wide text-sm">
                <tr>
                  <th className="px-6 py-5 w-[48px] text-center">#</th>
                  <th className="px-6 py-5 w-[100px]">รหัส</th>
                  <th className="px-6 py-5 min-w-[200px]">ชื่อรายการ</th>
                  <th className="px-6 py-5 w-[140px]">หมวดหมู่</th>
                  <th className="px-6 py-5 w-[100px] text-center">จำนวน</th>
                  <th className="px-6 py-5 min-w-[160px]">Unit Codes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {detail.items.map((item, idx) => (
                  <tr key={item.item_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5 text-center text-slate-500 font-medium text-sm">{idx + 1}</td>
                    <td className="px-6 py-5 font-mono text-xs text-slate-700">{item.item_code || "-"}</td>
                    <td className="px-6 py-5">
                      <p className="text-slate-800 text-sm">{item.item_name || "-"}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-600">{item.category_name || "-"}</td>
                    <td className="px-6 py-5 text-center font-medium text-indigo-600 text-base">{item.requested_qty}</td>
                    <td className="px-6 py-5 font-mono text-xs text-slate-600">{item.requested_unit_codes?.join(", ") || "-"}</td>
                  </tr>
                ))}
                {(!detail.items || detail.items.length === 0) && (
                  <tr>
                    <td colSpan={6}>
                      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                        <Package className="w-16 h-16 text-slate-300" />
                        <p className="text-base font-medium">ไม่พบรายการ</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
