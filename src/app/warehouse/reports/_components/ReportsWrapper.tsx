"use client";

import React, { useState } from "react";
import { type ReportPage } from "./ReportTypeSelector";
import RequisitionReportClient from "../_clients/requisition/RequisitionReportClient";
import StockBalanceReportClient from "../_clients/inventory/StockBalanceReportClient";
import ItemsReportClient from "../_clients/inventory/ItemsReportClient";
import LowStockReportClient from "../_clients/inventory/LowStockReportClient";
import AssetReportClient from "../_clients/assets/AssetReportClient";
import ReusableItemsReportClient from "../_clients/assets/ReusableItemsReportClient";
import InventoryBalanceReportClient from "../_clients/inventory/InventoryBalanceReportClient";
import ReceiveReportClient from "../_clients/receive/ReceiveReportClient";
import ItemRankingReportClient from "../_clients/inventory/ItemRankingReportClient";
import InventoryValueReportClient from "../_clients/inventory/InventoryValueReportClient";
import ExpiredLotsReportClient from "../_clients/inventory/ExpiredLotsReportClient";
import DeptConsumptionReportClient from "../_clients/requisition/DeptConsumptionReportClient";
import { type Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";
import { SECTION_THEME, type SectionTheme } from "./reportHeaderTheme";
import {
  Warehouse,
  PackagePlus,
  ArrowUpRight,
  FileBarChart,
  TrendingUp,
  Package,
  ArrowDownUp,
  FileText,
  FlaskConical,
  DollarSign,
  ClipboardCheck,
  BarChart3,
  Stethoscope,
  Cpu,
} from "lucide-react";

const BRAND = "#0055FF";

interface ReportsWrapperProps {
  initialReports: Report[];
  initialItems: UiItem[];
  initialLowStockItems: UiItem[];
  initialExpiringLots: ExpiringLot[];
  counts: {
    totalItems: number;
    totalRequisitions: number;
    totalReceives: number;
    totalStockOuts: number;
    totalStockBalance: number;
    totalExpiredLots: number;
    lowStockCount: number;
    nearExpiryCount: number;
  };
}

type CountKey = keyof ReportsWrapperProps["counts"] | null;

interface ReportDef {
  id: ReportPage;
  label: string;
  description: string;
  icon: React.ElementType;
  countKey: CountKey;
}

interface ReportGroup {
  title: string;
  sectionTheme: SectionTheme;
  reports: ReportDef[];
}

const reportGroups: ReportGroup[] = [
  {
    title: "คลังสินค้าและสต็อก",
    sectionTheme: "stock",
    reports: [
      {
        id: "all-items",
        label: "รายงานพัสดุทั้งหมด",
        description: "ดูรายการสินค้าทั้งหมดพร้อมตัวกรองหมวดหมู่และคลัง",
        icon: Package,
        countKey: "totalItems",
      },
      {
        id: "stock-balance",
        label: "รายงานความเคลื่อนไหวสต็อก",
        description: "ติดตามการเคลื่อนไหวสต็อกทั้งหมด รับเข้า จ่ายออก และปรับปรุง",
        icon: ArrowDownUp,
        countKey: null,
      },
      {
        id: "inventory-balance",
        label: "รายงานคงคลังรายคลัง",
        description: "สรุปสต็อกแยกตามคลัง พร้อมดูรายละเอียดสินค้าแต่ละคลัง",
        icon: Warehouse,
        countKey: null,
      },
      {
        id: "low-stock",
        label: "รายงานแจ้งเตือนสต็อก",
        description: "ดูสินค้าที่ต่ำกว่ากำหนด และล็อตที่ใกล้หมดอายุในหน้าเดียว",
        icon: FileText,
        countKey: "lowStockCount",
      },
      {
        id: "expired-lots",
        label: "รายงาน LOT หมดอายุ",
        description: "ตรวจสอบล็อตสินค้าที่หมดอายุแล้วหรือใกล้หมดอายุ",
        icon: FlaskConical,
        countKey: null,
      },
      {
        id: "item-ranking",
        label: "รายงานอันดับสินค้า",
        description: "จัดอันดับสินค้าตามปริมาณการเบิกจ่าย",
        icon: TrendingUp,
        countKey: null,
      },
      {
        id: "inventory-value",
        label: "รายงานมูลค่าคงคลัง",
        description: "สรุปมูลค่าสินค้าในคลังแยกตามหมวดหมู่และคลัง",
        icon: DollarSign,
        countKey: null,
      },
    ],
  },
  {
    title: "การรับสินค้าเข้าคลัง",
    sectionTheme: "inbound",
    reports: [
      {
        id: "receive-report",
        label: "รายงานการรับสินค้าเข้าคลัง",
        description: "ดูรายการรับสินค้าทั้งหมด พร้อมจำนวนในใบกำกับ จำนวนรับจริง และราคาต่อหน่วย",
        icon: PackagePlus,
        countKey: "totalReceives",
      },
    ],
  },
  {
    title: "การเบิกจ่ายและเบิกยืม",
    sectionTheme: "flow",
    reports: [
      {
        id: "requisition",
        label: "รายงานคำขอเบิก/ยืม",
        description: "แยกดูคำขอเบิกและยืมตามฟิลเตอร์สถานะ",
        icon: ClipboardCheck,
        countKey: "totalRequisitions",
      },
      {
        id: "dept-consumption",
        label: "รายงานการเบิกพัสดุรายแผนก",
        description: "สรุปปริมาณการเบิกสินค้าแยกตามแผนกในช่วงเวลาที่กำหนด",
        icon: BarChart3,
        countKey: null,
      },
    ],
  },
  {
    title: "ครุภัณฑ์",
    sectionTheme: "assets",
    reports: [
      {
        id: "assets",
        label: "รายงานครุภัณฑ์ภายในองค์กรณ์",
        description: "ตรวจสอบสถานะและที่ตั้งของครุภัณฑ์แยกตามแผนก",
        icon: Cpu,
        countKey: null,
      },
      {
        id: "reusable-items",
        label: "รายงานอุปกรณ์ทางการแพทย์",
        description: "ดูสถานะและสภาพอุปกรณ์ทางการแพทย์แยกตามแผนก",
        icon: Stethoscope,
        countKey: null,
      },
    ],
  },
];

const ReportsWrapper: React.FC<ReportsWrapperProps> = ({
  initialItems,
  initialLowStockItems,
  initialExpiringLots,
  counts,
}) => {
  const [selectedType, setSelectedType] = useState<ReportPage>("all");
  const [showSelector, setShowSelector] = useState(true);

  const handleSelectType = (type: ReportPage) => {
    setSelectedType(type);
    setShowSelector(false);
  };

  const handleBackToSelector = () => {
    setShowSelector(true);
  };

  const renderReportContent = () => {
    switch (selectedType) {
      case "all-items":
        return <ItemsReportClient onBack={handleBackToSelector} />;
      case "low-stock":
        return (
          <LowStockReportClient
            onBack={handleBackToSelector}
          />
        );
      case "requisition":
        return <RequisitionReportClient onBack={handleBackToSelector} />;
      case "stock-balance":
        return <StockBalanceReportClient onBack={handleBackToSelector} />;
      case "inventory-balance":
        return <InventoryBalanceReportClient onBack={handleBackToSelector} />;
      case "assets":
        return <AssetReportClient onBack={handleBackToSelector} />;
      case "reusable-items":
        return <ReusableItemsReportClient onBack={handleBackToSelector} />;
      case "receive-report":
        return <ReceiveReportClient onBack={handleBackToSelector} />;
      case "item-ranking":
        return <ItemRankingReportClient onBack={handleBackToSelector} />;
      case "inventory-value":
        return <InventoryValueReportClient onBack={handleBackToSelector} />;
      case "expired-lots":
        return <ExpiredLotsReportClient onBack={handleBackToSelector} />;
      case "dept-consumption":
        return <DeptConsumptionReportClient onBack={handleBackToSelector} />;
      default:
        return null;
    }
  };

  if (showSelector) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">

          <header className="mb-10 sm:mb-12">
            <div className="flex flex-col gap-6 rounded-2xl border border-slate-200/80 bg-white px-6 py-7 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between sm:py-8">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-[0_4px_14px_rgba(0,85,255,0.25)]"
                  style={{ backgroundColor: BRAND }}
                >
                  <FileBarChart className="h-7 w-7 text-white" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    คลังพัสดุ
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    รายงาน
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
                    เลือกประเภทรายงานด้านล่างเพื่อดูรายละเอียด ส่งออก หรือพิมพ์
                  </p>
                </div>
              </div>
              <div className="hidden h-px w-full bg-slate-100 sm:block sm:h-auto sm:w-px sm:self-stretch sm:bg-slate-200" aria-hidden />
              <div className="flex flex-wrap gap-3 text-xs text-slate-500 sm:max-w-[200px] sm:flex-col sm:text-sm">
                <span className="inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                  พร้อมตัวกรองและส่งออก PDF / Excel
                </span>
              </div>
            </div>
          </header>

          <div className="space-y-12 sm:space-y-16">
            {reportGroups.map((group) => {
              const st = SECTION_THEME[group.sectionTheme];
              return (
              <section key={group.title} className="scroll-mt-8">
                <div className={`mb-5 flex flex-col gap-3 border-b-2 pb-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between ${st.sectionRule}`}>
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-12 w-1.5 shrink-0 rounded-full bg-gradient-to-b ${st.rail} shadow-sm`}
                      aria-hidden
                    />
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                        {group.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.reports.length} รายงานในหมวดนี้
                      </p>
                    </div>
                  </div>
                  <span className={`w-fit rounded-lg px-2.5 py-1 text-xs font-semibold ${st.chip}`}>
                    {group.title.split("/")[0]}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                  {group.reports.map((report) => {
                    const Icon = report.icon;
                    const badge =
                      report.countKey !== null
                        ? counts[report.countKey as keyof typeof counts]
                        : undefined;

                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => handleSelectType(report.id)}
                        className={`group flex w-full items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition-all duration-200 sm:gap-5 sm:p-5 ${st.cardHover} hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0055FF]/35 focus-visible:ring-offset-2`}
                      >
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:h-16 sm:w-16 ${st.iconBox} ${st.iconFg} ${st.iconRing}`}
                        >
                          <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.35} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold leading-snug text-slate-900 transition-colors duration-150 group-hover:text-[#0055FF] sm:text-[1.05rem]">
                            {report.label}
                          </h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 line-clamp-2">
                            {report.description}
                          </p>
                          {badge !== undefined && badge > 0 && (
                            <div className="mt-3">
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600">
                                {badge.toLocaleString()} รายการ
                              </span>
                            </div>
                          )}
                        </div>

                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full text-slate-400 transition-colors duration-200 group-hover:bg-slate-50 group-hover:text-slate-600">
                          <ArrowUpRight className="h-5 w-5" strokeWidth={2.25} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return <div>{renderReportContent()}</div>;
};

export default ReportsWrapper;
