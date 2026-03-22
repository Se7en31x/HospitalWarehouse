"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCw, FileText } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import * as receiveService from "@/services/receiveService";
import type { ReceiveHeader, ReceiveStatus, ReceiveType } from "@/services/receiveService";

interface ReceiveDetailClientProps {
  receiveId: string | number | undefined;
}

const TYPE_LABEL: Record<ReceiveType, string> = {
  PURCHASE: "จัดซื้อ",
  DONATION: "บริจาค",
  PURCHASE_ASSET: "ครุภัณฑ์",
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

export default function ReceiveDetailClient({ receiveId }: ReceiveDetailClientProps) {
  const router = useRouter();

  const [record, setRecord] = useState<ReceiveHeader | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputData, setInputData] = useState<Record<number, { qty: number; lot_code: string; expired_at: string }>>({});

  // Robust id parsing
  const parsedId = useMemo(() => {
    if (typeof receiveId === "number" && Number.isFinite(receiveId)) return receiveId;
    if (typeof receiveId === "string" && receiveId.trim() !== "") {
      const n = Number(receiveId);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }, [receiveId]);

  const fetchData = useCallback(async () => {
    if (!parsedId) {
      setError("รหัสเอกสารไม่ถูกต้อง (id: " + String(receiveId) + ")");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await receiveService.getReceiveById(parsedId);
      setRecord(data);
      if (data.status === "PENDING" && data.receive_item) {
        const initialData: Record<number, { qty: number; lot_code: string; expired_at: string }> = {};
        data.receive_item.forEach(item => {
          initialData[item.id] = {
            qty: item.qty ?? item.expected_qty ?? 0,
            lot_code: item.lot_code || "",
            expired_at: item.expired_at ? item.expired_at.split("T")[0] : "", // get YYYY-MM-DD
          };
        });
        setInputData(initialData);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [parsedId, receiveId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = async () => {
    if (!parsedId || !record || record.status !== "PENDING") return;
    
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "ยกเลิกเอกสาร",
      text: "กรุณาระบุเหตุผลการยกเลิกเอกสารรับเข้านี้:",
      input: "text",
      inputPlaceholder: "ระบุเหตุผล...",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการยกเลิก",
      cancelButtonText: "ปิด",
      confirmButtonColor: "#dc2626",
    });

    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await receiveService.cancelReceive(parsedId, reason || "");
      toast.success("ยกเลิกเอกสารสำเร็จ");
      fetchData(); // reload record
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยกเลิกเอกสาร";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedId || !record || record.status !== "PENDING") return;
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
      await receiveService.confirmReceive(parsedId, itemsPayload);
      toast.success("ยืนยันการรับเข้าสำเร็จ");
      fetchData(); // reload record
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการยืนยันข้อมูล";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <Toaster position="top-right" />

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/warehouse/receives")}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              กลับหน้ารายการ
            </button>
            <h1 className="text-2xl font-bold text-slate-800">รายละเอียดการรับเข้า</h1>
          </div>

          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <RefreshCw className="h-4 w-4" />
            รีเฟรช
          </button>
        </div>

        {isLoading && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            <p className="font-semibold">ไม่สามารถโหลดรายละเอียดเอกสารได้</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        )}

        {!isLoading && !error && record && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center gap-2 text-slate-700">
                <FileText className="h-5 w-5" />
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

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-semibold text-slate-800">รายการสินค้า ({record.receive_item?.length || 0} รายการ)</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-semibold">#</th>
                      <th className="px-4 py-3 font-semibold">รหัสสินค้า</th>
                      <th className="px-4 py-3 font-semibold">ชื่อสินค้า</th>
                      <th className="px-4 py-3 font-semibold text-right">จำนวนสั่ง</th>
                      <th className="px-4 py-3 font-semibold text-right">จำนวนรับ</th>
                      {record.type !== "PURCHASE_ASSET" && (
                        <>
                          <th className="px-4 py-3 font-semibold">Lot Code</th>
                          <th className="px-4 py-3 font-semibold">วันหมดอายุ</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {record.receive_item?.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-mono">{item.item_code || item.item_id}</td>
                        <td className="px-4 py-3">{item.item_name || "-"}</td>
                        <td className="px-4 py-3 text-right">{item.expected_qty ?? 0}</td>
                        {record.status === "PENDING" ? (
                          <>
                            <td className="px-4 py-3">
                              <div className="flex justify-end">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.expected_qty ?? 0}
                                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  value={inputData[item.id]?.qty?.toString() || "0"}
                                  onChange={(e) => {
                                    let valStr = e.target.value;
                                    // Remove leading zeroes if not single "0"
                                    if (valStr.length > 1 && valStr.startsWith("0")) {
                                      valStr = valStr.replace(/^0+/, "") || "0";
                                    }
                                    let val = valStr === "" ? 0 : Number(valStr);
                                    const maxQty = item.expected_qty ?? 0;
                                    // Prevent exceeding expected quantity
                                    if (val > maxQty) val = maxQty;
                                    
                                    setInputData({ ...inputData, [item.id]: { ...inputData[item.id], qty: val } });
                                  }}
                                />
                              </div>
                            </td>
                            {record.type !== "PURCHASE_ASSET" && (
                              <>
                                <td className="px-4 py-3 font-mono">
                                  <input
                                    title="Lot number"
                                    type="text"
                                    className="w-full min-w-[100px] rounded-md border border-slate-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={inputData[item.id]?.lot_code || ""}
                                    onChange={(e) => setInputData({ ...inputData, [item.id]: { ...inputData[item.id], lot_code: e.target.value } })}
                                    placeholder="Lot Code"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <input
                                    title="Expiration date"
                                    type="date"
                                    className="w-full min-w-[130px] rounded-md border border-slate-300 px-2 py-1 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    value={inputData[item.id]?.expired_at || ""}
                                    onChange={(e) => setInputData({ ...inputData, [item.id]: { ...inputData[item.id], expired_at: e.target.value } })}
                                  />
                                </td>
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-right">{item.qty ?? 0}</td>
                            {record.type !== "PURCHASE_ASSET" && (
                              <>
                                <td className="px-4 py-3 font-mono">{item.lot_code || "-"}</td>
                                <td className="px-4 py-3">{formatDate(item.expired_at)}</td>
                              </>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {(!record.receive_item || record.receive_item.length === 0) && (
                  <div className="p-6 text-center text-sm text-slate-500">ไม่พบรายการสินค้าในเอกสารนี้</div>
                )}
                
                {record.status === "PENDING" && record.receive_item && record.receive_item.length > 0 && (
                  <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4">
                    <button
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-6 py-2.5 font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      ยกเลิกเอกสาร
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <span>ยืนยันข้อมูลการรับเข้า</span>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
