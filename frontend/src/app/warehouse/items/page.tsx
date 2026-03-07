// src/app/warehouse/items/page.tsx
export const dynamic = 'force-dynamic';

import StockClient from "./ItemsClient"; 
import { getInventoryItems} from "@/services/itemsService";
import { UiItem } from "@/types/items_type";

export default async function WarehouseItemsPage() {
  // ดึงข้อมูลจาก API
  const items: UiItem[] = await getInventoryItems();

  return (
    <div className="bg-gray-50 min-h-screen">
      <StockClient initialItems={items} />
    </div>
  );
}