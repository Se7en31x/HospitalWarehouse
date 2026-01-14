// src/app/warehouse/stock-in/page.tsx

import React from "react";
// 1. Import Client Component (หน้าแสดงตาราง)
import StockInHistoryClient from "./StockInCreateClient";

// 2. Import Service (ตัวดึงข้อมูล)
import { getAllStockInHistory } from "@/services/stockInService";

export const metadata = {
  title: "ประวัติการรับสินค้าเข้า (Stock In History)",
};

export default async function StockInPage() {
  // 3. ดึงข้อมูลจริงจาก API (ทำงานฝั่ง Server ก่อนส่งไปหน้าเว็บ)
  // ถ้ายังไม่มี DB จริง มันจะไปเรียก Mock Data ที่เราเขียนไว้ใน Service
  const historyData = await getAllStockInHistory();

  return (
    <main>
      {/* 4. ส่งข้อมูลเข้าไปที่ Client Component */}
      <StockInHistoryClient initialHistory={historyData} />
    </main>
  );
}