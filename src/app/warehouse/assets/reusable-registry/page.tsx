import ReusableRegistryClient from "./ReusableRegistryClient";
import { createClient } from "@/lib/supabase/server";
import { getInventoryItemById } from "@/services/itemsService";
import { getReusableUnits } from "@/services/reusableUnitService";
import type { ReusableUnit } from "@/services/reusableUnitService";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ทะเบียนของใช้ซ้ำรายชิ้น | Hospital Inventory",
  description: "ตรวจสอบรายการรายชิ้นสำหรับของใช้ซ้ำ",
};

// Next.js 15: searchParams is a Promise
export default async function ReusableRegistryPage({
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
  let initialUnits: ReusableUnit[] = [];

  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Fetch item name from the inventory items table (itemId = item type UUID).
    // getReusableUnitById would be wrong here because itemId is NOT a unit UUID.
    const [item, unitList] = await Promise.all([
      getInventoryItemById(itemId, token),
      getReusableUnits({ item_id: itemId, page: 1, limit: 10 }, token),
    ]);

    initialItemName = item.name || "";
    initialItemCode = item.code || "";
    // Pass the pre-fetched list so the client skips its first fetch entirely.
    initialUnits = unitList.items || [];
  } catch {
    // API error or session missing — client will fetch on mount.
  }

  return (
    <ReusableRegistryClient
      itemId={itemId}
      initialItemName={initialItemName}
      initialItemCode={initialItemCode}
      initialUnits={initialUnits}
    />
  );
}
