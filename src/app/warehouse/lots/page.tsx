import React from "react";
import LotClient from "./ItemLotClient";

export const dynamic = "force-dynamic";

export default function LotsPage() {
  // All data fetching is handled client-side by LotClient
  // This avoids authentication issues during SSR
  return (
    <main>
      <LotClient 
        initialLots={[]} 
        initialItems={[]}
        initialWarehouses={[]}
        initialSuppliers={[]}
      />
    </main>
  );
}