// src/app/warehouse/items/page.tsx
export const dynamic = 'force-dynamic';

// ✅ จุดสำคัญ: จุดเดียว (.) แปลว่า "หาไฟล์ที่อยู่ในโฟลเดอร์เดียวกันนี้แหละ"
import StockClient from "./ItemsClient"; 
import { getInventoryItems} from "@/services/inventoryService";
import { UiItem } from "@/app/interfaces/item.interface";

export default async function WarehouseItemsPage() {
  // ดึงข้อมูลจาก API
  const items: UiItem[] = await getInventoryItems();

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* ส่งข้อมูลเข้าสู่หน้าจอ UI */}
      <StockClient initialItems={items} />
    </div>
  );
}