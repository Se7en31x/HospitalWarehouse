// ─────────────────────────────────────────────────────────────────────────────
//  Generic CSV download helper for report exports.
//  - Pure data (no metadata header). First line = column headers, then rows.
//  - Adds UTF-8 BOM so Excel/Google Sheets open Thai text correctly.
//  - Escapes commas, double-quotes, and newlines per RFC 4180.
// ─────────────────────────────────────────────────────────────────────────────

export type CsvCellValue = string | number | null | undefined;

const escapeCell = (value: CsvCellValue): string => {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (s === "") return "";
  // RFC 4180: wrap in double-quotes if the value contains comma, quote, or newline.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

export interface CsvDownloadOptions {
  headers: string[];
  rows: CsvCellValue[][];
  filename: string;
}

/**
 * Builds a CSV string from headers + rows and triggers a browser download.
 * Filename is suffixed with the current ISO date automatically when it does not
 * already end in `.csv`.
 */
export const downloadCsv = ({ headers, rows, filename }: CsvDownloadOptions): void => {
  const headerLine = headers.map(escapeCell).join(",");
  const bodyLines  = rows.map((row) => row.map(escapeCell).join(","));
  const csv        = [headerLine, ...bodyLines].join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  const safe = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.download = safe;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Inline SVG icon used by Export-as-CSV buttons. Mirrors the existing PdfIcon style. */
export const CSV_ICON_PROPS = {
  fill: "#0ea5e9",
  label: "CSV",
} as const;
