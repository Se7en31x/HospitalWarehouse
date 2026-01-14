// app/lots/page.tsx (ตัวอย่าง path)
import React from "react";
import LotClient from "./ItemLotClient"; // path ไปยังไฟล์ Client Component ของคุณ
import { getAllLots } from "@/services/itemLotService";

// หน้าเว็บนี้เป็น Server Component (ดึงข้อมูลก่อน render)
export default async function LotsPage() {
  // ดึงข้อมูลจริงจาก API
  const lots = await getAllLots();

  return (
    <main>
      {/* ส่งข้อมูลเข้าไปที่ Client Component */}
      <LotClient initialLots={lots} />
    </main>
  );
}