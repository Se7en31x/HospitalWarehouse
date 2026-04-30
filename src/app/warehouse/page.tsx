"use client";

import { useEffect, useState } from "react";
import {
  Package,
  AlertCircle,
  BarChart3,
  ChevronDown,
  CalendarDays,
  Layers,
  CalendarClock,
  CalendarX,
  ClipboardList,
  PackageMinus,
  Building2,
  Truck,
  ArrowDownToLine,
} from "lucide-react";
import {
  getDashboardAnalytics,
  type DashboardSummary,
  type WeeklyRequisition,
  type MonthlyRequisition,
  type LotStats,
} from "@/services/dashboardService";
import { fmtDateLong } from "@/utils/dateUtils";

export default function WarehouseDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [nearExpiryCount, setNearExpiryCount] = useState<number>(0);
  const [expiredCount, setExpiredCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [stockInThisMonth, setStockInThisMonth] = useState<number>(0);
  const [weeklyData, setWeeklyData] = useState<WeeklyRequisition[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRequisition[]>([]);
  const [yearlyData, setYearlyData] = useState<MonthlyRequisition[]>([]);
  const [lotStats, setLotStats] = useState<LotStats | null>(null);
  const [chartMode, setChartMode] = useState<"week" | "month" | "year">("week");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");
  const [isChartTypeOpen, setIsChartTypeOpen] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; series: "total" | "withdraw" } | null>(null);
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
          months: 60,
          topItems: 5,
          expiringLimit: 20,
        });

        // ตรวจสอบว่ามีข้อมูลกลับมาจริงหรือไม่
        if (!analytics) throw new Error("ไม่ได้รับข้อมูลจากเซิร์ฟเวอร์");

        setSummary({
          totalItems: analytics.summary?.totalItems ?? 0,
          totalDepartments: analytics.summary?.totalDepartments ?? 0,
          totalSuppliers: analytics.summary?.totalSuppliers ?? 0,
          totalUsers: analytics.summary?.totalUsers ?? 0,
        });

        setLotStats({
          total: analytics.lotHealth?.totalLots ?? 0,
          normal: analytics.lotHealth?.normalLots ?? 0,
          belowMinimum: analytics.lotHealth?.belowMinimumLots ?? 0,
          nearExpiry: analytics.lotHealth?.nearExpiryLots ?? 0,
        });

        setNearExpiryCount(analytics.lotHealth?.nearExpiryLots ?? 0);
        setExpiredCount(analytics.expiry?.expiredLots ?? 0);
        setLowStockCount(analytics.lowStock?.lowStockItems ?? 0);
        setStockInThisMonth(analytics.stockIn?.thisMonth?.total ?? 0);
        setWeeklyData(analytics.weeklyRequisitions || []);

        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const monthlyRaw = analytics.monthlyRequisitions || [];
        const monthlyWithLabels: MonthlyRequisition[] = monthlyRaw.map((m) => {
          const [y, mm] = String(m.month).split("-");
          const monthIndex = Math.max(0, Math.min(11, Number(mm) - 1));
          const thaiYear = (Number(y) + 543).toString().slice(-2);
          return { ...m, label: `${monthNames[monthIndex]} ${thaiYear}` };
        });
        setMonthlyData(monthlyWithLabels.slice(-6));

        // รวมข้อมูลรายเดือนเป็นรายปี
        const yearlyBuckets: Record<string, MonthlyRequisition> = {};
        for (const m of monthlyRaw) {
          const year = String(m.month).split("-")[0];
          if (!yearlyBuckets[year]) {
            yearlyBuckets[year] = {
              month: year,
              label: `ปี ${Number(year) + 543}`,
              withdraw: 0,
              borrow: 0,
              total: 0,
            };
          }
          yearlyBuckets[year].withdraw += m.withdraw ?? 0;
          yearlyBuckets[year].borrow += m.borrow ?? 0;
          yearlyBuckets[year].total += m.total ?? 0;
        }
        // ให้แสดงย้อนหลัง 5 ปีเสมอ (ปีที่ไม่มีข้อมูล = 0)
        const currentYear = new Date().getFullYear();
        const fiveYearData: MonthlyRequisition[] = Array.from({ length: 5 }, (_, idx) => {
          const year = String(currentYear - 4 + idx);
          const bucket = yearlyBuckets[year];
          return bucket ?? {
            month: year,
            label: `ปี ${Number(year) + 543}`,
            withdraw: 0,
            borrow: 0,
            total: 0,
          };
        });
        setYearlyData(fiveYearData);
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

  useEffect(() => {
    if (!isChartTypeOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-filter-chart-type]")) {
        setIsChartTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isChartTypeOpen]);

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

  const chartData = chartMode === "week" ? weeklyData : chartMode === "month" ? monthlyData : yearlyData;
  const maxChartTotal = Math.max(...chartData.map((d) => d.total), 1);

  const weekDayLabels = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const weekdayIndex = (d.getDay() + 6) % 7;
    const weekday = weekDayLabels[weekdayIndex];
    const dayMonth = d.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
    return `${weekday} ${dayMonth}`;
  };

  const getNiceYAxis = (maxValue: number) => {
    const safeMax = Math.max(1, maxValue);
    const paddedMax = safeMax * 1.2; // เว้นหัวกราฟเล็กน้อย
    const rawStep = paddedMax / 5; // แบ่งเป็น 5 ช่วงหลัก (รวม 6 tick)
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const normalized = rawStep / magnitude;

    let niceNormalized = 1;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;

    const step = niceNormalized * magnitude;
    const yMax = step * 5;
    const ticks = Array.from({ length: 6 }, (_, i) => i * step);
    return { yMax, ticks };
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6 bg-[#f5f5f5] min-h-screen animate-pulse">
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
  const lotNormal = lotStats?.normal ?? Math.max(0, lotTotal - lotBelowMin - lotNearExp);

  const lotSegments = [
    { label: "ใช้งานได้", value: lotNormal, color: "bg-blue-500", textColor: "text-blue-600", stroke: "#3b82f6" },
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

  const dashboardStatCards = [
    {
      label: "จำนวนสินค้าทั้งหมด",
      value: summary?.totalItems ?? 0,
      icon: <Package className="w-9 h-9" />,
      tone: "from-slate-700 to-slate-800",
    },
    {
      label: "จำนวนล็อตทั้งหมด",
      value: lotStats?.total ?? 0,
      icon: <Layers className="w-9 h-9" />,
      tone: "from-blue-700 to-indigo-800",
    },
    {
      label: "ล็อตใกล้หมดอายุ",
      value: nearExpiryCount,
      icon: <CalendarClock className="w-9 h-9" />,
      tone: "from-amber-600 to-orange-700",
    },
    {
      label: "ล็อตหมดอายุแล้ว",
      value: expiredCount,
      icon: <CalendarX className="w-9 h-9" />,
      tone: "from-rose-700 to-red-800",
    },
    {
      label: "เบิกพัสดุรายสัปดาห์",
      value: currentWeekTotal,
      icon: <ClipboardList className="w-9 h-9" />,
      tone: "from-emerald-700 to-teal-800",
    },
    {
      label: "สินค้าสต็อกต่ำ",
      value: lowStockCount,
      icon: <PackageMinus className="w-9 h-9" />,
      tone: "from-orange-700 to-amber-800",
    },
    {
      label: "จำนวนแผนกทั้งหมด",
      value: summary?.totalDepartments ?? 0,
      icon: <Building2 className="w-9 h-9" />,
      tone: "from-cyan-700 to-sky-800",
    },
    {
      label: "จำนวนผู้จำหน่ายทั้งหมด",
      value: summary?.totalSuppliers ?? 0,
      icon: <Truck className="w-9 h-9" />,
      tone: "from-indigo-700 to-violet-800",
    },
    {
      label: "รับเข้าเดือนนี้",
      value: stockInThisMonth,
      icon: <ArrowDownToLine className="w-9 h-9" />,
      tone: "from-blue-600 to-indigo-700",
    },
  ];

  return (
    <div className="space-y-6 p-6 bg-[#f5f5f5] min-h-screen">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-300 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">แดชบอร์ดคลังพัสดุ</h2>
          <p className="text-xs text-slate-500 mt-0.5">ภาพรวมข้อมูลสินค้า ล็อต และสถิติการเบิกพัสดุ</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">
          <CalendarDays className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-slate-700">
            {fmtDateLong(new Date())}
          </span>
        </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {dashboardStatCards.map((card) => (
          <div
            key={card.label}
            className="overflow-hidden rounded-lg border border-slate-200 shadow-sm bg-white"
          >
            <div className={`bg-gradient-to-br ${card.tone} p-4 text-white min-h-[110px]`}>
              <div className="flex items-start justify-between gap-2">
                <div className="rounded-full bg-white/25 p-2.5 text-white">
                  {card.icon}
                </div>
                <p className="text-4xl font-bold leading-none text-white">{card.value.toLocaleString()}</p>
              </div>
              <p className="mt-3 text-sm text-white/95 font-medium leading-tight text-right">{card.label}</p>
            </div>
          </div>
        ))}
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
        {/* สถิติการเบิกพัสดุ — bar / line */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-7 flex flex-col">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              สถิติการเบิกพัสดุ
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {/* ประเภทกราฟ */}
              <div className="relative" data-filter-chart-type>
                <button
                  type="button"
                  onClick={() => setIsChartTypeOpen((prev) => !prev)}
                  className="flex items-center gap-2 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-white hover:border-slate-400 transition-colors shadow-sm w-[200px] justify-between"
                >
                  <span className="text-slate-800 font-medium">
                    {chartType === "bar" ? "📊 กราฟแท่ง" : "📈 กราฟเส้น (คลื่น)"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isChartTypeOpen ? "rotate-180" : ""}`} />
                </button>
                {isChartTypeOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-30 min-w-full overflow-hidden">
                    <ul className="py-1">
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setChartType("bar");
                            setIsChartTypeOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${chartType === "bar" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                        >
                          📊 กราฟแท่ง
                        </button>
                      </li>
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setChartType("line");
                            setIsChartTypeOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${chartType === "line" ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700 hover:bg-slate-50"}`}
                        >
                          📈 กราฟเส้น (คลื่น)
                        </button>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              {/* ช่วงเวลา */}
              <div className="flex bg-slate-100 rounded-lg p-0.5">
                <button
                  onClick={() => setChartMode("week")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "week" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  รายสัปดาห์
                </button>
                <button
                  onClick={() => setChartMode("month")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "month" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  รายเดือน
                </button>
                <button
                  onClick={() => setChartMode("year")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${chartMode === "year" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  รายปี
                </button>
              </div>
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูลการเบิก</div>
          ) : chartType === "bar" ? (
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
          ) : (
            /* ---- Line / Wave Chart (SVG) ---- */
            (() => {
              // ปรับ ratio ของ viewBox ให้กว้างขึ้น เพื่อให้กราฟกินพื้นที่เต็มการ์ดมากขึ้น
              const svgW = 980, svgH = 280;
              const padL = 46, padR = 16, padT = 24, padB = 58;
              const plotW = svgW - padL - padR;
              const plotH = svgH - padT - padB;
              const n = chartData.length;

              const getX = (i: number) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
              const { yMax, ticks } = getNiceYAxis(maxChartTotal);
              const getY = (val: number) => padT + (1 - val / yMax) * plotH;

              const totalPts = chartData.map((d, i) => ({ x: getX(i), y: getY(d.total), d }));
              const withdrawPts = chartData.map((d, i) => ({ x: getX(i), y: getY(d.withdraw), d }));

              const smoothPath = (pts: { x: number; y: number }[]) => {
                if (pts.length === 0) return "";
                if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
                return pts.reduce((acc, pt, i) => {
                  if (i === 0) return `M ${pt.x} ${pt.y}`;
                  const prev = pts[i - 1];
                  const cpx = (prev.x + pt.x) / 2;
                  return `${acc} C ${cpx} ${prev.y} ${cpx} ${pt.y} ${pt.x} ${pt.y}`;
                }, "");
              };

              const totalLinePath = smoothPath(totalPts);
              const withdrawLinePath = smoothPath(withdrawPts);
              const xTicks = chartData.map((_, i) => getX(i));
              const activeIdx = hoveredPoint !== null && hoveredPoint.index < chartData.length ? hoveredPoint.index : null;
              const activeSeries = hoveredPoint?.series ?? null;
              const activePoint = activeIdx !== null
                ? (activeSeries === "withdraw" ? withdrawPts[activeIdx] : totalPts[activeIdx])
                : null;
              const activeLabel = activeIdx !== null
                ? ("weekStart" in chartData[activeIdx] ? formatDate(chartData[activeIdx].weekStart) : chartData[activeIdx].label)
                : "";
              const activeValue = activeIdx !== null
                ? (activeSeries === "withdraw" ? chartData[activeIdx].withdraw : chartData[activeIdx].total)
                : 0;
              const activeValueColor = activeSeries === "withdraw" ? "#16a34a" : "#0284c7";
              const tooltipWidth = 156;
              const tooltipHeight = 36;
              const tooltipX = activePoint
                ? Math.min(Math.max(activePoint.x - tooltipWidth / 2, padL), svgW - padR - tooltipWidth)
                : 0;
              const tooltipY = activePoint ? Math.max(padT + 8, activePoint.y - 52) : 0;

              // Y ticks คำนวณอัตโนมัติจากข้อมูลจริง
              const yTicks = ticks.map((val) => ({ y: getY(val), val }));

              return (
                <div className="w-full">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    preserveAspectRatio="xMidYMid meet"
                    width="100%"
                    height="280"
                    style={{ display: "block" }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Vertical grid */}
                    {xTicks.map((x, i) => (
                      <line
                        key={`x-${i}`}
                        x1={x}
                        y1={padT}
                        x2={x}
                        y2={padT + plotH}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                        strokeDasharray="2 4"
                      />
                    ))}

                    {/* Grid lines + Y labels */}
                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line x1={padL} y1={t.y} x2={svgW - padR} y2={t.y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="2 4" />
                        <text x={padL - 7} y={t.y + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{t.val}</text>
                      </g>
                    ))}

                    {/* Withdraw line (dashed green) */}
                    <path d={withdrawLinePath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" />

                    {/* Total line (soft gray like sample) */}
                    <path d={totalLinePath} fill="none" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />

                    {/* Withdraw dots */}
                    {withdrawPts.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={activeIdx === i && activeSeries === "withdraw" ? "5" : "3.8"}
                        fill="white"
                        stroke="#22c55e"
                        strokeWidth={activeIdx === i && activeSeries === "withdraw" ? "2.4" : "1.8"}
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint({ index: i, series: "withdraw" })}
                      >
                        <title>{("weekStart" in chartData[i] ? formatDate((chartData[i] as any).weekStart) : (chartData[i] as any).label)} — เบิกใช้: {chartData[i].withdraw}</title>
                      </circle>
                    ))}

                    {/* Total dots + X labels */}
                    {totalPts.map((pt, i) => {
                      const label = "weekStart" in chartData[i]
                        ? formatDate((chartData[i] as any).weekStart)
                        : (chartData[i] as any).label;
                      return (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={activeIdx === i && activeSeries === "total" ? "7" : "6"}
                            fill="#0ea5e9"
                            stroke="white"
                            strokeWidth={activeIdx === i && activeSeries === "total" ? "3.2" : "2.4"}
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredPoint({ index: i, series: "total" })}
                          >
                            <title>{label}: {chartData[i].total} รายการ</title>
                          </circle>
                          <text
                            x={pt.x}
                            y={padT + plotH + 18}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#64748b"
                          >
                            {label}
                          </text>
                        </g>
                      );
                    })}

                    {activePoint ? (
                      <g>
                        <rect
                          x={tooltipX}
                          y={tooltipY}
                          width={tooltipWidth}
                          height={tooltipHeight}
                          rx="8"
                          fill="white"
                          stroke="#e2e8f0"
                          strokeWidth="1"
                          style={{ filter: "drop-shadow(0 6px 14px rgba(15,23,42,0.12))" }}
                        />
                        <text x={tooltipX + 10} y={tooltipY + 23} fontSize="11" fill="#64748b">
                          {activeLabel}
                        </text>
                        <text x={tooltipX + tooltipWidth - 10} y={tooltipY + 23} textAnchor="end" fontSize="15" fontWeight="500" fill={activeValueColor}>
                          {activeValue}
                        </text>
                      </g>
                    ) : null}
                  </svg>
                  <div className="flex justify-center gap-6 mt-4 text-xs font-normal text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-8 h-0.5 bg-slate-300 rounded" /> รวมทั้งหมด</div>
                    <div className="flex items-center gap-2">
                      <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#22c55e" strokeWidth="2" strokeDasharray="5 3" /></svg>
                      เบิกใช้ (Withdraw)
                    </div>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}