import type * as LotType from "@/types/lot_type";

/**
 * Calculate days remaining until expiry
 */
export const calculateDaysRemaining = (expiryDate: string | null): number => {
  if (!expiryDate) return Infinity;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 3600 * 24));
};

/**
 * Determine expiry status based on days remaining
 */
export const getExpiryStatus = (expiryDate: string | null): LotType.ExpiryStatus => {
  const daysRemaining = calculateDaysRemaining(expiryDate);

  if (daysRemaining < 0) return "หมดอายุ";
  if (daysRemaining <= 30) return "ใกล้หมด";
  return "ปกติ";
};

/**
 * Get color classes for expiry status
 */
export const getExpiryStatusColor = (status: LotType.ExpiryStatus) => {
  const colors = {
    "ปกติ": {
      badge: "bg-green-100 text-green-800",
      row: "hover:bg-green-50 border-l-4 border-green-500",
      indicator: "bg-green-500",
    },
    "ใกล้หมด": {
      badge: "bg-yellow-100 text-yellow-800",
      row: "hover:bg-yellow-50 border-l-4 border-yellow-500",
      indicator: "bg-yellow-500",
    },
    "หมดอายุ": {
      badge: "bg-red-100 text-red-800",
      row: "hover:bg-red-50 border-l-4 border-red-500",
      indicator: "bg-red-500",
    },
  };
  return colors[status] || colors["ปกติ"];
};

/**
 * Format date to Thai format
 */
export const formatDateTH = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
};

/**
 * Format currency in Thai
 */
export const formatCurrencyTH = (value: number): string => {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format date to display format (2 Jan 2025)
 */
export const formatDateDisplay = (dateStr?: string | null): string => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Enrich UiLot with computed fields
 */
export const enrichLot = (lot: LotType.UiLot): LotType.UiLot => {
  const daysRemaining = calculateDaysRemaining(lot.expiryDate);
  const expiryStatus = getExpiryStatus(lot.expiryDate);
  const totalValue = lot.quantity * lot.cost;

  return {
    ...lot,
    daysRemaining: daysRemaining === Infinity ? undefined : daysRemaining,
    expiryStatus,
    totalValue,
  };
};

/**
 * Calculate KPI metrics from lots
 */
export const calculateKpiMetrics = (lots: LotType.UiLot[]): LotType.KpiMetrics => {
  const enrichedLots = lots.map(enrichLot);

  const nearExpiryCount = enrichedLots.filter(
    (l) => l.expiryStatus === "ใกล้หมด"
  ).length;
  const expiredCount = enrichedLots.filter(
    (l) => l.expiryStatus === "หมดอายุ"
  ).length;
  const totalValue = enrichedLots.reduce((sum, l) => sum + (l.totalValue || 0), 0);

  const validExpiryDays = enrichedLots
    .map((l) => l.daysRemaining)
    .filter((d) => d !== undefined) as number[];
  const averageExpiryDays =
    validExpiryDays.length > 0
      ? Math.round(validExpiryDays.reduce((a, b) => a + b, 0) / validExpiryDays.length)
      : 0;

  const warehouses = new Set(enrichedLots.map((l) => l.warehouse));
  const categories = new Set(enrichedLots.map((l) => l.category));

  return {
    totalLots: enrichedLots.length,
    nearExpiryCount,
    expiredCount,
    totalValue,
    averageExpiryDays,
    warehouseCount: warehouses.size,
    categoryCount: categories.size,
  };
};

/**
 * Export lots to CSV
 */
export const exportLotsToCSV = (lots: LotType.UiLot[]): void => {
  const enrichedLots = lots.map(enrichLot);

  const headers = [
    "Lot Code",
    "Item Name",
    "Item Code",
    "Category",
    "Warehouse",
    "Quantity",
    "Unit",
    "Cost Price",
    "Total Value",
    "Expiry Date",
    "Days Remaining",
    "Status",
    "Supplier",
  ];

  const rows = enrichedLots.map((lot) => [
    lot.id,
    lot.itemName,
    lot.itemCode,
    lot.category,
    lot.warehouse,
    lot.quantity,
    lot.unit,
    lot.cost,
    lot.totalValue || 0,
    formatDateTH(lot.expiryDate),
    lot.daysRemaining ?? "-",
    lot.expiryStatus || "ปกติ",
    lot.supplierName || "-",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `lots_${new Date().getTime()}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Sort lots by specified field
 */
export const sortLots = (
  lots: LotType.UiLot[],
  field: LotType.LotSortField,
  order: LotType.SortOrder = "asc"
): LotType.UiLot[] => {
  const enriched = lots.map(enrichLot);
  const multiplier = order === "asc" ? 1 : -1;

  return [...enriched].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (field) {
      case "itemName":
        aValue = a.itemName;
        bValue = b.itemName;
        break;
      case "expiryDate":
        aValue = new Date(a.expiryDate || "9999-12-31").getTime();
        bValue = new Date(b.expiryDate || "9999-12-31").getTime();
        break;
      case "quantity":
        aValue = a.quantity;
        bValue = b.quantity;
        break;
      case "cost":
        aValue = a.cost;
        bValue = b.cost;
        break;
      case "createdAt":
        aValue = new Date(a.createdAt || 0).getTime();
        bValue = new Date(b.createdAt || 0).getTime();
        break;
      case "daysRemaining":
        aValue = a.daysRemaining ?? Infinity;
        bValue = b.daysRemaining ?? Infinity;
        break;
      default:
        return 0;
    }

    if (typeof aValue === "string") {
      return aValue.localeCompare(bValue) * multiplier;
    }
    return (aValue - bValue) * multiplier;
  });
};

/**
 * Generate printable label for a lot
 */
export const generatePrintableLabel = (lot: LotType.UiLot): string => {
  const enrichedLot = enrichLot(lot);
  const daysRemaining = enrichedLot.daysRemaining ?? "-";

  return `
    <div style="width: 10cm; height: 6cm; border: 2px solid #000; padding: 0.5cm; font-family: Arial; font-size: 12px;">
      <div style="text-align: center; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 0.3cm;">
        <div style="font-size: 14px; margin-bottom: 0.2cm;">HOSPITAL WAREHOUSE</div>
      </div>
      <div style="margin-top: 0.3cm;">
        <div><strong>Lot Code:</strong> ${lot.id}</div>
        <div><strong>Item:</strong> ${lot.itemName}</div>
        <div><strong>Quantity:</strong> ${lot.quantity} ${lot.unit}</div>
        <div><strong>Expiry Date:</strong> ${formatDateTH(lot.expiryDate)}</div>
        <div><strong>Days Remaining:</strong> <span style="color: ${
    enrichedLot.expiryStatus === "หมดอายุ"
      ? "red"
      : enrichedLot.expiryStatus === "ใกล้หมด"
        ? "orange"
        : "green"
  };">${daysRemaining}</span></div>
        <div style="margin-top: 0.3cm; text-align: center;">
          <barcode value="${lot.id}" format="CODE128" width="2.5" height="1"></barcode>
        </div>
      </div>
    </div>
  `;
};

/**
 * Open print dialog for lot label
 */
export const printLotLabel = (lot: LotType.UiLot): void => {
  const printContent = generatePrintableLabel(lot);
  const printWindow = window.open("", "", "width=800,height=600");

  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Lot Label - ${lot.id}</title>
          <style>
            body { margin: 1cm; font-family: Arial; }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }
};
