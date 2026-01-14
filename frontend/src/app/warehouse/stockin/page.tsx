import React from "react";
// 1. Import Client Component
import StockInHistoryClient from "./StockInHistoryClient";
// 2. Import Service
import { getAllStockInHistory } from "@/services/stockInService";

// หน้าเว็บนี้เป็น Server Component
export default async function StockInPage() {
  // 3. ดึงข้อมูลจริงจาก API (ทำงานฝั่ง Server)
  const historyData = await getAllStockInHistory();

  return (
    <main>
      {/* 4. ส่งข้อมูลเข้าไปที่ Client Component */}
      <StockInHistoryClient initialHistory={historyData} />
    </main>
  );
}