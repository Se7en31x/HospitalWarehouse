// src/app/warehouse/reports/page.tsx
export const dynamic = 'force-dynamic';

import React from "react";
import ReportsWrapper from "./ReportsWrapper";
import { getAllReports } from "@/services/reportService";
import { getInventoryItems } from "@/services/itemsService";
import { getExpiringLots } from "@/services/dashboardService";
import type { Report } from "@/types/reports_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";

export default async function WarehouseReportsPage() {
  let initialReports: Report[] = [];
  let initialItems: UiItem[] = [];
  let initialExpiringLots: ExpiringLot[] = [];

  try {
    const [reports, items, lots] = await Promise.all([
      getAllReports().catch(() => [] as Report[]),
      getInventoryItems().catch(() => [] as UiItem[]),
      getExpiringLots(90).catch(() => [] as ExpiringLot[]),
    ]);
    initialReports = reports;
    initialItems = items;
    initialExpiringLots = lots;
  } catch (error) {
    console.error("Error fetching report data:", error);
  }

  const lowStockItems = initialItems.filter(
    (item) => item.minStock > 0 && item.stock <= item.minStock
  );

  const requisitionCount = initialReports.filter(
    (r) => r.type === "requisition"
  ).length;
  const receiveCount = initialReports.filter(
    (r) => r.type === "stockin"
  ).length;

  return (
    <div className="bg-gray-50 min-h-screen">
      <ReportsWrapper
        initialReports={initialReports}
        initialItems={initialItems}
        initialLowStockItems={lowStockItems}
        initialExpiringLots={initialExpiringLots}
        counts={{
          totalItems: initialItems.length,
          totalRequisitions: requisitionCount,
          totalReceives: receiveCount,
          lowStockCount: lowStockItems.length,
          nearExpiryCount: initialExpiringLots.length,
        }}
      />
    </div>
  );
}
