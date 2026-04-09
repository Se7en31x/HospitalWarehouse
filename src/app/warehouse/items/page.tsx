// src/app/warehouse/items/page.tsx
export const dynamic = 'force-dynamic';

import StockClient from "./ItemsClient"; 
import { getInventoryItems} from "@/services/itemsService";
import { UiItem } from "@/types/items_type";

export default async function WarehouseItemsPage() {
  let items: UiItem[] = [];

  // ดึงข้อมูลจาก API - ถ้าล้มเหลวให้ใช้ empty array
  try {
    items = await getInventoryItems();
  } catch (error) {
    console.error("Failed to fetch items during server rendering:", error);
    // Return empty array - client will fetch data when component mounts
    items = [];
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <StockClient initialItems={items} />
    </div>
  );
}