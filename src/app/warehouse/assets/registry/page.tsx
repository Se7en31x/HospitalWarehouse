import AssetRegistryClient from "./AssetRegistryClient";
import { createClient } from "@/lib/supabase/server";
import { getInventoryItemById } from "@/services/itemsService";
import { getAssets } from "@/services/assetService";
import type { Asset } from "@/services/assetService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ทะเบียนครุภัณฑ์รายชิ้น | Hospital Inventory",
  description: "จัดการข้อมูล Serial Number และสถานะครุภัณฑ์รายชิ้น",
};

// Next.js 15: searchParams is a Promise
export default async function AssetRegistryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const itemId = typeof params.itemId === "string" ? params.itemId : "";

  if (!itemId) {
    return (
      <div className="p-20 text-center font-bold text-slate-300">
        ไม่พบข้อมูลรายการ — กรุณาระบุ itemId ใน URL
      </div>
    );
  }

  let initialItemName = "";
  let initialItemCode = "";
  let initialAssets: Asset[] = [];

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Fetch item name from the inventory items table (itemId = item type UUID).
    // getInventoryItemById uses GET /v1/items/:id — the correct endpoint.
    // getAssetById would be wrong here because itemId is NOT an asset UUID.
    const [item, assetList] = await Promise.all([
      getInventoryItemById(itemId, token),
      getAssets({ item_id: itemId, limit: 10 }, token),
    ]);

    initialItemName = item.name || "";
    initialItemCode = item.code || "";
    // Pass the pre-fetched list so the client skips its first fetch entirely.
    initialAssets = assetList.data || [];
  } catch {
    // API error or session missing — client will fetch on mount.
  }

  return (
    <AssetRegistryClient
      itemId={itemId}
      initialItemName={initialItemName}
      initialItemCode={initialItemCode}
      initialAssets={initialAssets}
    />
  );
}
