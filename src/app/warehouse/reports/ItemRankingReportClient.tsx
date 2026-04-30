"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RankingItem {
  rank: number;
  itemId: string;
  code: string;
  name: string;
  category: string;
  warehouse: string;
  unit: string;
  lotCount: number;
  currentStock: number;
  issuedQty?: number;
  requestCount?: number;
  minStock?: number;
}

interface ApiResponse {
  items: RankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  onBack?: () => void;
}

type Mode = "issued" | "stock";

const PERIOD_PRESETS = [
  { label: "1M",  months: 1  },
  { label: "3M",  months: 3  },
  { label: "6M",  months: 6  },
  { label: "9M",  months: 9  },
  { label: "12M", months: 12 },
];

const ITEMS_PER_PAGE = 20;

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ItemRankingReportClient({ onBack }: Props) {
  const { profile } = useUser();

  const [mode, setMode]             = useState<Mode>("issued");
  const [rows, setRows]             = useState<RankingItem[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);

  const [selectedPreset, setSelectedPreset] = useState<number>(3);
  const [dateFrom, setDateFrom]     = useState(monthsAgo(3));
  const [dateTo, setDateTo]         = useState(today());
  const [useCustom, setUseCustom]   = useState(false);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        mode,
        page:  String(p),
        limit: String(ITEMS_PER_PAGE),
        ...(mode === "issued" ? { dateFrom, dateTo } : {}),
      });
      const res = await apiClient.get<ApiResponse>(`/v1/reports/item-ranking?${params}`);
      setRows(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [mode, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
    fetchData(1);
  }, [mode, dateFrom, dateTo, fetchData]);

  const handlePreset = (months: number) => {
    setSelectedPreset(months);
    setUseCustom(false);
    setDateFrom(monthsAgo(months));
    setDateTo(today());
  };

  const handlePdf = () => {
    const isIssued = mode === "issued";
    const columns: PrintColumn[] = [
      { header: "อันดับ",    key: "rank",         align: "center" },
      { header: "รหัส",      key: "code",         align: "left"   },
      { header: "ชื่อพัสดุ", key: "name",         align: "left"   },
      { header: "หมวดหมู่",  key: "category",     align: "left"   },
      { header: "คลัง",      key: "warehouse",    align: "left"   },
      { header: "จำนวน Lot", key: "lotCount",     align: "center" },
      { header: isIssued ? "จำนวนเบิก" : "สต็อกคงเหลือ",
                             key: isIssued ? "issuedQty" : "currentStock", align: "right" },
      { header: "หน่วย",     key: "unit",         align: "left"   },
    ];
    const title = isIssued
      ? "รายงานอันดับพัสดุที่เบิกใช้มากสุด"
      : "รายงานอันดับพัสดุที่มีสต็อกคงเหลือมากสุด";
    printWarehouseReport({
      reportTitle: title,
      period: isIssued ? `${dateFrom} – ${dateTo}` : undefined,
      columns,
      rows: rows.map(r => ({ ...r })),
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
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">รายงานอันดับสินค้า</h1>
              <p className="text-sm text-slate-500 mt-0.5">ระบบบริหารคลังสินค้า HPK</p>
            </div>
            {/* Mode tabs inside header */}
            <div className="flex gap-1 ml-6">
              {(["issued", "stock"] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    mode === m
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m === "issued" ? "เบิกใช้มากสุด" : "สต็อกคงเหลือมากสุด"}
                </button>
              ))}
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
            {mode === "issued" && (
              <>
                {PERIOD_PRESETS.map(p => (
                  <button
                    key={p.months}
                    onClick={() => handlePreset(p.months)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      !useCustom && selectedPreset === p.months
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setUseCustom(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    useCustom ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  กำหนดเอง
                </button>
                {useCustom && (
                  <div className="flex items-center gap-2">
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                    <span className="text-slate-400 text-xs">–</span>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                )}
              </>
            )}
            <div className="ml-auto">
              <button
                onClick={handlePdf}
                className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                พิมพ์ PDF
              </button>
            </div>
          </div>

          {/* Summary strip */}
          <div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100 text-sm">
            <span className="text-slate-500">พบ <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> รายการ</span>
          </div>

          {/* Table */}
          <div className="relative overflow-auto" style={{ maxHeight: "52vh" }}>
            <table className="w-full text-sm text-left table-fixed min-w-[750px]">
              <thead className="bg-slate-700 text-white text-xs uppercase tracking-wide sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-center font-semibold w-14">อันดับ</th>
                  <th className="px-4 py-3 text-left font-semibold">รหัส</th>
                  <th className="px-4 py-3 text-left font-semibold">ชื่อพัสดุ</th>
                  <th className="px-4 py-3 text-left font-semibold">หมวดหมู่</th>
                  <th className="px-4 py-3 text-center font-semibold">Lot</th>
                  {mode === "issued" ? (
                    <>
                      <th className="px-4 py-3 text-right font-semibold">จำนวนเบิก</th>
                      <th className="px-4 py-3 text-center font-semibold">ครั้ง</th>
                    </>
                  ) : (
                    <th className="px-4 py-3 text-right font-semibold">สต็อก</th>
                  )}
                  <th className="px-4 py-3 text-left font-semibold">หน่วย</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">กำลังโหลด...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
                ) : rows.map((row, idx) => (
                  <tr key={row.itemId} className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-3 text-center">
                      {row.rank <= 3 ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                          row.rank === 1 ? "bg-amber-400" : row.rank === 2 ? "bg-slate-400" : "bg-amber-700"
                        }`}>{row.rank}</span>
                      ) : (
                        <span className="text-slate-500">{row.rank}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.category}</td>
                    <td className="px-4 py-3 text-center text-slate-600">{row.lotCount}</td>
                    {mode === "issued" ? (
                      <>
                        <td className="px-4 py-3 text-right font-semibold text-blue-600">{(row.issuedQty ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-slate-500">{row.requestCount ?? 0}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right font-semibold text-teal-600">{row.currentStock.toLocaleString()}</td>
                    )}
                    <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                  </tr>
                ))}
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
        <p className="text-xs text-slate-400 text-center">ระบบบริหารคลังสินค้า HPK — รายงานอันดับสินค้า</p>
      </div>
    </div>
  );
}
