import { createClient } from "@/lib/supabase/server";
import LotClient from "./ItemLotClient";
import { getLots, getMasterSuppliers } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";
import type * as LotInterface from "@/types/lot_type";
import type * as ItemInterface from "@/types/items_type";

export const dynamic = "force-dynamic";

export default async function LotsPage() {
  let initialLots: LotInterface.UiLot[] = [];
  let initialItems: ItemInterface.UiItem[] = [];
  let initialWarehouses: ItemInterface.Option[] = [];
  let initialSuppliers: LotInterface.MasterSupplier[] = [];

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Fetch all four data sets in parallel — single round-trip to the auth layer.
    const [lotsResult, itemsResult, warehousesResult, suppliersResult] = await Promise.all([
        getLots(1, 10, undefined, token),
        getInventoryItems({}, token),
        getWarehousesOptions(token),
        getMasterSuppliers(token),
    ]);
    initialLots = lotsResult.items;
    initialItems = itemsResult;
    initialWarehouses = warehousesResult;
    initialSuppliers = suppliersResult;
  } catch (error) {
    console.error("Failed to pre-fetch lots page data during SSR:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      status: (error as any)?.status,
    });
    // Client component re-fetches on mount via its own auth flow.
  }

  return (
    <main>
      <LotClient
        initialLots={initialLots}
        initialItems={initialItems}
        initialWarehouses={initialWarehouses}
        initialSuppliers={initialSuppliers}
      />
    </main>
  );
}
