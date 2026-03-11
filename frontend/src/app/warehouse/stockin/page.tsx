import React from "react";
import StockInHistoryClient from "./StockInClient";

export const dynamic = 'force-dynamic';

export default function StockInPage() {
  return (
    <main>
      <StockInHistoryClient />
    </main>
  );
}