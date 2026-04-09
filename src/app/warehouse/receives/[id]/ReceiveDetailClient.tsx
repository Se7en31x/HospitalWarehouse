"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import * as receiveService from "@/services/receiveService";
import type { ReceiveHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";

const MySwal = withReactContent(Swal);
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ReceiveType, string> = {
  PURCHASE: "จัดซื้อ",
  DONATION: "บริจาค",
  PURCHASE_ASSET: "ครุภัณฑ์",
  REUSABLE_UNIT: "ของใช้ซ้ำรายชิ้น",
};

const STATUS_LABEL: Record<ReceiveStatus, string> = {
  PENDING: "รอดำเนินการ",
  COMPLETED: "เสร็จสมบูรณ์",
  CANCELLED: "ยกเลิก",
};

const STATUS_COLOR: Record<ReceiveStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-red-100 text-red-700",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReceiveDetailClientProps {
  receiveId: string | number;
}

export default function ReceiveDetailClient({ receiveId }: ReceiveDetailClientProps) {
  const router = useRouter();

  const [record, setRecord] = useState<ReceiveHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Parse ID robustly
  const parsedId = useMemo(() => {
    if (typeof receiveId === "number" && Number.isFinite(receiveId)) return receiveId;
    if (typeof receiveId === "string" && receiveId.trim() !== "") {
      const n = Number(receiveId);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }, [receiveId]);

  useEffect(() => {
    if (!parsedId) {
      MySwal.fire({
        title: "ข้อผิดพลาด",
        text: "รหัสเอกสารไม่ถูกต้อง",
        icon: "error",
      }).then(() => router.back());
      return;
    }

    const loadData = async () => {
      try {
        const data = await receiveService.getReceiveById(parsedId);
        setRecord(data);
      } catch (err) {
        MySwal.fire({
          title: "ข้อผิดพลาด",
          text: getErrorMessage(err),
          icon: "error",
        }).then(() => router.back());
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [parsedId, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!record) {
    return null;
  }

  return <DetailContent record={record} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} />;
}

// ─── Detail Content ──────────────────────────────────────────────────────────

interface DetailContentProps {
  record: ReceiveHeader;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}

function DetailContent({ record, isSubmitting, setIsSubmitting }: DetailContentProps) {
  const router = useRouter();

  const [inputData, setInputData] = useState<Record<number, { qty: number; lot_code: string; expired_at: string }>>(() => {
    const initial: Record<number, { qty: number; lot_code: string; expired_at: string }> = {};
    if (record.status === "PENDING" && record.receive_item) {
      record.receive_item.forEach(item => {
        initial[item.id] = {
          qty: item.qty ?? item.expected_qty ?? 0,
          lot_code: item.lot_code || "",
          expired_at: item.expired_at ? item.expired_at.split("T")[0] : "",
        };
      });
    }
    return initial;
  });

  const handleCancel = async () => {
    if (record.status !== "PENDING") return;

    const { value: reason, isConfirmed } = await MySwal.fire({
      title: "ยกเลิกเอกสาร",
      text: "กรุณาระบุเหตุผลการยกเลิก:",
      input: "text",
      inputPlaceholder: "ระบุเหตุผล...",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ปิด",
      confirmButtonColor: "#dc2626",
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await receiveService.cancelReceive(record.id, reason || "");
      await MySwal.fire({
        title: "สำเร็จ",
        text: "ยกเลิกเอกสารสำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      router.back();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (record.status !== "PENDING") return;

    setIsSubmitting(true);
    try {
      const isAsset = record.type === "PURCHASE_ASSET";
      const itemsPayload = Object.entries(inputData).map(([idStr, data]) => ({
        receive_item_id: Number(idStr),
        qty: data.qty,
        lot_code: !isAsset ? (data.lot_code || undefined) : undefined,
        expired_at: !isAsset ? (data.expired_at ? new Date(data.expired_at).toISOString() : undefined) : undefined,
        assets: isAsset && data.qty > 0 ? Array(data.qty).fill({}) : undefined,
      }));

      await receiveService.confirmReceive(record.id, itemsPayload);
      await MySwal.fire({
        title: "สำเร็จ",
        text: "ยืนยันการรับเข้าสำเร็จ",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
      router.back();
    } catch (err) {
      MySwal.fire({ title: "ข้อผิดพลาด", text: getErrorMessage(err), icon: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-gray-800">รายละเอียดการรับเข้า</h2>
        <button
          onClick={() => router.back()}
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
            <h2 className="text-lg font-semibold">ข้อมูลเอกสาร</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">เลขที่เอกสาร</p>
              <p className="font-mono text-base font-semibold text-slate-800">{record.doc_no}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ประเภท</p>
              <p className="text-base font-medium text-slate-800">{TYPE_LABEL[record.type] || record.type}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">สถานะ</p>
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_COLOR[record.status] || "bg-slate-100 text-slate-700"}`}>
                {STATUS_LABEL[record.status] || record.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500">วันที่รับ</p>
              <p className="text-base text-slate-800">{formatDateTime(record.receive_date)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ผู้จำหน่าย / ผู้บริจาค</p>
              <p className="text-base text-slate-800">{record.supplier_name || record.donor_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ผู้บันทึก</p>
              <p className="text-base text-slate-800">{record.created_by || "-"}</p>
            </div>
            <div className="md:col-span-3">
              <p className="text-xs text-slate-500">หมายเหตุ</p>
              <p className="text-base text-slate-800">{record.note || "-"}</p>
            </div>
          </div>
        </section>

        {/* Items Table */}
        <section className="rounded-lg bg-white border border-slate-300 overflow-hidden flex flex-col" style={{ height: "340px" }}>
          <div className="border-b border-slate-300 px-6 py-5 bg-white">
            <h2 className="text-lg font-semibold text-slate-800">รายการสินค้า ({record.receive_item?.length || 0} รายการ)</h2>
          </div>

          <div
            className="flex-1"
            style={{
              overflowX: "auto",
              overflowY: "auto",
              scrollbarWidth: "auto",
              msOverflowStyle: "auto",
            } as React.CSSProperties}
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
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-300 sticky top-0 z-10 tracking-wide text-xs">
                <tr>
                  <th className="px-6 py-4 w-[50px]">#</th>
                  <th className="px-6 py-4 w-[120px]">รหัสสินค้า</th>
                  <th className="px-6 py-4 w-[250px]">ชื่อสินค้า</th>
                  <th className="px-6 py-4 w-[120px] text-center">จำนวนสั่ง</th>
                  <th className="px-6 py-4 w-[120px] text-center">จำนวนรับ</th>
                  {record.type !== "PURCHASE_ASSET" && (
                    <>
                      <th className="px-6 py-4 w-[150px]">Lot Code</th>
                      <th className="px-6 py-4 w-[150px]">วันหมดอายุ</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {record.receive_item?.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 w-[50px]">{index + 1}</td>
                    <td className="px-6 py-4 w-[120px] font-mono font-medium text-slate-600">{item.item_code || item.item_id}</td>
                    <td className="px-6 py-4 w-[250px] font-semibold text-slate-800">{item.item_name || "-"}</td>
                    <td className="px-6 py-4 w-[120px] text-center font-medium">{item.expected_qty ?? 0}</td>
                    {record.status === "PENDING" ? (
                      <>
                        <td className="px-6 py-4 w-[120px]">
                          <div className="flex justify-center">
                            <input
                              type="number"
                              min="0"
                              max={item.expected_qty ?? 0}
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={inputData[item.id]?.qty?.toString() || "0"}
                              onChange={(e) => {
                                let valStr = e.target.value;
                                if (valStr.length > 1 && valStr.startsWith("0")) {
                                  valStr = valStr.replace(/^0+/, "") || "0";
                                }
                                let val = valStr === "" ? 0 : Number(valStr);
                                const maxQty = item.expected_qty ?? 0;
                                if (val > maxQty) val = maxQty;
                                setInputData({ ...inputData, [item.id]: { ...inputData[item.id], qty: val } });
                              }}
                            />
                          </div>
                        </td>
                        {record.type !== "PURCHASE_ASSET" && (
                          <>
                            <td className="px-6 py-4 w-[150px] font-mono">
                              <input
                                title="Lot number"
                                type="text"
                                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={inputData[item.id]?.lot_code || ""}
                                onChange={(e) => setInputData({ ...inputData, [item.id]: { ...inputData[item.id], lot_code: e.target.value } })}
                                placeholder="Lot Code"
                              />
                            </td>
                            <td className="px-6 py-4 w-[150px]">
                              <input
                                title="Expiration date"
                                type="date"
                                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                value={inputData[item.id]?.expired_at || ""}
                                onChange={(e) => setInputData({ ...inputData, [item.id]: { ...inputData[item.id], expired_at: e.target.value } })}
                              />
                            </td>
                          </>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 w-[120px] text-center font-medium">{item.qty ?? 0}</td>
                        {record.type !== "PURCHASE_ASSET" && (
                          <>
                            <td className="px-6 py-4 w-[150px] font-mono text-slate-500">{item.lot_code || "-"}</td>
                            <td className="px-6 py-4 w-[150px] text-slate-600">{formatDate(item.expired_at)}</td>
                          </>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {(!record.receive_item || record.receive_item.length === 0) && (
              <tbody>
                <tr>
                  <td colSpan={record.type === "PURCHASE_ASSET" ? 5 : 7}>
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
                      </svg>
                      <p className="text-sm font-medium">ไม่พบรายการสินค้า</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        {record.status === "PENDING" && record.receive_item && record.receive_item.length > 0 && (
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิกเอกสาร
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <span>ยืนยันข้อมูลการรับเข้า</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
