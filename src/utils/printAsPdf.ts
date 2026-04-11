/**
 * printAsPdf — Opens a styled print window (browser-native PDF export).
 * Thai characters render perfectly via the browser's font stack.
 */

export interface PdfColumn {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
}

export const printAsPdf = (
  title: string,
  subtitle: string,
  columns: PdfColumn[],
  rows: Record<string, string | number | undefined | null>[]
): void => {
  const printDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const thCells = columns
    .map((c) => `<th class="align-${c.align ?? "left"}">${c.header}</th>`)
    .join("");

  const trRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => {
          const val = row[c.key];
          return `<td class="align-${c.align ?? "left"}">${val ?? "-"}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'Tahoma', sans-serif;
      font-size: 13px;
      color: #1e293b;
      padding: 24px 28px;
    }
    .header { margin-bottom: 16px; }
    .header h1 { font-size: 20px; font-weight: 700; color: #0f172a; }
    .header .sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #059669; color: #fff; }
    thead th { padding: 9px 12px; font-weight: 600; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr:hover { background: #ecfdf5; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .align-right  { text-align: right; }
    .align-center { text-align: center; }
    .align-left   { text-align: left; }
    .footer { margin-top: 20px; font-size: 11px; color: #94a3b8; text-align: right; }
    @media print {
      body { padding: 12px; }
      .no-print { display: none; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    ${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
  </div>
  <div class="meta">
    <span>รวมทั้งหมด ${rows.length.toLocaleString()} รายการ</span>
    <span>วันที่พิมพ์: ${printDate}</span>
  </div>
  <table>
    <thead><tr>${thCells}</tr></thead>
    <tbody>${trRows}</tbody>
  </table>
  <div class="footer">HPK Warehouse Management System</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) {
    alert("กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์รายงาน");
    return;
  }
  win.document.write(html);
  win.document.close();
};
