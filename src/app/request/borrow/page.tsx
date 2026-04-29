export const dynamic = "force-dynamic";

import BorrowClient from "./BorrowClient";
import { getInventoryItems } from "@/services/itemsService";
import { createClient } from "@/lib/supabase/server";
import { UiItem } from "@/types/items_type";

export const metadata = {
  title: "ระบบยืม-คืน ครุภัณฑ์ (Borrow System)",
};

export default async function BorrowPage() {
  let items: UiItem[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    items = await getInventoryItems({ allowed_borrow: true, type: "REUSABLE" }, token);
  } catch (error) {
    console.error("Failed to fetch borrow items during server rendering:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      status: (error as { status?: number })?.status,
    });
    items = [];
  }

  return <BorrowClient initialItems={items} />;
}
