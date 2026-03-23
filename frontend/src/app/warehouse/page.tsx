"use client";

import { useEffect, useState } from "react";
import {
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  CalendarDays,
  ArrowRight,
  PieChart,
  FileText,
  Layers,
} from "lucide-react";
import {
  getDashboardSummary,
  getExpiringLots,
  getWeeklyRequisitions,
  getMonthlyRequisitions,
  getLotStats,
  type DashboardSummary,
  type ExpiringLot,
  type WeeklyRequisition,
  type MonthlyRequisition,
  type LotStats,
} from "@/services/dashboardService";
import { getRequisitionReports, type RequisitionReport } from "@/services/reportService";

export default function WarehouseDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [expiringLots, setExpiringLots] = useState<ExpiringLot[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyRequisition[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyRequisition[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionReport[]>([]);
  const [lotStats, setLotStats] = useState<LotStats | null>(null);
  const [chartMode, setChartMode] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryData, lotsData, weeklyRes, monthlyRes, reqData, lotStatsData] =
          await Promise.all([
            getDashboardSummary(),
            getExpiringLots(90),
            getWeeklyRequisitions(),
            getMonthlyRequisitions(6),
            getRequisitionReports(),
            getLotStats(90),
          ]);
        setSummary(summaryData);
        setExpiringLots(lotsData);
        setWeeklyData(weeklyRes);
        setMonthlyData(monthlyRes);
        setRequisitions(reqData);
        setLotStats(lotStatsData);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = chartMode === "week" ? weeklyData : monthlyData;
  const maxChartTotal = Math.max(...chartData.map((d) => d.total), 1);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  // --- Derived stats from requisitions ---
  const totalReqs = requisitions.length;
  const pendingReqs = requisitions.filter((r) => r.status === "PENDING").length;
  const approvedReqs = requisitions.filter((r) => r.status === "APPROVED" || r.status === "COMPLETED").length;
  const rejectedReqs = requisitions.filter((r) => r.status === "REJECTED" || r.status === "CANCELLED").length;

  // --- Weekly total ---
  const currentWeekTotal = weeklyData.length > 0 ? weeklyData[weeklyData.length - 1].total : 0;

  // --- Donut: type breakdown ---
  const withdrawCount = requisitions.filter((r) => r.reportNo?.startsWith("REQ")).length || 
    requisitions.length - requisitions.filter((r) => r.reportNo?.startsWith("BOR")).length;
  const borrowCount = requisitions.filter((r) => r.reportNo?.startsWith("BOR")).length;
  const withdrawPct = totalReqs > 0 ? Math.round((withdrawCount / totalReqs) * 100) : 0;
  const borrowPct = totalReqs > 0 ? Math.round((borrowCount / totalReqs) * 100) : 0;

  // --- Donut SVG arcs ---
  const donutRadius = 15.915;
  const donutCircumference = 2 * Math.PI * donutRadius; // ≈ 100

  // --- Top items by frequency ---
  const itemFreq: Record<string, { name: string; count: number; unit: string }> = {};
  for (const req of requisitions) {
    for (const item of req.items || []) {
      const key = item.itemCode || item.itemName;
      if (!itemFreq[key]) {
        itemFreq[key] = { name: item.itemName, count: 0, unit: item.unit };
      }
      itemFreq[key].count += item.quantity;
    }
  }
  const topItems = Object.values(itemFreq)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3">
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
          <p className="text-2xl font-bold text-amber-600">{expiringLots.length.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">ล็อตใกล้หมดอายุ</p>
        </div>

        {/* สถิติการเบิกพัสดุรายสัปดาห์ */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg w-fit mb-2"><TrendingUp className="w-4 h-4" /></div>
          <p className="text-2xl font-bold text-slate-800">{currentWeekTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-500 font-medium mt-0.5">เบิกพัสดุรายสัปดาห์</p>
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
      </div>

      {/* 3. Lot Overview, Requisitions & Top 5 Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Lot Overview Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
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

        {/* Recent Requisitions Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              รายการคำขอเบิก - ยืม
            </h3>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-semibold border border-blue-100">
              {requisitions.length} รายการ
            </span>
          </div>
          {requisitions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีรายการคำขอ</div>
          ) : (
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {requisitions.slice(0, 10).map((req) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                  DRAFT: { label: "แบบร่าง", color: "bg-slate-100 text-slate-600" },
                  PENDING: { label: "รออนุมัติ", color: "bg-amber-100 text-amber-700" },
                  APPROVED: { label: "อนุมัติแล้ว", color: "bg-emerald-100 text-emerald-700" },
                  REJECTED: { label: "ปฏิเสธ", color: "bg-red-100 text-red-700" },
                  COMPLETED: { label: "เสร็จสิ้น", color: "bg-blue-100 text-blue-700" },
                  CANCELLED: { label: "ยกเลิก", color: "bg-slate-100 text-slate-500" },
                };
                const st = statusMap[req.status] || { label: req.status, color: "bg-slate-100 text-slate-600" };
                return (
                  <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{req.reportNo}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{req.department} &middot; {req.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top 5 เบิกบ่อยสุด */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">Top 5 เบิกบ่อยสุด</h3>
          </div>
          {topItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="space-y-3 flex-1">
              {topItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 line-clamp-1">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.count.toLocaleString()} {item.unit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Bar Chart - สถิติการเบิกพัสดุ */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              สถิติการเบิกพัสดุ
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartMode("week")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartMode === "week" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                รายสัปดาห์
              </button>
              <button
                onClick={() => setChartMode("month")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  chartMode === "month" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
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
                  const label = "weekStart" in item ? formatDate(item.weekStart) : (item as MonthlyRequisition).label;
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

        {/* Right Column - Donut Chart */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-blue-600" />
                ประเภทการทำรายการ
              </h3>
            </div>
            <div className="flex flex-col items-center justify-center flex-1">              <div className="relative w-40 h-40">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-sm">
                  <circle cx="18" cy="18" r={donutRadius} fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                  <circle cx="18" cy="18" r={donutRadius} fill="transparent" stroke="#3b82f6" strokeWidth="4"
                    strokeDasharray={`${withdrawPct} ${100 - withdrawPct}`} strokeDashoffset="0"
                    className="transition-all duration-1000 ease-out" />
                  <circle cx="18" cy="18" r={donutRadius} fill="transparent" stroke="#10b981" strokeWidth="4"
                    strokeDasharray={`${borrowPct} ${100 - borrowPct}`} strokeDashoffset={`${-withdrawPct}`}
                    className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-slate-800">{totalReqs}</span>
                  <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">รายการ</span>
                </div>
              </div>
              <div className="w-full mt-6 space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" /><span className="text-slate-600 font-medium">เบิกพัสดุ</span></div>
                  <span className="font-bold text-slate-800">{withdrawPct}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" /><span className="text-slate-600 font-medium">ยืมพัสดุ</span></div>
                  <span className="font-bold text-slate-800">{borrowPct}%</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}