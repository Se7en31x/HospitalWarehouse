"use client";

import * as React from "react";

const { useEffect, useState } = React;

/** React 19.2+ exports Activity at runtime; some Next/Turbopack chunks reference it from this module scope. */
type ActivityProps = { mode?: "visible" | "hidden"; children?: React.ReactNode };
type ReactWithActivity = typeof React & { Activity: React.ComponentType<ActivityProps> };
const Activity = (React as ReactWithActivity).Activity;
void Activity;
import type { LucideIcon } from "lucide-react";
import {
  Package,
  AlertCircle,
  BarChart3,
  CalendarDays,
  Layers,
  CalendarClock,
  CalendarX,
  ClipboardList,
  PackageMinus,
  Truck,
  ArrowDownToLine,
  Loader2,
  PieChart as PieIcon,
} from "lucide-react";
import {
  getDashboardAnalytics,
  type DashboardSummary,
  type WeeklyRequisition,
  type MonthlyRequisition,
  type LotStats,
} from "@/services/dashboardService";
import { fmtDateLong } from "@/utils/dateUtils";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
  type PieLabelRenderProps,
  type PieSectorDataItem,
} from "recharts";

function LotPieTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0];
  const name = row.name ?? "";
  const value = Number(row.value ?? 0);
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-xl text-sm">
      <p className="font-bold text-slate-800">{name}</p>
      <p className="text-slate-600 tabular-nums mt-0.5">
        {value.toLocaleString()} <span className="text-slate-400 font-medium">({pct}%)</span>
      </p>
    </div>
  );
}

function LotPiePercentLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
  if (percent < 0.035 || cx == null || cy == null) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={700}
      style={{ textShadow: "0 1px 2px rgb(0 0 0 / 40%)" }}
    >
      {(percent * 100).toFixed(1)}%
    </text>
  );
}

function LotPieActiveShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius = 0, outerRadius = 0, startAngle, endAngle, fill = "#94a3b8" } = props;
  if (cx == null || cy == null || startAngle == null || endAngle == null) return null;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      stroke="#bae6fd"
      strokeWidth={4}
      style={{ filter: "drop-shadow(0 2px 8px rgb(59 130 246 / 35%))" }}
    />
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconBg,
  valueClass = "text-gray-900",
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  sub?: string;
  iconBg: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 flex items-center gap-4 min-h-[5.5rem]">
      <div className={`${iconBg} w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 shadow-md`}>
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm text-gray-500 font-medium truncate">{label}</p>
        <p className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${valueClass}`}>
          {value.toLocaleString()}
        </p>
        {sub ? <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 truncate">{sub}</p> : null}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  iconColor,
  toolbar,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col min-h-0">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} strokeWidth={2} />
          {title}
        </h2>
        {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all ${
            value === opt.id ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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
  const [hoveredPoint, setHoveredPoint] = useState<{ index: number; series: "total" | "withdraw" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const currentYear = new Date().getFullYear();
        const fiveYearData: MonthlyRequisition[] = Array.from({ length: 5 }, (_, idx) => {
          const year = String(currentYear - 4 + idx);
          const bucket = yearlyBuckets[year];
          return (
            bucket ?? {
              month: year,
              label: `ปี ${Number(year) + 543}`,
              withdraw: 0,
              borrow: 0,
              total: 0,
            }
          );
        });
        setYearlyData(fiveYearData);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล";
        console.error("Dashboard Error:", msg);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6 bg-slate-50">
        <div className="bg-white border border-red-100 shadow-lg shadow-red-100/50 p-8 rounded-2xl max-w-md text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">โหลดข้อมูลไม่สำเร็จ</h3>
          <p className="text-sm text-red-600 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold text-sm"
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
    const paddedMax = safeMax * 1.2;
    const rawStep = paddedMax / 5;
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
      <div className="space-y-6 pb-10 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 bg-slate-50 min-h-full w-full animate-pulse">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gray-200 shrink-0" />
            <div className="space-y-2 pt-1">
              <div className="h-7 sm:h-9 w-48 sm:w-64 bg-gray-200 rounded-lg" />
              <div className="h-4 w-full max-w-xl bg-gray-100 rounded" />
            </div>
          </div>
          <div className="h-10 w-44 rounded-xl bg-gray-100 border border-gray-200 shrink-0" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white border border-gray-100 shadow-sm" />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ภาพรวมล็อต — pie + legend */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 min-h-[340px]">
            <div className="h-5 w-44 bg-gray-200 rounded mb-6" />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ring-8 ring-gray-50" />
                <div className="h-4 w-36 bg-gray-100 rounded mt-4" />
              </div>
              <div className="flex flex-col gap-4 w-full sm:w-auto sm:min-w-[240px]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-md bg-gray-200 shrink-0" />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-44 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* สถิติการเบิก — หัวข้อ + แท่ง */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col min-h-[340px]">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
              <div className="h-5 w-48 bg-gray-200 rounded" />
              <div className="flex gap-2 shrink-0">
                <div className="h-8 w-[100px] bg-gray-100 rounded-lg" />
                <div className="h-8 w-[140px] bg-gray-100 rounded-lg" />
              </div>
            </div>
            <div className="flex-1 min-h-[260px] flex items-end justify-between gap-2 px-2 border-b border-gray-100 pb-3 mt-auto">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 max-w-[3rem] mx-auto bg-gray-100 rounded-t-lg"
                  style={{ height: `${28 + ((i * 13) % 65)}%` }}
                />
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="h-4 w-28 bg-gray-100 rounded" />
              <div className="h-4 w-28 bg-gray-100 rounded" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-2">
          <Loader2 className="w-5 h-5 animate-spin shrink-0" />
          กำลังโหลดแดชบอร์ด...
        </div>
      </div>
    );
  }

  const currentWeekTotal = weeklyData.reduce((sum, item) => sum + item.total, 0);

  const lotTotal = lotStats?.total ?? 0;
  const lotNearExp = lotStats?.nearExpiry ?? 0;
  const lotNormalActive = Math.max(0, lotTotal - expiredCount - lotNearExp);

  const lotSegments: { label: string; value: number; fill: string; textColor: string }[] = [
    { label: "พร้อมใช้งาน", value: lotNormalActive, fill: "#10b981", textColor: "text-emerald-700" },
    { label: "ใกล้หมดอายุ", value: lotNearExp, fill: "#f59e0b", textColor: "text-amber-700" },
    { label: "หมดอายุแล้ว", value: expiredCount, fill: "#ef4444", textColor: "text-red-700" },
  ];

  const pieTotal = lotNormalActive + lotNearExp + expiredCount;
  const pieData = lotSegments.filter((s) => s.value > 0);

  return (
    <div className="space-y-6 pb-10 px-3 sm:px-6 lg:px-8 py-4 sm:py-8 bg-slate-50 min-h-full w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-slate-800 flex items-center justify-center shadow-lg shadow-slate-200 shrink-0">
            <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 tracking-tight">ภาพรวมระบบคลังหลัก</h1>
            <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 max-w-xl">
              ภาพรวมสต็อก ล็อต การเบิก-ยืม และการรับเข้า — อัปเดตตามข้อมูลระบบปัจจุบัน
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
            <CalendarDays className="w-4 h-4 text-blue-600 shrink-0" strokeWidth={2} />
            <span className="text-xs sm:text-sm font-semibold text-blue-800">{fmtDateLong(new Date())}</span>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={Package}
          label="จำนวนพัสดุทั้งหมด"
          value={summary?.totalItems ?? 0}
          iconBg="bg-teal-500"
          valueClass="text-teal-800"
        />
        <StatCard
          icon={Layers}
          label="จำนวนล็อตทั้งหมด"
          value={lotStats?.total ?? 0}
          iconBg="bg-blue-500"
          valueClass="text-blue-800"
        />
        <StatCard
          icon={ClipboardList}
          label="เบิกพัสดุรายสัปดาห์"
          value={currentWeekTotal}
          sub="รวมเบิก + ยืมในช่วงที่แสดง"
          iconBg="bg-amber-500"
          valueClass="text-amber-800"
        />
        <StatCard
          icon={ArrowDownToLine}
          label="รับเข้าเดือนนี้"
          value={stockInThisMonth}
          iconBg="bg-emerald-500"
          valueClass="text-emerald-800"
        />
        <StatCard
          icon={CalendarClock}
          label="ล็อตใกล้หมดอายุ"
          value={nearExpiryCount}
          iconBg="bg-orange-500"
          valueClass="text-orange-800"
        />
        <StatCard icon={CalendarX} label="ล็อตหมดอายุแล้ว" value={expiredCount} iconBg="bg-rose-500" valueClass="text-rose-800" />
        <StatCard
          icon={PackageMinus}
          label="ยอกคงคลังต่ำกว่ากำหนด"
          value={lowStockCount}
          iconBg="bg-violet-600"
          valueClass="text-violet-900"
        />
        <StatCard
          icon={Truck}
          label="จำนวนผู้จำหน่ายทั้งหมด"
          value={summary?.totalSuppliers ?? 0}
          iconBg="bg-indigo-500"
          valueClass="text-indigo-900"
        />
      </div>

      {/* กราฟ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="ภาพรวมล็อตสินค้า" icon={PieIcon} iconColor="text-violet-500">
          {lotTotal <= 0 || pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[280px] text-gray-400 text-sm rounded-xl bg-gray-50 border border-dashed border-gray-200">
              ไม่มีข้อมูลล็อต
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
              <div className="relative w-full max-w-[300px] h-[280px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={118}
                      paddingAngle={3}
                      stroke="#fff"
                      strokeWidth={2}
                      labelLine={false}
                      activeShape={LotPieActiveShape}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={`lot-cell-${i}`} fill={entry.fill} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={(props) => (
                        <LotPieTooltip active={props.active} payload={props.payload as never} total={pieTotal} />
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black tabular-nums text-slate-800 leading-none">
                    {lotTotal.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 mt-1.5 font-medium tracking-wide uppercase">ล็อตทั้งหมด</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[240px] justify-center">
                {lotSegments.map((seg, i) => {
                  const pct = pieTotal > 0 ? ((seg.value / pieTotal) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="shrink-0 w-4 h-4 rounded-md shadow-sm" style={{ backgroundColor: seg.fill }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-tight ${seg.textColor}`}>{seg.label}</p>
                        <p className="text-xs text-gray-500 tabular-nums">
                          {seg.value.toLocaleString()} ล็อต · {pct}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="สถิติการเบิกพัสดุ"
          icon={BarChart3}
          iconColor="text-blue-600"
          toolbar={
            <>
              <ToggleGroup
                value={chartType}
                onChange={setChartType}
                options={[
                  { id: "bar", label: "แท่ง" },
                  { id: "line", label: "เส้น" },
                ]}
              />
              <ToggleGroup
                value={chartMode}
                onChange={setChartMode}
                options={[
                  { id: "week", label: "สัปดาห์" },
                  { id: "month", label: "เดือน" },
                  { id: "year", label: "ปี" },
                ]}
              />
            </>
          }
        >
          {chartData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-400 text-base rounded-xl bg-gray-50 border border-dashed border-gray-200">
              ยังไม่มีข้อมูลการเบิก
            </div>
          ) : chartType === "bar" ? (
            <>
              <div className="h-[300px] flex items-end justify-between gap-1.5 sm:gap-2 border-b border-gray-100 pb-2 px-1">
                {chartData.map((item, idx) => {
                  const heightPct = Math.max(5, (item.total / maxChartTotal) * 100);
                  const withdrawPct = item.total > 0 ? (item.withdraw / item.total) * 100 : 0;
                  const label = "weekStart" in item ? formatDate(item.weekStart) : item.label;
                  return (
                    <div key={idx} className="w-full flex flex-col items-center gap-2 group h-full justify-end min-w-0">
                      <div
                        className="w-full max-w-[2.75rem] sm:max-w-[3.25rem] bg-sky-50 group-hover:bg-sky-100/90 rounded-t-lg relative transition-colors"
                        style={{ height: `${heightPct}%` }}
                      >
                        <div className="absolute -top-9 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 bg-white/95 px-2 py-1 rounded-lg shadow-sm border border-gray-100">
                          {item.total} รายการ
                        </div>
                        <div
                          className="absolute bottom-0 w-full bg-teal-500 rounded-t-md transition-all shadow-inner"
                          style={{ height: `${withdrawPct}%` }}
                        />
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 font-semibold truncate max-w-full leading-tight text-center">
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-teal-500" /> เบิกใช้ (Withdraw)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-sky-100 border border-sky-200" /> ยืม (Borrow)
                </span>
              </div>
            </>
          ) : (
            (() => {
              const svgW = 980;
              const svgH = 330;
              const padL = 54;
              const padR = 18;
              const padT = 26;
              const padB = 76;
              const axisFont = 14;
              const xLabelFont = 13;
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
              const activeIdx =
                hoveredPoint !== null && hoveredPoint.index < chartData.length ? hoveredPoint.index : null;
              const activeSeries = hoveredPoint?.series ?? null;
              const activePoint =
                activeIdx !== null
                  ? activeSeries === "withdraw"
                    ? withdrawPts[activeIdx]
                    : totalPts[activeIdx]
                  : null;
              const activeLabel =
                activeIdx !== null
                  ? "weekStart" in chartData[activeIdx]
                    ? formatDate(chartData[activeIdx].weekStart)
                    : chartData[activeIdx].label
                  : "";
              const activeValue =
                activeIdx !== null
                  ? activeSeries === "withdraw"
                    ? chartData[activeIdx].withdraw
                    : chartData[activeIdx].total
                  : 0;
              const activeValueColor = activeSeries === "withdraw" ? "#0d9488" : "#64748b";
              const tooltipWidth = 188;
              const tooltipHeight = 48;
              const tooltipX = activePoint
                ? Math.min(Math.max(activePoint.x - tooltipWidth / 2, padL), svgW - padR - tooltipWidth)
                : 0;
              const tooltipY = activePoint ? Math.max(padT + 8, activePoint.y - 58) : 0;

              const yTicks = ticks.map((val) => ({ y: getY(val), val }));

              return (
                <div className="w-full">
                  <svg
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    preserveAspectRatio="xMidYMid meet"
                    width="100%"
                    height="280"
                    className="block"
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
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

                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line
                          x1={padL}
                          y1={t.y}
                          x2={svgW - padR}
                          y2={t.y}
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          strokeDasharray="2 4"
                        />
                        <text
                          x={padL - 10}
                          y={t.y + 5}
                          textAnchor="end"
                          fontSize={axisFont}
                          fill="#475569"
                          fontWeight="600"
                        >
                          {t.val}
                        </text>
                      </g>
                    ))}

                    <path d={withdrawLinePath} fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" />

                    <path d={totalLinePath} fill="none" stroke="#cbd5e1" strokeWidth="2.2" strokeLinecap="round" />

                    {withdrawPts.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={activeIdx === i && activeSeries === "withdraw" ? "5" : "3.8"}
                        fill="white"
                        stroke="#14b8a6"
                        strokeWidth={activeIdx === i && activeSeries === "withdraw" ? "2.4" : "1.8"}
                        className="cursor-pointer transition-all"
                        onMouseEnter={() => setHoveredPoint({ index: i, series: "withdraw" })}
                      >
                        <title>
                          {("weekStart" in chartData[i] ? formatDate(chartData[i].weekStart) : chartData[i].label)} — เบิกใช้:{" "}
                          {chartData[i].withdraw}
                        </title>
                      </circle>
                    ))}

                    {totalPts.map((pt, i) => {
                      const label =
                        "weekStart" in chartData[i] ? formatDate(chartData[i].weekStart) : chartData[i].label;
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
                            <title>
                              {label}: {chartData[i].total} รายการ
                            </title>
                          </circle>
                          <text
                            x={pt.x}
                            y={padT + plotH + 22}
                            textAnchor="middle"
                            fontSize={xLabelFont}
                            fill="#475569"
                            fontWeight="600"
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
                          rx="10"
                          fill="white"
                          stroke="#e5e7eb"
                          strokeWidth="1"
                          style={{ filter: "drop-shadow(0 8px 20px rgba(15,23,42,0.1))" }}
                        />
                        <text x={tooltipX + 14} y={tooltipY + 30} fontSize="13" fill="#475569" fontWeight="600">
                          {activeLabel}
                        </text>
                        <text
                          x={tooltipX + tooltipWidth - 14}
                          y={tooltipY + 30}
                          textAnchor="end"
                          fontSize="18"
                          fontWeight="700"
                          fill={activeValueColor}
                        >
                          {activeValue}
                        </text>
                      </g>
                    ) : null}
                  </svg>
                  <div className="flex justify-center gap-8 mt-4 text-sm text-gray-600 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-8 h-0.5 bg-slate-300 rounded" /> รวมทั้งหมด
                    </span>
                    <span className="flex items-center gap-2">
                      <svg width="24" height="8" aria-hidden>
                        <line x1="0" y1="4" x2="24" y2="4" stroke="#14b8a6" strokeWidth="2" strokeDasharray="5 3" />
                      </svg>
                      เบิกใช้ (Withdraw)
                    </span>
                  </div>
                </div>
              );
            })()
          )}
        </ChartCard>
      </div>
    </div>
  );
}
