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
import ReturnConditionReportClient from "../_clients/requisition/ReturnConditionReportClient";
import OverdueBorrowReportClient from "../_clients/requisition/OverdueBorrowReportClient";
import { type Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";
import {
  Boxes,
  Activity,
  Warehouse,
  ShieldAlert,
  ReceiptText,
  Cpu,
  RotateCcw,
  PackagePlus,
  ArrowUpRight,
  FileBarChart,
  TrendingUp,
  Banknote,
  CalendarX,
  Users,
  PackageCheck,
  Clock,
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
        iconBg: "bg-blue-600",
        iconColor: "text-white",
        countKey: "totalItems",
        badgeBg: "bg-blue-50",
        badgeText: "text-blue-700",
      },
      {
        id: "stock-balance",
        label: "รายงานความเคลื่อนไหวสต็อก",
        description: "ติดตามการเคลื่อนไหวสต็อกทั้งหมด รับเข้า จ่ายออก และปรับปรุง",
        icon: Activity,
        iconBg: "bg-sky-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "inventory-balance",
        label: "รายงานคงคลังรายคลัง",
        description: "สรุปสต็อกแยกตามคลัง พร้อมดูรายละเอียดสินค้าแต่ละคลัง",
        icon: Warehouse,
        iconBg: "bg-teal-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "low-stock",
        label: "รายงานสต็อกต่ำ & ใกล้หมดอายุ",
        description: "ดูสินค้าที่ต่ำกว่า Min Stock และล็อตที่ใกล้หมดอายุในหน้าเดียว",
        icon: ShieldAlert,
        iconBg: "bg-orange-600",
        iconColor: "text-white",
        countKey: "lowStockCount",
        badgeBg: "bg-orange-50",
        badgeText: "text-orange-700",
      },
      {
        id: "expired-lots",
        label: "รายงานล็อตหมดอายุ",
        description: "ตรวจสอบล็อตสินค้าที่หมดอายุแล้วหรือใกล้หมดอายุ",
        icon: CalendarX,
        iconBg: "bg-red-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "item-ranking",
        label: "รายงานอันดับสินค้าที่ใช้บ่อย",
        description: "จัดอันดับสินค้าตามปริมาณการเบิกจ่าย",
        icon: TrendingUp,
        iconBg: "bg-indigo-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "inventory-value",
        label: "รายงานมูลค่าคงคลัง",
        description: "สรุปมูลค่าสินค้าในคลังแยกตามหมวดหมู่และคลัง",
        icon: Banknote,
        iconBg: "bg-green-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
    ],
  },
  {
    title: "การรับสินค้าเข้าคลัง",
    reports: [
      {
        id: "receive-report",
        label: "รายงานการรับสินค้าเข้าคลัง",
        description: "ดูรายการรับสินค้าทั้งหมด พร้อมจำนวนในใบกำกับ จำนวนรับจริง และราคาต่อหน่วย",
        icon: PackagePlus,
        iconBg: "bg-emerald-600",
        iconColor: "text-white",
        countKey: "totalReceives",
        badgeBg: "bg-emerald-50",
        badgeText: "text-emerald-700",
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
        iconBg: "bg-violet-600",
        iconColor: "text-white",
        countKey: "totalRequisitions",
        badgeBg: "bg-violet-50",
        badgeText: "text-violet-700",
      },
      {
        id: "dept-consumption",
        label: "รายงานการใช้สินค้าแยกแผนก",
        description: "สรุปปริมาณการเบิกสินค้าแยกตามแผนกในช่วงเวลาที่กำหนด",
        icon: Users,
        iconBg: "bg-sky-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "return-condition",
        label: "รายงานสภาพสินค้าที่คืน",
        description: "ตรวจสอบสภาพของสินค้าที่ถูกส่งคืนจากแผนกต่าง ๆ",
        icon: PackageCheck,
        iconBg: "bg-cyan-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "overdue-borrow",
        label: "รายงานการยืมเกินกำหนด",
        description: "ดูรายการยืมที่เลยกำหนดคืนและยังไม่ได้ส่งคืน",
        icon: Clock,
        iconBg: "bg-rose-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
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
        iconBg: "bg-purple-600",
        iconColor: "text-white",
        countKey: null,
        badgeBg: "",
        badgeText: "",
      },
      {
        id: "reusable-items",
        label: "รายงานของใช้ซ้ำรายชิ้น",
        description: "ดูสถานะและสภาพของสินค้าประเภทใช้ซ้ำแยกตามแผนก",
        icon: RotateCcw,
        iconBg: "bg-amber-600",
        iconColor: "text-white",
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
      case "return-condition":
        return <ReturnConditionReportClient onBack={handleBackToSelector} />;
      case "overdue-borrow":
        return <OverdueBorrowReportClient onBack={handleBackToSelector} />;
      default:
        return null;
    }
  };

  // ── Selector screen ──────────────────────────────────────────────────────────
  if (showSelector) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="w-full px-6 py-8">

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
                        className="group relative flex flex-col text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg overflow-hidden transition-all duration-200 cursor-pointer"
                      >
                        {/* Colored top stripe */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${report.iconBg}`} />

                        {/* Top row: icon + ArrowUpRight */}
                        <div className="flex items-start justify-between mb-4 mt-1">
                          <div className={`p-3 rounded-xl ${report.iconBg}`}>
                            <Icon className={`w-6 h-6 ${report.iconColor}`} />
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors duration-200 mt-0.5" />
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
