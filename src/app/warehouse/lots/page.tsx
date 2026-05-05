import { createClient } from "@/lib/supabase/server";
import LotClient from "./ItemLotClient";
import { getLots, getMasterSuppliers } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";
import { getSystemSettings } from "@/services/settingsService";
import type * as LotInterface from "@/types/lot_type";
import type * as ItemInterface from "@/types/items_type";
import type { SystemSettingsMap } from "@/types/settings_type";

function parseNotifyExpiringDays(settings: SystemSettingsMap | undefined, fallback = 30): number {
  const raw = settings?.notify_expiring_days?.value;
  const n = Number(raw);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(3650, n));
}

export const dynamic = "force-dynamic";

export default async function LotsPage() {
  let initialLots: LotInterface.UiLot[] = [];
  let initialItems: ItemInterface.UiItem[] = [];
  let initialWarehouses: ItemInterface.Option[] = [];
  let initialSuppliers: LotInterface.MasterSupplier[] = [];
  let initialNotifyExpiringDays = 30;

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Fetch all data in parallel — settings drive "ใกล้หมด" threshold (notify_expiring_days).
    const [lotsResult, itemsResult, warehousesResult, suppliersResult, settingsMap] = await Promise.all([
        getLots(1, 10, undefined, token),
        getInventoryItems({ type: "CONSUMABLE", limit: 1000 }, token),
        getWarehousesOptions(token),
        getMasterSuppliers(token),
        getSystemSettings(token).catch(() => undefined as SystemSettingsMap | undefined),
    ]);
    initialLots = lotsResult.items;
    initialItems = itemsResult;
    initialWarehouses = warehousesResult;
    initialSuppliers = suppliersResult;
    initialNotifyExpiringDays = parseNotifyExpiringDays(settingsMap);
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
        initialNotifyExpiringDays={initialNotifyExpiringDays}
      />
    </main>
  );
}
