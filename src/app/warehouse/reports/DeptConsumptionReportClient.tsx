"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  category: string;
  issuedQty: number;
  value: number;
}

interface DeptGroup {
  departmentId: number;
  departmentName: string;
  requestCount: number;
  totalIssuedQty: number;
  totalValue: number;
  topItems: TopItem[];
}

interface ApiResponse {
  groups: DeptGroup[];
  totalDepts: number;
}

interface Props {
  onBack?: () => void;
}

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

function fmtBaht(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeptConsumptionReportClient({ onBack }: Props) {
  const { profile } = useUser();

  const [data, setData]             = useState<ApiResponse | null>(null);
  const [loading, setLoading]       = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<number>>(new Set());

  const [selectedPreset, setSelectedPreset] = useState(3);
  const [dateFrom, setDateFrom]     = useState(monthsAgo(3));
  const [dateTo, setDateTo]         = useState(today());
  const [useCustom, setUseCustom]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const res = await apiClient.get<ApiResponse>(`/v1/reports/department-consumption?${params}`);
      setData(res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePreset = (months: number) => {
    setSelectedPreset(months);
    setUseCustom(false);
    setDateFrom(monthsAgo(months));
    setDateTo(today());
  };

  const toggleDept = (id: number) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePdf = () => {
    if (!data) return;
    const columns: PrintColumn[] = [
      { header: "แผนก",          key: "departmentName", align: "left"  },
      { header: "ครั้งที่เบิก",   key: "requestCount",   align: "center"},
      { header: "จำนวนรวม",      key: "totalIssuedQty", align: "right" },
      { header: "มูลค่ารวม (฿)", key: "totalValue",     align: "right" },
    ];
    const rows = data.groups.map(g => ({
      departmentName: g.departmentName,
      requestCount:   g.requestCount,
      totalIssuedQty: g.totalIssuedQty.toLocaleString(),
      totalValue:     fmtBaht(g.totalValue),
    }));
    printWarehouseReport({
      reportTitle: "รายงานการใช้พัสดุรายแผนก",
      period: `${dateFrom} – ${dateTo}`,
      filterSummary: `${data.groups.length} แผนก`,
      columns,
      rows,
      printedBy: {
        title:      profile?.title?.name,
        firstName:  profile?.firstname_th,
        lastName:   profile?.lastname_th,
        department: profile?.departments?.[0]?.name,
      },
    });
  };

  const grandTotal = data?.groups.reduce((s, g) => s + g.totalValue, 0) ?? 0;
  const maxValue   = data?.groups[0]?.totalValue ?? 1;

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
          <h1 className="text-2xl font-bold text-slate-900">รายงานการใช้พัสดุรายแผนก</h1>
          <p className="text-sm text-slate-500 mt-0.5">มูลค่าและปริมาณพัสดุที่เบิกแยกตามแผนก</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">มูลค่าการใช้รวม</p>
          <p className="text-2xl font-bold text-[#0786F5]">฿{fmtBaht(grandTotal)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">จำนวนแผนก</p>
          <p className="text-2xl font-bold text-slate-700">{data?.totalDepts ?? 0}</p>
        </div>
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
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
        <div className="ml-auto">
          <button onClick={handlePdf} className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">
            พิมพ์ PDF
          </button>
        </div>
      </div>

      {/* Department groups */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">กำลังโหลด...</div>
      ) : !data || data.groups.length === 0 ? (
        <div className="py-16 text-center text-slate-400">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>
      ) : (
        <div className="space-y-3">
          {data.groups.map((group, idx) => {
            const expanded = expandedDepts.has(group.departmentId);
            const barPct   = maxValue > 0 ? (group.totalValue / maxValue) * 100 : 0;
            return (
              <div key={group.departmentId} className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleDept(group.departmentId)}
                  className="w-full flex items-center gap-4 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  {/* Rank badge */}
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? "bg-amber-400 text-white" : idx === 1 ? "bg-slate-300 text-white" : idx === 2 ? "bg-amber-700 text-white" : "bg-slate-100 text-slate-500"
                  }`}>{idx + 1}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{group.departmentName}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-[#0786F5] rounded-full transition-all" style={{ width: `${barPct}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{group.requestCount} ครั้ง</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0 mr-2">
                    <p className="font-bold text-slate-900">฿{fmtBaht(group.totalValue)}</p>
                    <p className="text-xs text-slate-400">{group.totalIssuedQty.toLocaleString()} ชิ้น</p>
                  </div>

                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {/* Top items */}
                {expanded && group.topItems.length > 0 && (
                  <div className="overflow-x-auto border-t border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="bg-white">
                        <tr>
                          <th className="px-5 py-2 text-left font-semibold text-slate-500 uppercase">Top 5 พัสดุ</th>
                          <th className="px-5 py-2 text-left font-semibold text-slate-500 uppercase">หมวดหมู่</th>
                          <th className="px-5 py-2 text-right font-semibold text-slate-500 uppercase">จำนวนเบิก</th>
                          <th className="px-5 py-2 text-left font-semibold text-slate-500 uppercase">หน่วย</th>
                          <th className="px-5 py-2 text-right font-semibold text-slate-500 uppercase">มูลค่า (฿)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 bg-white">
                        {group.topItems.map(it => (
                          <tr key={it.itemId} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2">
                              <p className="font-medium text-slate-800">{it.itemName}</p>
                              <p className="text-slate-400 font-mono">{it.itemCode}</p>
                            </td>
                            <td className="px-5 py-2 text-slate-500">{it.category}</td>
                            <td className="px-5 py-2 text-right font-semibold text-[#0786F5]">{it.issuedQty.toLocaleString()}</td>
                            <td className="px-5 py-2 text-slate-500">{it.unit}</td>
                            <td className="px-5 py-2 text-right text-slate-700">฿{fmtBaht(it.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
