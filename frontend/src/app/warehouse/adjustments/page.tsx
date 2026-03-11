// src/app/warehouse/adjustments/page.tsx
export const dynamic = 'force-dynamic';

import AdjustmentsClient from "./AdjustmentsClient";
import { getInventoryItems } from "@/services/itemsService";
import { UiItem } from "@/types/items_type";

export default async function WarehouseAdjustmentsPage() {
  // ดึงข้อมูลจาก API
  const items: UiItem[] = await getInventoryItems();

  return (
    <div className="bg-gray-50 min-h-screen">
      <AdjustmentsClient initialItems={items} />
    </div>
  );
}

/*
NOTE: This file has been refactored to follow the Server/Client Component pattern.
Previously this file contained mock data and all UI logic.
Now it's a clean Server Component that fetches real data and passes it to AdjustmentsClient.

Benefits:
- Separates server-side data fetching from client-side state management
- Enables real-time updates via Socket.io in the client component
- Maintains consistency with ItemsClient pattern
- Cleaner, more maintainable code structure

For detailed implementation, see: AdjustmentsClient.tsx
*/