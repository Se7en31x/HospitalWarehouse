import React from "react";
import LotClient from "./ItemLotClient";

import { getLots, getMasterSuppliers } from "@/services/lotservice";
import { getInventoryItems, getWarehousesOptions } from "@/services/itemsService";

export default async function LotsPage() {
  // Fetch all data in parallel with error handling
  const [lots, items, warehouses, suppliers] = await Promise.all([
    getLots().catch(() => []),
    getInventoryItems().catch(() => []),
    getWarehousesOptions().catch(() => []),
    getMasterSuppliers().catch(() => []),
  ]);

  return (
    <main>
      <LotClient 
        initialLots={lots} 
        initialItems={items}
        initialWarehouses={warehouses}
        initialSuppliers={suppliers}
      />
    </main>
  );
}