"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { fmtDate } from "@/utils/dateUtils";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReturnRow {
  id: string;
  returnDate: string | null;
  itemCode: string;
  itemName: string;
  unit: string;
  category: string;
  qty: number;
  condition: string;
  note: string;
}

interface ApiResponse {
  items: ReturnRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Props {
  onBack?: () => void;
}

const ITEMS_PER_PAGE = 20;

const PERIOD_PRESETS = [
  { label: "1 เดือน",  months: 1  },
  { label: "3 เดือน",  months: 3  },
  { label: "6 เดือน",  months: 6  },
  { label: "9 เดือน",  months: 9  },
  { label: "12 เดือน", months: 12 },
];

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split("T")[0];
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

const CONDITION_LABEL: Record<string, { label: string; cls: string }> = {
  GOOD:    { label: "ดี",      cls: "bg-green-50 text-green-700"  },
  DAMAGED: { label: "ชำรุด",   cls: "bg-red-50 text-red-700"     },
  LOST:    { label: "สูญหาย",  cls: "bg-slate-100 text-slate-600" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function ReturnConditionReportClient({ onBack }: Props) {
  const { profile } = useUser();

  const [rows, setRows]             = useState<ReturnRow[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]       = useState(false);
  const [search, setSearch]         = useState("");
  const [selectedPreset, setSelectedPreset] = useState(3);
  const [dateFrom, setDateFrom]     = useState(monthsAgo(3));
  const [dateTo, setDateTo]         = useState(today());
  const [useCustom, setUseCustom]   = useState(false);

  const fetchData = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p), limit: String(ITEMS_PER_PAGE),
        dateFrom, dateTo,
        ...(search ? { search } : {}),
      });
      const res = await apiClient.get<ApiResponse>(`/v1/reports/return-condition?${params}`);
      setRows(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
      setTotalPages(res.data?.totalPages ?? 1);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  useEffect(() => { setPage(1); fetchData(1); }, [dateFrom, dateTo, search, fetchData]);

  const handlePreset = (months: number) => {
    setSelectedPreset(months);
    setUseCustom(false);
    setDateFrom(monthsAgo(months));
    setDateTo(today());
  };

  const handlePdf = () => {
    const columns: PrintColumn[] = [
      { header: "วันที่คืน",  key: "returnDate", align: "center" },
      { header: "รหัส",       key: "itemCode",   align: "left"   },
      { header: "ชื่อพัสดุ",  key: "itemName",   align: "left"   },
      { header: "จำนวนคืน",   key: "qty",        align: "center" },
      { header: "หน่วย",      key: "unit",       align: "left"   },
      { header: "สภาพ",       key: "condition",  align: "center" },
      { header: "หมายเหตุ",   key: "note",       align: "left"   },
    ];
    const pdfRows = rows.map(r => ({
      returnDate: r.returnDate ? fmtDate(r.returnDate) : "-",
      itemCode:   r.itemCode,
      itemName:   r.itemName,
      qty:        r.qty,
      unit:       r.unit,
      condition:  CONDITION_LABEL[r.condition]?.label ?? r.condition,
      note:       r.note || "-",
    }));
    printWarehouseReport({
      reportTitle: "รายงานสภาพพัสดุที่คืน",
      period: `${dateFrom} – ${dateTo}`,
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

  // Summary
  const good    = rows.filter(r => r.condition === "GOOD").length;
  const damaged = rows.filter(r => r.condition === "DAMAGED").length;
  const lost    = rows.filter(r => r.condition === "LOST").length;

  return (
    <div className="min-h-screen bg-white p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">รายงานสภาพพัสดุที่คืน</h1>
          <p className="text-sm text-slate-500 mt-0.5">สภาพพัสดุในการคืน แยกตามสภาพดี / ชำรุด / สูญหาย</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "ทั้งหมด",  value: total,   color: "text-slate-700" },
          { label: "สภาพดี",   value: good,    color: "text-green-600" },
          { label: "ชำรุด",    value: damaged, color: "text-red-600"   },
          { label: "สูญหาย",   value: lost,    color: "text-slate-500" },
        ].map(c => (
          <div key={c.label} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">{c.label}</p>
            <p className={`text-2xl font-bold ${c.color}`}>{c.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Period + search */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {PERIOD_PRESETS.map(p => (
          <button key={p.months} onClick={() => handlePreset(p.months)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              !useCustom && selectedPreset === p.months ? "bg-[#0786F5] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}>
            {p.label}
          </button>
        ))}
        <button onClick={() => setUseCustom(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            useCustom ? "bg-[#0786F5] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}>
          กำหนดเอง
        </button>
        {useCustom && (
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0786F5]/30" />
            <span className="text-slate-400 text-xs">–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0786F5]/30" />
          </div>
        )}
        <div className="relative ml-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ / รหัสพัสดุ..."
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-xl w-56 focus:outline-none focus:ring-2 focus:ring-[#0786F5]/30" />
        </div>
        <div className="ml-auto">
          <button onClick={handlePdf} className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">
            พิมพ์ PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0786F5] text-white">
            <tr>
              <th className="px-4 py-3 text-center font-semibold">วันที่คืน</th>
              <th className="px-4 py-3 text-left font-semibold">รหัส</th>
              <th className="px-4 py-3 text-left font-semibold">ชื่อพัสดุ</th>
              <th className="px-4 py-3 text-center font-semibold">จำนวน</th>
              <th className="px-4 py-3 text-left font-semibold">หน่วย</th>
              <th className="px-4 py-3 text-center font-semibold">สภาพ</th>
              <th className="px-4 py-3 text-left font-semibold">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">กำลังโหลด...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">ไม่พบข้อมูล</td></tr>
            ) : rows.map((row, i) => {
              const cond = CONDITION_LABEL[row.condition] ?? { label: row.condition, cls: "bg-slate-100 text-slate-600" };
              return (
                <tr key={row.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-3 text-center text-slate-600">{row.returnDate ? fmtDate(row.returnDate) : "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.itemCode}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{row.itemName}</td>
                  <td className="px-4 py-3 text-center">{row.qty}</td>
                  <td className="px-4 py-3 text-slate-500">{row.unit}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cond.cls}`}>
                      {cond.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{row.note || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">ทั้งหมด {total.toLocaleString()} รายการ</p>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); fetchData(p); }}
              className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-700 px-2">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); fetchData(p); }}
              className="p-2 rounded-xl border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
