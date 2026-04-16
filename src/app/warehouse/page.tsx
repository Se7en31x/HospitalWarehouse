"use client";

import { useEffect, useState } from "react";
import {
  Package,
  TrendingUp,
  AlertCircle,
  BarChart3,
  CalendarDays,
  FileText,
  Layers,
} from "lucide-react";
import {
  getDashboardAnalytics,
  type DashboardSummary,
  type WeeklyRequisition,
  type MonthlyRequisition,
  type LotStats,
} from "@/services/dashboardService";

export default function WarehouseDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [nearExpiryCount, setNearExpiryCount] = useState<number>(0);
  const [expiredCount, setExpiredCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [stockInThisMonth, setStockInThisMonth] = useState<number>(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyRequisition[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRequisition[]>([]);
  const [lotStats, setLotStats] = useState<LotStats | null>(null);
  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // เพิ่ม state สำหรับเก็บ error message

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const analytics = await getDashboardAnalytics({
          expiryDays: 90,
          weeks: 4,
          months: 6,
          topItems: 5,
          expiringLimit: 20,
        });

        // ตรวจสอบว่ามีข้อมูลกลับมาจริงหรือไม่
        if (!analytics) throw new Error("ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์");

        setSummary({
          totalItems: analytics.summary?.totalItems ?? 0,
          totalItemLots: analytics.summary?.totalLots ?? 0,
          totalDepartments: analytics.summary?.totalDepartments ?? 0,
          totalSuppliers: analytics.summary?.totalSuppliers ?? 0,
          totalUsers: analytics.summary?.totalUsers ?? 0,
        });

        setLotStats({
          total: analytics.lotHealth?.totalLots ?? 0,
          belowMinimum: analytics.lotHealth?.belowMinimumLots ?? 0,
          nearExpiry: analytics.lotHealth?.nearExpiryLots ?? 0,
        });

        setNearExpiryCount(analytics.lotHealth?.nearExpiryLots ?? 0);
        setExpiredCount(analytics.expiry?.expiredLots ?? 0);
        setLowStockCount(analytics.lowStock?.lowStockItems ?? 0);
        setStockInThisMonth(analytics.stockIn?.thisMonth?.total ?? 0);
        setWeeklyData(analytics.weeklyRequisitions || []);

        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const monthlyWithLabels: MonthlyRequisition[] = (analytics.monthlyRequisitions || []).map((m) => {
          const [y, mm] = String(m.month).split("-");
          const monthIndex = Math.max(0, Math.min(11, Number(mm) - 1));
          const thaiYear = (Number(y) + 543).toString().slice(-2);
          return { ...m, label: `${monthNames[monthIndex]} ${thaiYear}` };
        });
        setMonthlyData(monthlyWithLabels);
      } catch (err: any) {
        // ปรับปรุงการแสดง Error ให้ละเอียดขึ้น
        const msg = err.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        console.error("Dashboard Error:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // --- UI สำหรับกรณี Error ---
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-red-800 mb-2">โหลดข้อมูลไม่สำเร็จ</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  const chartData = chartMode === "week" ? weeklyData : monthlyData;
  const maxChartTotal = Math.max(...chartData.map((d) => d.total), 1);

  const weekDayLabels = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdayIndex = (d.getDay() + 6) % 7;
    const weekday = weekDayLabels[weekdayIndex];
    const dayMonth = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
    return `${weekday} ${dayMonth}`;
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-white min-h-screen animate-pulse">
        {/* Header skeleton */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-lg" />
            <div className="h-4 w-72 bg-slate-100 rounded-lg" />
          </div>
          <div className="h-9 w-36 bg-slate-100 rounded-lg" />
        </div>

        {/* Stat cards skeleton — matches the 5-column grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200">
              <div className="w-8 h-8 bg-slate-100 rounded-lg mb-3" />
              <div className="h-7 w-16 bg-slate-200 rounded mb-1.5" />
              <div className="h-3 w-24 bg-slate-100 rounded" />
            </div>
          ))}
        </div>

        {/* Charts row skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 flex flex-col gap-4">
            <div className="h-5 w-36 bg-slate-200 rounded" />
            <div className="mx-auto w-40 h-40 bg-slate-100 rounded-full" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <div className="h-3 w-24 bg-slate-100 rounded" />
                    <div className="h-3 w-12 bg-slate-100 rounded" />
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200">
            <div className="flex justify-between mb-6">
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-8 w-32 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-[280px] flex items-end gap-2 px-2">
              {[60, 85, 45, 70, 55, 90, 65].map((pct, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 justify-end h-full">
                  <div
                    className="w-full bg-slate-100 rounded-t-md"
                    style={{ height: `${pct}%` }}
                  />
                  <div className="h-2 w-8 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Weekly total ---
  const currentWeekTotal = weeklyData.reduce((sum, item) => sum + item.total, 0);

  // --- Lot Overview Chart ---
  const lotTotal = lotStats?.total ?? 0;
  const lotBelowMin = lotStats?.belowMinimum ?? 0;
  const lotNearExp = lotStats?.nearExpiry ?? 0;
  const lotNormal = Math.max(0, lotTotal - lotBelowMin - lotNearExp);

  const lotSegments = [
    { label: "ปกติ", value: lotNormal, color: "bg-blue-500", textColor: "text-blue-600", stroke: "#3b82f6" },
    { label: "ต่ำกว่าจุดต่ำสุด", value: lotBelowMin, color: "bg-red-500", textColor: "text-red-600", stroke: "#ef4444" },
    { label: "ใกล้หมดอายุ", value: lotNearExp, color: "bg-amber-500", textColor: "text-amber-600", stroke: "#f59e0b" },
  ];

  const lotRadius = 70;
  const lotCircumference = 2 * Math.PI * lotRadius;
  let lotOffset = 0;
  const lotArcs = lotTotal > 0
    ? lotSegments.map((seg) => {
      const pct = seg.value / lotTotal;
      const dashLength = pct * lotCircumference;
      const arc = { ...seg, pct, dashLength, dashOffset: lotOffset };
      lotOffset += dashLength;
      return arc;
    })
    : [];

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">แดชบอร์ดคลังพัสดุ</h2>
          <p className="text-sm text-slate-500 mt-1">ภาพรวมข้อมูลสินค้า ล็อต และสถิติการเบิกพัสดุ</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* จำนวนสินค้าทั้งหมด */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg w-fit mb-2"><Package className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{(summary?.totalItems ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">จำนวนสินค้าทั้งหมด</p>
        </div>

        {/* จำนวนล็อตสินค้าทั้งหมด */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-violet-100 text-violet-600 rounded-lg w-fit mb-2"><Layers className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{(summary?.totalItemLots ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">จำนวนล็อตสินค้า</p>
        </div>

        {/* จำนวนล็อตทั้งหมด */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg w-fit mb-2"><Package className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{(lotStats?.total ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">จำนวนล็อตทั้งหมด</p>
        </div>

        {/* ล็อตสินค้าใกล้หมดอายุ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-amber-100 text-amber-600 rounded-lg w-fit mb-2"><AlertCircle className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-amber-600">{nearExpiryCount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">ล็อตใกล้หมดอายุ</p>
        </div>

        {/* ล็อตหมดอายุแล้ว */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg w-fit mb-2"><AlertCircle className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-red-600">{expiredCount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">ล็อตหมดอายุแล้ว</p>
        </div>

        {/* สถิติการเบิกพัสดุรายสัปดาห์ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg w-fit mb-2"><TrendingUp className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{currentWeekTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">เบิกพัสดุรายสัปดาห์</p>
        </div>

        {/* สินค้าสต็อกต่ำ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg w-fit mb-2"><Package className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-orange-600">{lowStockCount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">สินค้าสต็อกต่ำ</p>
        </div>

        {/* จำนวนแผนกทั้งหมด */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg w-fit mb-2"><FileText className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{(summary?.totalDepartments ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">จำนวนแผนกทั้งหมด</p>
        </div>

        {/* จำนวนผู้จำหน่ายทั้งหมด */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-rose-100 text-rose-600 rounded-lg w-fit mb-2"><Package className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{(summary?.totalSuppliers ?? 0).toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">จำนวนผู้จำหน่ายทั้งหมด</p>
        </div>

        {/* รับเข้าเดือนนี้ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg w-fit mb-2"><Layers className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{stockInThisMonth.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">รับเข้าเดือนนี้</p>
        </div>
      </div>

      {/* 3. Lot Overview, Requisitions & Top 5 Row */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-stretch">
        {/* Lot Overview Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:col-span-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-500" />
              ภาพรวมล็อตสินค้า
            </h3>
          </div>
          <div className="flex flex-col items-center gap-6 flex-1">
            <div className="relative flex-shrink-0">
              <svg width="160" height="160" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r={lotRadius} fill="none" stroke="#f1f5f9" strokeWidth="24" />
                {lotArcs.map((arc, i) => (
                  <circle
                    key={i}
                    cx="100"
                    cy="100"
                    r={lotRadius}
                    fill="none"
                    stroke={arc.stroke}
                    strokeWidth="24"
                    strokeDasharray={`${arc.dashLength} ${lotCircumference - arc.dashLength}`}
                    strokeDashoffset={-arc.dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                    className="transition-all duration-700"
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{lotTotal.toLocaleString()}</span>
                <span className="text-xs text-slate-500 font-medium">ล็อตทั้งหมด</span>
              </div>
            </div>
            <div className="w-full space-y-3">
              {lotSegments.map((seg, i) => {
                const pct = lotTotal > 0 ? ((seg.value / lotTotal) * 100).toFixed(1) : "0.0";
                return (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${seg.color}`} />
                        <span className="text-sm font-medium text-slate-700">{seg.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${seg.textColor}`}>{seg.value.toLocaleString()}</span>
                        <span className="text-xs text-slate-400">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${seg.color} rounded-full transition-all duration-700`}
                        style={{ width: `${lotTotal > 0 ? (seg.value / lotTotal) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {/* Bar Chart - สถิติการเบิกพัสดุ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-7 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              สถิติการเบิกพัสดุ
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartMode("week")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "week" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                รายสัปดาห์
              </button>
              <button
                onClick={() => setChartMode("month")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "month" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                รายเดือน
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูลการเบิก</div>
          ) : (
            <>
              <div className="h-[280px] flex items-end justify-between gap-2 border-b border-slate-100 pb-2 px-2">
                {chartData.map((item, idx) => {
                  const heightPct = Math.max(5, (item.total / maxChartTotal) * 100);
                  const withdrawPct = item.total > 0 ? (item.withdraw / item.total) * 100 : 0;
                  const label = "weekStart" in item ? formatDate(item.weekStart) : item.label;
                  return (
                    <div key={idx} className="w-full flex flex-col items-center gap-2 group h-full justify-end">
                      <div
                        className="w-full max-w-[3rem] bg-blue-50 group-hover:bg-blue-100 rounded-t-md relative transition-colors"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {item.total} รายการ
                        </div>
                        <div
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t-sm transition-all shadow-[inset_0_-4px_0_rgba(0,0,0,0.1)]"
                          style={{ height: `${withdrawPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap mt-1">{label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-500 rounded-sm" /> เบิกใช้ (Withdraw)</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-100 rounded-sm" /> ยืม (Borrow)</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}