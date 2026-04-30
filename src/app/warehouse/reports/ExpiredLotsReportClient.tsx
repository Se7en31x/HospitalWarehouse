"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, FlaskConical, Search } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

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

const ITEMS_PER_PAGE = 20;

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

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const now = new Date().toISOString().split("T")[0];
      const params = new URLSearchParams({
        page: String(p),
        limit: String(ITEMS_PER_PAGE),
        dateTo: now,
        ...(search ? { search } : {}),
      });
      const res = await apiClient.get<ApiResponse>(`/v1/reports/expired-lots?${params}`);
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

  const handlePdf = () => {
    const columns: PrintColumn[] = [
      { header: "Lot Code",    key: "lotCode",   align: "left"   },
      { header: "รหัสพัสดุ",   key: "itemCode",  align: "left"   },
      { header: "ชื่อพัสดุ",   key: "itemName",  align: "left"   },
      { header: "คลัง",        key: "warehouse", align: "left"   },
      { header: "จำนวน",       key: "quantity",  align: "right"  },
      { header: "หน่วย",       key: "unit",      align: "left"   },
      { header: "วันหมดอายุ",  key: "expiredAt", align: "center" },
      { header: "เกินมา (วัน)", key: "daysExpired", align: "center" },
    ];
    const pdfRows = rows.map(r => ({
      ...r,
      expiredAt:   r.expiredAt ? fmtDate(r.expiredAt) : "-",
      daysExpired: daysExpired(r.expiredAt),
    }));
    printWarehouseReport({
      reportTitle: "รายงานล็อตพัสดุหมดอายุ",
      filterSummary: `ทั้งหมด ${total.toLocaleString()} lot`,
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงาน LOT หมดอายุ</h1>
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
                placeholder="ค้นหา Lot Code..."
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
            <span className="text-slate-500">พบ <span className="font-semibold text-red-600">{total.toLocaleString()}</span> LOT</span>
          </div>

          {/* Table */}
          <div className="relative overflow-auto" style={{ maxHeight: "52vh" }}>
            <table className="w-full text-sm text-left table-fixed min-w-[800px]">
              <thead className="bg-slate-700 text-white text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Lot Code</th>
                  <th className="px-4 py-3 text-left font-semibold">รหัสพัสดุ</th>
                  <th className="px-4 py-3 text-left font-semibold">ชื่อพัสดุ</th>
                  <th className="px-4 py-3 text-left font-semibold">คลัง</th>
                  <th className="px-4 py-3 text-right font-semibold">จำนวน</th>
                  <th className="px-4 py-3 text-left font-semibold">หน่วย</th>
                  <th className="px-4 py-3 text-center font-semibold">วันหมดอายุ</th>
                  <th className="px-4 py-3 text-center font-semibold">เกินมา</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                ) : rows.map((row, idx) => {
                  const expired = daysExpired(row.expiredAt);
                  return (
                    <tr key={row.id} className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{row.lotCode}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.itemCode}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
                      <td className="px-4 py-3 text-slate-600">{row.warehouse}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">{row.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{row.expiredAt ? fmtDate(row.expiredAt) : "-"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                          {expired} วัน
                        </span>
                      </td>
                    </tr>
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
        <p className="text-xs text-slate-400 text-center">ระบบบริหารคลังสินค้า HPK — รายงาน LOT หมดอายุ</p>
      </div>
    </div>
  );
}
