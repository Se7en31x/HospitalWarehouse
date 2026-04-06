import React from "react";
import { X, Package, FileText, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import type { RequisitionHeader, RequisitionItem, BorrowerDetails } from "@/types/requisition_type";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};

const fmtTime = (d?: string | null) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
};

const TYPE_LABEL: Record<string, string> = {
  WITHDRAW: "เบิก",
  BORROW: "ยืม",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "รออนุมัติ",
  COMPLETED: "อนุมัติแล้ว",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ปฏิเสธ",
  CANCELLED: "ยกเลิก",
  DRAFT: "ร่าง",
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return "bg-green-100 text-green-800 border-green-200";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "REJECTED":
      return "bg-red-100 text-red-800 border-red-200";
    case "CANCELLED":
      return "bg-gray-100 text-gray-600 border-gray-200";
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "COMPLETED":
    case "APPROVED":
      return <CheckCircle className="w-3 h-3" />;
    case "PENDING":
      return <Clock className="w-3 h-3" />;
    case "REJECTED":
      return <XCircle className="w-3 h-3" />;
    case "CANCELLED":
      return <X className="w-3 h-3" />;
    default:
      return <AlertCircle className="w-3 h-3" />;
  }
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusStyle(status)}`}>
    <StatusIcon status={status} />
    {STATUS_LABEL[status] ?? status}
  </span>
);

const TypeBadge = ({ type }: { type: string }) => {
  const isWithdraw = type === "WITHDRAW";
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${isWithdraw ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
      {TYPE_LABEL[type] ?? type}
    </span>
  );
};

// ─── Detail Modal ─────────────────────────────────────────────────────────────

export function DetailModal({
  record,
  onClose,
}: {
  record: RequisitionHeader;
  onClose: () => void;
}) {
  const isExternal = !!record.borrower_details;
  const borrower = record.borrower_details as BorrowerDetails | null | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-300 flex-shrink-0 bg-white">
          <h1 className="text-2xl font-bold text-slate-800">รายละเอียดการทำรายการ</h1>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
          {/* ข้อมูลการทำรายการ */}
          <section className="rounded-lg bg-white border border-slate-300 p-6">
            <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">ข้อมูลการทำรายการ</h2>
            </div>
            <div className={`grid grid-cols-1 gap-4 ${record.type === "BORROW" ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
              <div>
                <p className="text-xs text-slate-500">เลขที่เอกสาร</p>
                <p className="text-base font-semibold text-slate-800">{record.doc_no}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">ประเภท</p>
                <p className="text-sm">{TYPE_LABEL[record.type] ?? record.type}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">สถานะ</p>
                <StatusBadge status={record.status} />
              </div>
              <div>
                <p className="text-xs text-slate-500">วันที่ทำรายการ</p>
                <p className="text-base text-slate-800">{fmtDate(record.request_date)}</p>
              </div>
              {record.type === "BORROW" && (
                <div>
                  <p className="text-xs text-slate-500">ผู้ทำรายการ</p>
                  <p className="text-base text-slate-800">{record.requester ?? "-"}</p>
                </div>
              )}
            </div>
          </section>

          {/* ข้อมูลผู้ยืม or ข้อมูลผู้ทำรายการ */}
          {isExternal && borrower ? (
            <section className="rounded-lg bg-white border border-slate-300 p-6">
              <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h2 className="text-lg font-semibold">ข้อมูลผู้ยืม</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">ชื่อผู้ยืม</p>
                  <p className="text-base text-slate-800">{borrower.fullname ?? "-"}</p>
                </div>
                {borrower.phone && (
                  <div>
                    <p className="text-xs text-slate-500">เบอร์โทร</p>
                    <p className="text-base text-slate-800">{borrower.phone}</p>
                  </div>
                )}
                {borrower.address && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500 mb-2">ที่อยู่</p>
                    <p className="text-base text-slate-800 mb-4">{borrower.address}</p>
                    {(borrower.subdistrict || borrower.district || borrower.province || borrower.zipcode) && (
                      <div className="grid grid-cols-4 gap-3">
                        {borrower.subdistrict && (
                          <div>
                            <p className="text-xs text-slate-500">ตำบล</p>
                            <p className="text-base text-slate-800">{borrower.subdistrict}</p>
                          </div>
                        )}
                        {borrower.district && (
                          <div>
                            <p className="text-xs text-slate-500">อำเภอ</p>
                            <p className="text-base text-slate-800">{borrower.district}</p>
                          </div>
                        )}
                        {borrower.province && (
                          <div>
                            <p className="text-xs text-slate-500">จังหวัด</p>
                            <p className="text-base text-slate-800">{borrower.province}</p>
                          </div>
                        )}
                        {borrower.zipcode && (
                          <div>
                            <p className="text-xs text-slate-500">รหัสไปรษณีย์</p>
                            <p className="text-base text-slate-800">{borrower.zipcode}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-lg bg-white border border-slate-300 p-6">
              <div className="mb-6 flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-4">
                <FileText className="h-5 w-5 text-slate-600" />
                <h2 className="text-lg font-semibold">ข้อมูลผู้ทำรายการ</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">ผู้ทำรายการ</p>
                  <p className="text-base text-slate-800">{record.requester ?? "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">แผนก</p>
                  <p className="text-base text-slate-800">{record.department_name ?? `แผนก ${record.department_id}`}</p>
                </div>
              </div>
            </section>
          )}

          {/* Note */}
          {record.note && (
            <section className="rounded-lg bg-white border border-slate-300 p-6">
              <div className="mb-4 flex items-center gap-2 text-slate-800">
                <FileText className="h-5 w-5 text-amber-600" />
                <h2 className="text-lg font-semibold">หมายเหตุ</h2>
              </div>
              <p className="text-base text-slate-700">{record.note}</p>
            </section>
          )}

          {/* Items Table */}
          <section className="rounded-lg bg-white border border-slate-300 overflow-hidden flex flex-col" style={{ height: "250px" }}>
            <div className="border-b border-slate-300 px-6 py-5 bg-white">
              <h2 className="text-lg font-semibold text-slate-800">รายการสินค้า ({record.items?.length ?? 0} รายการ)</h2>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full" style={{ fontSize: "0.875rem" }}>
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-300">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 text-xs uppercase">สินค้า</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 text-xs uppercase">ขอ</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 text-xs uppercase">อนุมัติ</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700 text-xs uppercase">จ่าย</th>
                    {record.type === "BORROW" && (
                      <th className="px-4 py-3 text-center font-semibold text-slate-700 text-xs uppercase">คืน</th>
                    )}
                    <th className="px-4 py-3 text-left font-semibold text-slate-700 text-xs uppercase">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(record.items ?? []).map((item: RequisitionItem) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{item.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-slate-700">{item.qty}</td>
                      <td className="px-4 py-3 text-center text-indigo-700 font-medium">{item.approved}</td>
                      <td className="px-4 py-3 text-center text-blue-700 font-medium">{item.issued}</td>
                      {record.type === "BORROW" && (
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${item.returned >= item.issued && item.issued > 0 ? "text-green-600" : "text-slate-500"}`}>
                            {item.returned}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 text-slate-600">{item.note ?? "-"}</td>
                    </tr>
                  ))}
                  {!record.items?.length && (
                    <tr>
                      <td colSpan={record.type === "BORROW" ? 6 : 5} className="px-4 py-8 text-center text-slate-500 text-sm">ไม่มีรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-300 p-6 bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
