export const dynamic = 'force-dynamic';

import React from "react";
import ReportsWrapper from "./ReportsWrapper";
// ✅ ตรวจสอบชื่อไฟล์ให้ตรง (ไม่มี s และใช้ .service หรือ Service ตามที่คุณตั้งชื่อไฟล์)
import { getAllReports } from "@/services/reportService"; 
import { getInventoryItems } from "@/services/itemsService";
import { getExpiringLots } from "@/services/dashboardService";

// ✅ ใช้ Type ตัวใหม่ที่เราเพิ่งทำ (ไม่มี s)
import type { Report } from "@/types/report_type";
import type { UiItem } from "@/services/itemsService";
import type { ExpiringLot } from "@/services/dashboardService";

export default async function WarehouseReportsPage() {
  let initialReports: Report[] = [];
  let initialItems: UiItem[] = [];
  let initialExpiringLots: ExpiringLot[] = [];

  try {
    // ดึงข้อมูลแบบขนานเพื่อความเร็ว
    const [reports, items, lots] = await Promise.all([
      getAllReports().catch(() => {
        console.error("🚫 Failed to fetch reports");
        return [] as Report[];
      }),
      getInventoryItems().catch(() => {
        console.error("🚫 Failed to fetch inventory");
        return [] as UiItem[];
      }),
      getExpiringLots(90).catch(() => {
        console.error("🚫 Failed to fetch expiring lots");
        return [] as ExpiringLot[];
      }),
    ]);

    initialReports = reports;
    initialItems = items;
    initialExpiringLots = lots;
  } catch (error) {
    console.error("CRITICAL: Error fetching page data:", error);
  }

  // --- Logic สำหรับสรุปข้อมูลหน้า Dashboard ---

  // 1. สินค้าที่สต็อกต่ำกว่าจุดสั่งซื้อ (Min Stock)
  const lowStockItems = initialItems.filter(
    (item) => item.minStock > 0 && item.stock <= item.minStock
  );

  // 2. นับจำนวนรายการแยกตามประเภท (ใช้ Type ใหม่ได้เลย)
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