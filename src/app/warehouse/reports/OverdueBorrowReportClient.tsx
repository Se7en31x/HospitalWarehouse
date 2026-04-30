"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlarmClock, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OverdueItem {
  id: string;
  itemCode: string;
  itemName: string;
  qty: number;
  issued: number;
  unit: string;
}

interface OverdueRow {
  id: string;
  docNo: string;
  requester: string;
  department: string;
  dueDate: string | null;
  daysOverdue: number | null;
  status: string;
  items: OverdueItem[];
}

interface ApiResponse {
  items: OverdueRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  onBack?: () => void;
}

const ITEMS_PER_PAGE = 20;

// ── Component ─────────────────────────────────────────────────────────────────

export default function OverdueBorrowReportClient({ onBack }: Props) {
  const { profile } = useUser();

  const [rows, setRows]           = useState<OverdueRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(false);

  const [search, setSearch]       = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(ITEMS_PER_PAGE),
        ...(search ? { search } : {}),
      });
      const res = await apiClient.get<ApiResponse>(`/v1/reports/overdue-borrows?${params}`);
      setRows(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [search, fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePdf = () => {
    const columns: PrintColumn[] = [
      { header: "เลขที่เอกสาร",    key: "docNo",       align: "left"   },
      { header: "ผู้ยืม",           key: "requester",   align: "left"   },
      { header: "แผนก",             key: "department",  align: "left"   },
      { header: "วันครบกำหนด",      key: "dueDate",     align: "center" },
      { header: "เกินมา (วัน)",     key: "daysOverdue", align: "center" },
      { header: "สถานะ",            key: "status",      align: "center" },
    ];
    const pdfRows = rows.map(r => ({
      docNo:       r.docNo,
      requester:   r.requester,
      department:  r.department,
      dueDate:     r.dueDate ? fmtDate(r.dueDate) : "-",
      daysOverdue: r.daysOverdue ?? "-",
      status:      r.status,
    }));
    printWarehouseReport({
      reportTitle: "รายงานการยืมพัสดุค้างคืน",
      filterSummary: `ทั้งหมด ${total.toLocaleString()} รายการ`,
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

  // ── Summary ──────────────────────────────────────────────────────────────────
  const totalDaysOverdue = rows.reduce((s, r) => s + (r.daysOverdue ?? 0), 0);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow">
              <AlarmClock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานการยืมเกินกำหนด</h1>
              <p className="text-sm text-slate-500 mt-0.5">ระบบบริหารคลังสินค้า HPK</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
                ย้อนกลับ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหาเลขที่เอกสาร / แผนก..."
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
            <button
              onClick={handlePdf}
              className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
            >
              พิมพ์ PDF
            </button>
          </div>

          {/* Summary strip */}
          <div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100 text-sm">
            <span className="text-slate-500">พบ <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> รายการ</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">รวม <span className="font-semibold text-red-600">{totalDaysOverdue.toLocaleString()}</span> วันเกินกำหนด</span>
          </div>

          {/* Table */}
          <div className="relative overflow-auto" style={{ maxHeight: "52vh" }}>
            <table className="w-full text-sm text-left table-fixed min-w-[700px]">
              <thead className="bg-slate-700 text-white text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">เลขที่เอกสาร</th>
                  <th className="px-4 py-3 text-left font-semibold">ผู้ยืม</th>
                  <th className="px-4 py-3 text-left font-semibold">แผนก</th>
                  <th className="px-4 py-3 text-center font-semibold">วันครบกำหนด</th>
                  <th className="px-4 py-3 text-center font-semibold">เกินมา</th>
                  <th className="px-4 py-3 text-center font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                ) : rows.map((row, idx) => {
                  const expanded = expandedIds.has(row.id);
                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors cursor-pointer ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                        onClick={() => toggleExpand(row.id)}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{row.docNo}</td>
                        <td className="px-4 py-3 text-slate-700">{row.requester}</td>
                        <td className="px-4 py-3 text-slate-600">{row.department}</td>
                        <td className="px-4 py-3 text-center">{row.dueDate ? fmtDate(row.dueDate) : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                            {row.daysOverdue ?? 0} วัน
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">
                          {expanded ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />}
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-slate-50 border-b border-slate-200 px-8 py-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">รายการพัสดุที่ยังไม่คืน</p>
                            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                              <thead className="bg-slate-700 text-white text-xs uppercase tracking-wide">
                                <tr>
                                  <th className="px-3 py-2 text-left">รหัส</th>
                                  <th className="px-3 py-2 text-left">ชื่อพัสดุ</th>
                                  <th className="px-3 py-2 text-center">จำนวนขอ</th>
                                  <th className="px-3 py-2 text-center">จำนวนจ่าย</th>
                                  <th className="px-3 py-2 text-left">หน่วย</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {row.items.map(it => (
                                  <tr key={it.id}>
                                    <td className="px-3 py-1.5 font-mono text-slate-500">{it.itemCode}</td>
                                    <td className="px-3 py-1.5 text-slate-800">{it.itemName}</td>
                                    <td className="px-3 py-1.5 text-center">{it.qty}</td>
                                    <td className="px-3 py-1.5 text-center">{it.issued}</td>
                                    <td className="px-3 py-1.5 text-slate-500">{it.unit}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/60">
            <p className="text-sm text-slate-500">ทั้งหมด {total.toLocaleString()} รายการ</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-700 px-2">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
                  className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white px-8 py-3">
        <p className="text-xs text-slate-400 text-center">ระบบบริหารคลังสินค้า HPK — รายงานการยืมเกินกำหนด</p>
      </div>
    </div>
  );
}
