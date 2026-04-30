"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useUser } from "@/context/UserContext";
import { printWarehouseReport, type PrintColumn } from "@/utils/printWarehouseReport";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ValueItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  currentStock: number;
  sellPrice: number;
  value: number;
}

interface ValueGroup {
  category: string;
  warehouse: string;
  items: ValueItem[];
  totalValue: number;
  totalStock: number;
}

interface ApiResponse {
  groups: ValueGroup[];
  grandTotal: number;
  totalItems: number;
}

interface Props {
  onBack?: () => void;
}

function fmtBaht(n: number): string {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InventoryValueReportClient({ onBack }: Props) {
  const { profile } = useUser();

  const [data, setData]           = useState<ApiResponse | null>(null);
  const [loading, setLoading]     = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ApiResponse>("/v1/reports/inventory-value");
      setData(res.data ?? null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const handlePdf = () => {
    if (!data) return;
    const columns: PrintColumn[] = [
      { header: "หมวดหมู่",   key: "category",     align: "left"   },
      { header: "ชื่อพัสดุ",  key: "name",         align: "left"   },
      { header: "สต็อก",      key: "currentStock", align: "right"  },
      { header: "หน่วย",      key: "unit",         align: "left"   },
      { header: "ราคา/หน่วย", key: "sellPrice",    align: "right"  },
      { header: "มูลค่ารวม",  key: "value",        align: "right"  },
    ];
    const rows = data.groups.flatMap(g =>
      g.items.map(it => ({
        category:     g.category,
        name:         it.name,
        currentStock: it.currentStock.toLocaleString(),
        unit:         it.unit,
        sellPrice:    fmtBaht(it.sellPrice),
        value:        fmtBaht(it.value),
      }))
    );
    printWarehouseReport({
      reportTitle: "รายงานมูลค่าสต็อกรวม",
      filterSummary: `มูลค่ารวม ฿${fmtBaht(data.grandTotal)}`,
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
          <h1 className="text-2xl font-bold text-slate-900">รายงานมูลค่าสต็อกรวม</h1>
          <p className="text-sm text-slate-500 mt-0.5">มูลค่าพัสดุคงคลังแยกตามหมวดหมู่</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm col-span-2">
          <p className="text-sm text-slate-500 mb-1">มูลค่าสต็อกรวมทั้งหมด</p>
          <p className="text-3xl font-bold text-[#0786F5]">฿{fmtBaht(data?.grandTotal ?? 0)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-slate-500 mb-1">จำนวนรายการพัสดุ</p>
          <p className="text-2xl font-bold text-slate-700">{(data?.totalItems ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <button onClick={handlePdf} className="px-4 py-2 text-sm font-medium bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors">
          พิมพ์ PDF
        </button>
      </div>

      {/* Groups */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">กำลังโหลด...</div>
      ) : !data || data.groups.length === 0 ? (
        <div className="py-16 text-center text-slate-400">ไม่พบข้อมูล</div>
      ) : (
        <div className="space-y-3">
          {data.groups.map(group => {
            const expanded = expandedCats.has(group.category);
            const pct = data.grandTotal > 0 ? (group.totalValue / data.grandTotal) * 100 : 0;
            return (
              <div key={group.category} className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleCat(group.category)}
                  className="w-full flex items-center gap-4 px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold text-slate-900">{group.category}</span>
                      <span className="text-xs text-slate-500">{group.items.length} รายการ</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0786F5] rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right mr-4">
                    <p className="text-sm text-slate-500">มูลค่ารวม</p>
                    <p className="font-bold text-slate-900">฿{fmtBaht(group.totalValue)}</p>
                    <p className="text-xs text-slate-400">{pct.toFixed(1)}%</p>
                  </div>
                  {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>

                {/* Items table */}
                {expanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white border-y border-slate-100">
                        <tr>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">ชื่อพัสดุ</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">สต็อก</th>
                          <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">หน่วย</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">ราคา/หน่วย</th>
                          <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">มูลค่ารวม</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {group.items.map(it => (
                          <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-2.5">
                              <p className="font-medium text-slate-800">{it.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{it.code}</p>
                            </td>
                            <td className="px-5 py-2.5 text-right text-slate-700">{it.currentStock.toLocaleString()}</td>
                            <td className="px-5 py-2.5 text-slate-500">{it.unit}</td>
                            <td className="px-5 py-2.5 text-right text-slate-600">฿{fmtBaht(it.sellPrice)}</td>
                            <td className="px-5 py-2.5 text-right font-semibold text-[#0786F5]">฿{fmtBaht(it.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200">
                        <tr>
                          <td colSpan={4} className="px-5 py-2.5 font-semibold text-slate-700 text-right">รวม {group.category}</td>
                          <td className="px-5 py-2.5 text-right font-bold text-[#0786F5]">฿{fmtBaht(group.totalValue)}</td>
                        </tr>
                      </tfoot>
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
