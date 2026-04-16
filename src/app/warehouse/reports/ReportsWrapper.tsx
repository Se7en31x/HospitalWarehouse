"use client";

import React, { useState } from "react";
import { type ReportPage } from "./ReportTypeSelector";
import RequisitionReportClient from "./RequisitionReportClient";
import StockBalanceReportClient from "./StockBalanceReportClient";
import ItemsReportClient from "./ItemsReportClient";
import LowStockReportClient from "./LowStockReportClient";
import AssetReportClient from "./AssetReportClient";
import ReusableItemsReportClient from "./ReusableItemsReportClient";
import InventoryBalanceReportClient from "./InventoryBalanceReportClient";
import { type Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";
import {
  Boxes,            // all-items  — physical stock boxes
  Activity,         // stock-balance — live movement activity
  Warehouse,        // inventory-balance — per-warehouse view
  ShieldAlert,      // low-stock — warning / urgency
  ReceiptText,      // requisition — request document
  Cpu,              // assets — hardware / fixed assets
  RotateCcw,        // reusable-items — reuse / cycle
  ArrowUpRight,
  FileBarChart,
} from "lucide-react";

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

// ── Grouped report definitions ────────────────────────────────────────────────
type CountKey = keyof ReportsWrapperProps["counts"] | null;

interface ReportDef {
  id: ReportPage;
  label: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  countKey: CountKey;
  badgeBg: string;
  badgeText: string;
}

interface ReportGroup {
  title: string;
  reports: ReportDef[];
}

const reportGroups: ReportGroup[] = [
  {
    title: "คลังสินค้าและสต็อก",
    reports: [
      {
        id: "all-items",
        label: "รายงานสินค้าทั้งหมด",
        description: "ดูรายการสินค้าทั้งหมดพร้อมตัวกรองหมวดหมู่และคลัง",
        icon: Boxes,
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        countKey: "totalItems",
        badgeBg: "bg-blue-50",
        badgeText: "text-blue-700",
      },
      {
        id: "stock-balance",
        label: "รายงานความเคลื่อนไหวสต็อก",
        description: "ติดตามการเคลื่อนไหวสต็อกทั้งหมด รับเข้า จ่ายออก และปรับปรุง",
        icon: Activity,
        iconBg: "bg-sky-50",
        iconColor: "text-sky-600",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "inventory-balance",
        label: "รายงานคงคลังรายคลัง",
        description: "สรุปสต็อกแยกตามคลัง พร้อมดูรายละเอียดสินค้าแต่ละคลัง",
        icon: Warehouse,
        iconBg: "bg-teal-50",
        iconColor: "text-teal-600",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "low-stock",
        label: "รายงานสต็อกต่ำ & ใกล้หมดอายุ",
        description: "ดูสินค้าที่ต่ำกว่า Min Stock และล็อตที่ใกล้หมดอายุในหน้าเดียว",
        icon: ShieldAlert,
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        countKey: "lowStockCount",
        badgeBg: "bg-orange-50",
        badgeText: "text-orange-700",
      },
    ],
  },
  {
    title: "การเบิกจ่ายและเบิกยืม",
    reports: [
      {
        id: "requisition",
        label: "รายงานคำขอเบิก/ยืม",
        description: "แยกดูคำขอเบิกและยืมตามฟิลเตอร์สถานะ",
        icon: ReceiptText,
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        countKey: "totalRequisitions",
        badgeBg: "bg-violet-50",
        badgeText: "text-violet-700",
      },
    ],
  },
  {
    title: "ครุภัณฑ์/ของใช้ซ้ำ",
    reports: [
      {
        id: "assets",
        label: "รายงานครุภัณฑ์",
        description: "ตรวจสอบสถานะและที่ตั้งของครุภัณฑ์แยกตามแผนก",
        icon: Cpu,
        iconBg: "bg-purple-50",
        iconColor: "text-purple-600",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "reusable-items",
        label: "รายงานของใช้ซ้ำรายชิ้น",
        description: "ดูสถานะและสภาพของสินค้าประเภทใช้ซ้ำแยกตามแผนก",
        icon: RotateCcw,
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
    ],
  },
];

// ── Main component ─────────────────────────────────────────────────────────────
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
        return <ItemsReportClient initialItems={initialItems} onBack={handleBackToSelector} />;
      case "low-stock":
        return (
          <LowStockReportClient
            initialItems={initialLowStockItems}
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
      default:
        return null;
    }
  };

  // ── Selector screen ──────────────────────────────────────────────────────────
  if (showSelector) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── Page header ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-4 mb-12">
            <div className="p-3 bg-[#0055FF] rounded-xl">
              <FileBarChart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">รายงาน</h1>
              <p className="text-sm text-slate-500 mt-0.5">เลือกประเภทรายงานที่ต้องการดู</p>
            </div>
          </div>

          {/* ── Category sections ───────────────────────────────────────── */}
          <div className="space-y-12">
            {reportGroups.map((group) => (
              <section key={group.title}>

                {/* Section header */}
                <div className="flex items-center gap-3 mb-6 pl-4 border-l-4 border-[#0055FF]">
                  <h2 className="text-lg font-bold text-slate-900">{group.title}</h2>
                </div>

                {/* ── Card grid ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                        className="group relative flex flex-col text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:border-[#0055FF] overflow-hidden transition-all duration-200 cursor-pointer"
                      >
                        {/* Accent strip */}
                        <span className="absolute bottom-0 left-0 w-full h-1 bg-[#0055FF] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />

                        {/* Top row: icon + ArrowUpRight */}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-xl ${report.iconBg}`}>
                            <Icon className={`w-6 h-6 ${report.iconColor}`} />
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-[#0055FF] transition-colors duration-200 mt-0.5" />
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0055FF] leading-snug mb-1.5 transition-colors duration-150">
                          {report.label}
                        </h3>

                        {/* Description — 2-line clamp */}
                        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">
                          {report.description}
                        </p>

                        {/* Badge — only when count exists */}
                        {badge !== undefined && badge > 0 && (
                          <div className="mt-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${report.badgeBg} ${report.badgeText}`}>
                              {badge.toLocaleString()} รายการ
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

        </div>
      </div>
    );
  }

  // ── Report content screen ────────────────────────────────────────────────────
  return <div>{renderReportContent()}</div>;
};

export default ReportsWrapper;
