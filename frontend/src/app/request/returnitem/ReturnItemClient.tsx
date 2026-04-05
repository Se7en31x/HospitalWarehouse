"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Search, RefreshCw, ChevronLeft, ChevronRight,
  Clock, X, Building2, User, Eye,
  MapPin, Phone, Calendar, Package, Loader2, FileText,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { getBorrowActive, getRequisitionById } from "@/services/requisitionService";
import type { RequisitionHeader, RequisitionItem, BorrowerDetails } from "@/types/requisition_type";
import { socket } from "@/lib/socket";

// === Helpers ===

const fmtDate = (d?: string | null) => {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("th-TH", {
    year: "numeric", month: "short", day: "numeric",
  });
};

const isOverdue = (due?: string | null): boolean => {
  if (!due) return false;
  return new Date(due) < new Date();
};

const StatusBadge = ({ overdue }: { overdue: boolean }) => {
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-red-50 text-red-700 border-red-200">
        <Clock className="w-3 h-3" /> ค้างคืน
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200">
      <Clock className="w-3 h-3" /> อยู่ระหว่างยืม
    </span>
  );
};

// === Detail Modal ===

interface DetailModalProps {
  record: RequisitionHeader | null;
  onClose: () => void;
}

function DetailModal({ record, onClose }: DetailModalProps) {
  if (!record) return null;
  const borrower = record.borrower_details as BorrowerDetails | undefined | null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 bg-emerald-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">{record.doc_no}</p>
              <p className="text-white/70 text-xs">ติดตามการยืมของบุคคลภายนอก</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition p-1.5 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <User className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-bold text-gray-700">ข้อมูลผู้ยืม</span>
            </div>
            <div className="p-4 space-y-2">
              {borrower ? (
                <>
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="ผู้ทำรายการให้" value={record.requester ?? "-"} />
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="ชื่อผู้ยืม" value={borrower.fullname ?? "-"} />
                  <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="โทรศัพท์" value={borrower.phone ?? "-"} />
                  {borrower.address && <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="ที่อยู่" value={borrower.address} />}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {borrower.subdistrict && <MiniInfo label="ตำบล" value={borrower.subdistrict} />}
                    {borrower.district && <MiniInfo label="อำเภอ" value={borrower.district} />}
                    {borrower.province && <MiniInfo label="จังหวัด" value={borrower.province} />}
                    {borrower.zipcode && <MiniInfo label="รหัสไปรษณีย์" value={borrower.zipcode} />}
                  </div>
                  {borrower.notes && <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="หมายเหตุ" value={borrower.notes} />}
                </>
              ) : (
                <>
                  <InfoRow icon={<User className="w-3.5 h-3.5" />} label="ผู้ทำรายการ" value={record.requester ?? "-"} />
                  <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="แผนก" value={record.department_name ?? `แผนก ${record.department_id}`} />
                </>
              )}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">วันที่</span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              <MiniInfo label="วันที่ยืม" value={fmtDate(record.request_date)} />
              <MiniInfo label="กำหนดคืน" value={fmtDate(record.due_date)} alert={isOverdue(record.due_date)} />
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
              <Package className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-bold text-gray-700">รายการสินค้า</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="px-4 py-2 text-left">สินค้า</th>
                    <th className="px-4 py-2 text-center">ขอ</th>
                    <th className="px-4 py-2 text-center">จ่ายออก</th>
                    <th className="px-4 py-2 text-center">คืนแล้ว</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(record.items ?? []).map((item: RequisitionItem) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.code}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.qty}</td>
                      <td className="px-4 py-3 text-center text-indigo-700 font-medium">{item.issued}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-medium ${item.returned >= item.issued ? "text-green-600" : "text-gray-500"}`}>
                          {item.returned}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!record.items?.length && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">ไม่มีรายการ</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {record.note && (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-400 uppercase font-bold mb-1">หมายเหตุ</p>
              <p className="text-sm text-gray-700">{record.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-gray-500 flex-shrink-0 w-28">{label}</span>
      <span className="font-medium text-gray-800 flex-1">{value}</span>
    </div>
  );
}

function MiniInfo({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2.5">
      <p className="text-[10px] text-gray-400 uppercase font-bold">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 ${alert ? "text-red-600" : "text-gray-800"}`}>{value}</p>
    </div>
  );
}

// === Main Component ===

