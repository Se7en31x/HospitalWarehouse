// src/app/warehouse/reports/page.tsx
export const dynamic = 'force-dynamic';

import React from "react";
import ReportsWrapper from "./ReportsWrapper";
import { getAllReports } from "@/services/reportService";
import type { Report } from "@/types/reports_type";

export default async function WarehouseReportsPage() {
  // Fetch reports from API
  let initialReports: Report[] = [];
  
  try {
    initialReports = await getAllReports();
  } catch (error) {
    console.error("Error fetching reports:", error);
    initialReports = [];
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <ReportsWrapper initialReports={initialReports} />
    </div>
  );
}
