export const dynamic = 'force-dynamic';

import React from "react";
import ReportsWrapper from "./_components/ReportsWrapper";

import type { Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";

export default async function WarehouseReportsPage() {
  const initialReports: Report[] = [];
  const initialItems: UiItem[] = [];
  const initialExpiringLots: ExpiringLot[] = [];

  return (
    <div className="bg-white min-h-screen">
      <ReportsWrapper
        initialReports={initialReports}
        initialItems={initialItems}
        initialLowStockItems={[]}
        initialExpiringLots={initialExpiringLots}
        counts={{
          totalItems: 0,
          totalRequisitions: 0,
          totalReceives: 0,
          totalStockOuts: 0,
          totalStockBalance: 0,
          totalExpiredLots: 0,
          lowStockCount: 0,
          nearExpiryCount: 0,
        }}
      />
    </div>
  );
}