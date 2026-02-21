// app/lots/page.tsx (หรือ path ที่คุณใช้งานอยู่)
import React from "react";
import LotClient from "./ItemLotClient"; // ตรวจสอบ path ให้ถูก

// ✅ 1. Import Service ให้ตรงกับที่มีอยู่จริง (อิงจากโค้ดก่อนหน้า)
import { getLots, getMasterSuppliers } from "@/services/lot.service";
import { getInventoryItems, getItemOptions } from "@/services/inventoryService"; // Import จากไฟล์ inventoryService

export default async function LotsPage() {
  // ✅ 2. ดึงข้อมูลทั้งหมดพร้อมกัน (Parallel Data Fetching)
  // ใช้ try-catch หรือ .catch เพื่อกันหน้าเว็บพังถ้า API ตัวใดตัวหนึ่งล่ม
  const [lots, items, options, suppliers] = await Promise.all([
     getLots().catch(() => []),             // ถ้า error ให้คืนค่า []
     getInventoryItems().catch(() => []),   // ดึง Item
     getItemOptions().catch(() => ({ warehouse: [] })), // ดึง Options (Warehouse)
     getMasterSuppliers().catch(() => [])   // ดึง Supplier
  ]);

  // แปลง structure ข้อมูลให้ตรงกับที่ Client ต้องการ (ถ้าจำเป็น)
  // ในที่นี้ getItemOptions คืนค่า object { warehouse: [...], ... } จึงดึงออกมาใช้
  const warehouses = options.warehouse || [];

  return (
    <main>
      {/* ✅ 3. ส่ง Props เข้าไปที่ Client Component */}
      <LotClient 
        initialLots={lots} 
        initialItems={items}
        initialWarehouses={warehouses}
        initialSuppliers={suppliers}
      />
    </main>
  );
}