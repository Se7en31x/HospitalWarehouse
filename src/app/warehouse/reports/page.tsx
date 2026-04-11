export const dynamic = 'force-dynamic';

import React from "react";
import ReportsWrapper from "./ReportsWrapper";
import { getAllReports } from "@/services/reportService"; 
import { getAllInventoryItems } from "@/services/itemsService";
import { getExpiredLots, getExpiringLots } from "@/services/dashboardService";
import { getAllRequisitionsPages } from "@/services/requisitionService";
import { getAllStockMovements } from "@/services/stockMovementService";
import { isBelowMinStock } from "./lowStockReportUtils";

import type { Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";

export default async function WarehouseReportsPage() {
  let initialReports: Report[] = [];
  let initialItems: UiItem[] = [];
  let initialExpiringLots: ExpiringLot[] = [];
  let initialExpiredLots: ExpiringLot[] = [];
  let requisitionCount = 0;
  let receiveCount = 0;
  let stockOutCount = 0;

  try {
    const [reports, items, lots, expiredLots, requisitions, stockIns, stockOuts] = await Promise.all([
      getAllReports().catch(() => {
        console.error("🚫 Failed to fetch reports");
        return [] as Report[];
      }),
      getAllInventoryItems().catch(() => {
        console.error("🚫 Failed to fetch inventory");
        return [] as UiItem[];
      }),
      getExpiringLots(90).catch(() => {
        console.error("🚫 Failed to fetch expiring lots");
        return [] as ExpiringLot[];
      }),
      getExpiredLots().catch(() => {
        console.error("🚫 Failed to fetch expired lots");
        return [] as ExpiringLot[];
      }),
      getAllRequisitionsPages({ limit: 100 }).catch(() => {
        console.error("🚫 Failed to fetch requisitions");
        return [];
      }),
      getAllStockMovements({ type: "RECEIVE_IN" }).catch(() => {
        console.error("🚫 Failed to fetch stock in movements");
        return [];
      }),
      getAllStockMovements({ type: "OUT" }).catch(() => {
        console.error("🚫 Failed to fetch stock out movements");
        return [];
      }),
    ]);

    initialReports = reports;
    initialItems = items;
    initialExpiringLots = lots;
    initialExpiredLots = expiredLots;
    requisitionCount = requisitions.length;
    receiveCount = stockIns.length;
    stockOutCount = stockOuts.length;
  } catch (error) {
    console.error("CRITICAL: Error fetching page data:", error);
  }

  // --- Logic สำหรับสรุปข้อมูลหน้า Dashboard ---

  // 1. สินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ (Min Stock)
  const lowStockItems = initialItems.filter(isBelowMinStock);

  const stockBalanceCount = initialItems.length;
  const expiredLotCount = initialExpiredLots.length;

  return (
    <div className="bg-white min-h-screen">
      <ReportsWrapper
        initialReports={initialReports}
        initialItems={initialItems}
        initialLowStockItems={lowStockItems}
        initialExpiringLots={initialExpiringLots}
        counts={{
          totalItems: initialItems.length,
          totalRequisitions: requisitionCount,
          totalReceives: receiveCount,
          totalStockOuts: stockOutCount,
          totalStockBalance: stockBalanceCount,
          totalExpiredLots: expiredLotCount,
          lowStockCount: lowStockItems.length,
          nearExpiryCount: initialExpiringLots.length,
        }}
      />
    </div>
  );
}