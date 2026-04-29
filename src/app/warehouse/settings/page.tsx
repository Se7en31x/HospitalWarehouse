export const dynamic = "force-dynamic";

import SettingsClient from "./SettingsClient";
import { createClient } from "@/lib/supabase/server";
import {
  getCategories,
  getUnits,
  getWarehouses,
  getSuppliers,
  getSystemSettings,
} from "@/services/settingsService";
import type {
  Category,
  Supplier,
  SystemSettingsMap,
  Unit,
  Warehouse,
} from "@/types/settings_type";

export default async function WarehouseSettingsPage() {
  let initialCategories: Category[] = [];
  let initialUnits: Unit[] = [];
  let initialWarehouses: Warehouse[] = [];
  let initialSuppliers: Supplier[] = [];
  let initialSystemSettings: SystemSettingsMap = {} as SystemSettingsMap;

  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const [cats, uns, whs, sups, sys] = await Promise.all([
      getCategories(token),
      getUnits(token),
      getWarehouses(token),
      getSuppliers(token),
      getSystemSettings(token),
    ]);

    initialCategories = cats || [];
    initialUnits = uns || [];
    initialWarehouses = whs || [];
    initialSuppliers = sups || [];
    initialSystemSettings = (sys || {}) as SystemSettingsMap;
  } catch (error) {
    console.error("Failed to fetch settings during server rendering:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      status: (error as { status?: number })?.status,
    });
  }

  return (
    <SettingsClient
      initialCategories={initialCategories}
      initialUnits={initialUnits}
      initialWarehouses={initialWarehouses}
      initialSuppliers={initialSuppliers}
      initialSystemSettings={initialSystemSettings}
    />
  );
}