export default function ReturnItemClient() {
  const [records, setRecords] = useState<RequisitionHeader[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [detailLoading, setDetailLoading] = useState<number | null>(null);
  const [viewingDetail, setViewingDetail] = useState<RequisitionHeader | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);
  const isVisibleRef = useRef(true);

  const fetchData = useCallback(async () => {
    setIsFetching(true);
    try {
      const result = await getBorrowActive(1, 200);
      if (result.success !== false) {
        let data: RequisitionHeader[] = [];
        if (Array.isArray(result.data)) {
          data = result.data;
        } else if (result.data && typeof result.data === "object" && "items" in result.data) {
          data = (result.data as { items: RequisitionHeader[] }).items;
        }
        setRecords(data);
      } else {
        toast.error(result.message || "ไม่สามารถดึงข้อมูลได้");
        setRecords([]);
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setRecords([]);
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };

    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const scheduleRefresh = () => {
      if (!isVisibleRef.current) return;
      if (viewingDetail || detailLoading !== null) return;
      if (isRefreshingRef.current) return;

      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(async () => {
        isRefreshingRef.current = true;
        try {
          await fetchData();
        } finally {
          isRefreshingRef.current = false;
          refreshTimerRef.current = null;
        }
      }, 220);
    };

    const handleRefreshSignal = (message: string) => {
      if (message === "REQUISITIONS") {
        scheduleRefresh();
      }
    };

    socket.on("REFRESH_DATA", handleRefreshSignal);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      socket.off("REFRESH_DATA", handleRefreshSignal);
    };
  }, [fetchData, viewingDetail, detailLoading]);

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(id);
    try {
      const result = await getRequisitionById(id);
      if (result.success && result.data) {
        setViewingDetail(result.data);
      } else {
        toast.error(result.message || "ไม่สามารถโหลดรายละเอียดได้");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setDetailLoading(null);
    }
  }, []);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records.filter((r) => {
      if (!r.borrower_details) return false;

      const borrower = r.borrower_details as BorrowerDetails | undefined | null;
      if (!term) return true;

      return (
        r.doc_no.toLowerCase().includes(term) ||
        (r.requester ?? "").toLowerCase().includes(term) ||
        (r.department_name ?? "").toLowerCase().includes(term) ||
        (borrower?.fullname ?? "").toLowerCase().includes(term) ||
        (borrower?.phone ?? "").toLowerCase().includes(term)
      );
    });
  }, [records, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const displayed = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  return (
    <div className="flex flex-col min-h-screen bg-white p-8 font-sans">
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">ติดตามคืนของภายนอก</h2>
          <p className="text-sm text-gray-500 mt-1">แสดงเฉพาะรายการยืมบุคคลภายนอกที่ยังไม่คืน</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isFetching}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          รีเฟรช
        </button>
      </div>
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อผู้ยืมภายนอก, เบอร์โทร..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
          />
        </div>
        <span className="text-sm text-slate-500">ทั้งหมด {filtered.length} รายการ</span>
      </div>
      <div className="rounded-xl bg-white shadow-lg border border-slate-100 overflow-hidden relative flex flex-col" style={{ minHeight: "400px" }}>
        {isFetching && (
          <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-4 w-12">#</th>
                <th className="px-5 py-4">เลขที่เอกสาร</th>
                <th className="px-5 py-4">ผู้ยืมภายนอก</th>
                <th className="px-5 py-4">แผนก</th>
                <th className="px-5 py-4 text-center">จำนวนสินค้า</th>
                <th className="px-5 py-4">วันที่ยืม</th>
                <th className="px-5 py-4">กำหนดคืน</th>
                <th className="px-5 py-4">สถานะ</th>
                <th className="px-5 py-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {displayed.map((r, idx) => {
                const overdue = isOverdue(r.due_date);
                const borrower = r.borrower_details as BorrowerDetails | undefined | null;
                return (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 text-slate-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-5 py-4 font-mono font-medium text-indigo-700">{r.doc_no}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-800">{borrower?.fullname ?? "-"}</div>
                      <div className="text-xs text-emerald-700 font-medium">{borrower?.phone ?? "-"}</div>
                      <div className="text-xs text-slate-400">ผู้ทำรายการ: {r.requester ?? "-"}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{r.department_name ?? `แผนก ${r.department_id}`}</td>
                    <td className="px-5 py-4 text-center font-medium text-gray-700">{r.item_count ?? 0}</td>
                    <td className="px-5 py-4 text-gray-600">{fmtDate(r.request_date)}</td>
                    <td className="px-5 py-4">
                      <span className={overdue ? "text-red-600 font-semibold" : "text-gray-600"}>
                        {fmtDate(r.due_date)}
                      </span>
                    </td>
                    <td className="px-5 py-4"><StatusBadge overdue={overdue} /></td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => openDetail(r.id)}
                        disabled={detailLoading === r.id}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition disabled:opacity-40"
                        title="ดูรายละเอียด"
                      >
                        {detailLoading === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && !isFetching && (
                <tr>
                  <td colSpan={9}>
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                      <Package className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-medium">ไม่มีรายการยืมภายนอกที่ค้างคืนหรือยังไม่คืน</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between mt-5">
        <p className="text-sm text-slate-500">แสดง {displayed.length} จาก {filtered.length} รายการ</p>
        <div className="flex items-center gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium px-3 py-1">หน้า {currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="p-2 border border-slate-200 rounded-lg disabled:opacity-30 hover:bg-slate-50 transition">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      {viewingDetail && <DetailModal record={viewingDetail} onClose={() => setViewingDetail(null)} />}
    </div>
  );
}
