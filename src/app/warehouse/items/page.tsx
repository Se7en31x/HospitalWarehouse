// src/app/warehouse/items/page.tsx
export const dynamic = "force-dynamic";

import StockClient from "./ItemsClient";
import { getInventoryItems } from "@/services/itemsService";
import { createClient } from "@/lib/supabase/server";
import { UiItem } from "@/types/items_type";

export default async function WarehouseItemsPage() {
  let items: UiItem[] = [];

  try {
    // Server Components can import @/lib/supabase/server directly — next/headers
    // is always available here and never reaches the client bundle.
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Pass the token explicitly so the API call goes out with Authorization header.
    items = await getInventoryItems({}, token);
  } catch (error) {
    console.error("Failed to fetch items during server rendering:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      status: (error as any)?.status,
    });
    // Client component will re-fetch on mount via its own auth flow.
    items = [];
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <StockClient initialItems={items} />
    </div>
  );
}