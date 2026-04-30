/**
 * printWarehouseReport — Upgraded PDF print utility with hospital header,
 * printed-by info, and signature section. Replaces the basic printAsPdf.
 *
 * Usage:
 *   printWarehouseReport({
 *     reportTitle: 'รายงานการเบิก/ยืมพัสดุ',
 *     period: '1 มี.ค. 2568 – 31 มี.ค. 2568',
 *     filterSummary: 'สถานะ: อนุมัติแล้ว | แผนก: ทั้งหมด',
 *     columns: [...],
 *     rows: [...],
 *     printedBy: { title: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี', department: 'คลังกลาง' },
 *   });
 */

const LOGO_URL =
  "https://res.cloudinary.com/dgoxbpj1j/image/upload/v1773921237/logo-removebg-preview_frzye8.png";

const ACCENT_COLOR = "#0786F5";

export interface PrintColumn {
  header: string;
  key: string;
  align?: "left" | "center" | "right";
}

export interface PrintedBy {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
}

export interface PrintWarehouseReportOptions {
  reportTitle: string;
  /** e.g. "1 มี.ค. 2568 – 31 มี.ค. 2568" */
  period?: string;
  /** e.g. "หมวดหมู่: ยาสามัญ | คลัง: คลังกลาง" */
  filterSummary?: string;
  docNo?: string;
  columns: PrintColumn[];
  rows: Record<string, string | number | undefined | null>[];
  printedBy?: PrintedBy;
  /** Roles shown in signature boxes. Default: ['ผู้ออกรายงาน', 'ผู้ตรวจสอบ'] */
  signatureRoles?: string[];
  /** Set false to hide the signature area. Default: true */
  showSignature?: boolean;
}

const esc = (s: string | number | undefined | null): string => {
  if (s == null) return "-";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

export function printWarehouseReport(options: PrintWarehouseReportOptions): void {
  const {
    reportTitle,
    period,
    filterSummary,
    docNo,
    columns,
    rows,
    printedBy,
    signatureRoles = ["ผู้ออกรายงาน", "ผู้ตรวจสอบ"],
    showSignature = true,
  } = options;

  const printDate = new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const printTime = new Date().toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
  });

  const printedByName = printedBy
    ? [printedBy.title, printedBy.firstName, printedBy.lastName]
        .filter(Boolean)
        .join("")
    : "";
  const printedByDept = printedBy?.department ?? "";

  // ── Table header cells ────────────────────────────────────────────────────
  const thCells = columns
    .map(
      (c) =>
        `<th class="align-${c.align ?? "left"}">${esc(c.header)}</th>`
    )
    .join("");

  // ── Table rows ────────────────────────────────────────────────────────────
  const trRows = rows
    .map((row) => {
      const cells = columns
        .map(
          (c) =>
            `<td class="align-${c.align ?? "left"}">${esc(row[c.key])}</td>`
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  // ── Signature section ─────────────────────────────────────────────────────
  const sigSection = showSignature
    ? `<div class="sig-section">
        ${signatureRoles
          .map(
            (role) => `
          <div class="sig-box">
            <p class="sig-line">(ลงชื่อ)&nbsp;...................................................</p>
            <p class="sig-role">${esc(role)}</p>
            <p class="sig-name">(.......................................................)</p>
            <p class="sig-date">วันที่&nbsp;........./........./.........</p>
          </div>`
          )
          .join("")}
      </div>`
    : "";

  // ── Printed-by line ───────────────────────────────────────────────────────
  const printedByLine =
    printedByName
      ? `<p class="printed-by">ออกรายงานโดย: <strong>${esc(printedByName)}</strong>${printedByDept ? `&nbsp;|&nbsp;${esc(printedByDept)}` : ""}</p>`
      : "";

  // ── HTML document ─────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${esc(reportTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Sarabun', 'TH Sarabun New', 'Tahoma', sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 1.1cm 1.4cm;
      max-width: 210mm;
      margin: 0 auto;
      line-height: 1.65;
    }

    /* ── PAGE HEADER ─────────────────────────────────────── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 12px;
      border-bottom: 2px solid ${ACCENT_COLOR};
    }
    .org-info { display: flex; align-items: center; gap: 12px; }
    .org-logo { width: 50px; height: 50px; object-fit: contain; }
    .org-name { font-size: 15px; font-weight: 700; color: #111827; }
    .org-sub  { font-size: 11px; color: #6b7280; margin-top: 1px; }
    .print-meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.5; }
    .print-meta strong { color: #374151; }

    /* ── TITLE BLOCK ─────────────────────────────────────── */
    .report-title  { text-align: center; font-size: 19px; font-weight: 700; margin: 10px 0 4px; letter-spacing: 0.02em; }
    .report-period { text-align: center; font-size: 12px; color: #4b5563; margin-bottom: 2px; }
    .report-filter { text-align: center; font-size: 11px; color: #9ca3af; margin-bottom: 12px; }

    /* ── META ROW ────────────────────────────────────────── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #6b7280;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #f1f5f9;
    }

    /* ── TABLE ───────────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 2px; }
    thead tr { background: ${ACCENT_COLOR}; color: #fff; }
    thead th { padding: 9px 12px; font-weight: 600; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    td { padding: 7px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .align-right  { text-align: right; }
    .align-center { text-align: center; }
    .align-left   { text-align: left; }

    /* ── SIGNATURE ───────────────────────────────────────── */
    .sig-section {
      margin-top: 52px;
      display: flex;
      justify-content: space-around;
      gap: 24px;
    }
    .sig-box   { text-align: center; font-size: 13px; flex: 1; }
    .sig-line  { margin-bottom: 4px; }
    .sig-role  { font-weight: 700; margin-top: 2px; }
    .sig-name  { color: #4b5563; }
    .sig-date  { color: #9ca3af; margin-top: 4px; }

    /* ── PRINTED BY ──────────────────────────────────────── */
    .printed-by {
      margin-top: 14px;
      font-size: 11px;
      color: #6b7280;
    }

    /* ── FOOTER ──────────────────────────────────────────── */
    .page-footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #9ca3af;
    }

    @media print {
      body { padding: 0.7cm 1cm; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
      .sig-section { margin-top: 40px; }
    }
  </style>
</head>
<body>

  <!-- PAGE HEADER -->
  <div class="page-header">
    <div class="org-info">
      <img class="org-logo" src="${LOGO_URL}" alt="logo" />
      <div>
        <div class="org-name">ระบบบริหารคลังพัสดุ HPK</div>
        <div class="org-sub">Warehouse Management System</div>
      </div>
    </div>
    <div class="print-meta">
      <div>วันที่พิมพ์: <strong>${printDate}</strong> เวลา ${printTime} น.</div>
      ${docNo ? `<div>เลขที่เอกสาร: <strong>${esc(docNo)}</strong></div>` : ""}
    </div>
  </div>

  <!-- TITLE BLOCK -->
  <div class="report-title">${esc(reportTitle)}</div>
  ${period ? `<div class="report-period">ช่วงเวลา: ${esc(period)}</div>` : ""}
  ${filterSummary ? `<div class="report-filter">${esc(filterSummary)}</div>` : ""}

  <!-- META ROW -->
  <div class="meta-row">
    <span>รวมทั้งหมด <strong>${rows.length.toLocaleString()}</strong> รายการ</span>
    ${printedByName ? `<span>ออกโดย: ${esc(printedByName)}</span>` : ""}
  </div>

  <!-- TABLE -->
  <table>
    <thead><tr>${thCells}</tr></thead>
    <tbody>${trRows}</tbody>
  </table>

  <!-- SIGNATURE -->
  ${sigSection}

  <!-- PRINTED BY (below signature) -->
  ${printedByLine}

  <!-- FOOTER -->
  <div class="page-footer">
    <span>เอกสารนี้ออกจากระบบอิเล็กทรอนิกส์ ไม่ต้องลงนามหากใช้ภายในหน่วยงาน</span>
    <span>HPK Warehouse Management System</span>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1100,height=750");
  if (!win) {
    alert("กรุณาอนุญาตให้เปิด Pop-up เพื่อพิมพ์รายงาน");
    return;
  }
  win.document.write(html);
  win.document.close();
}
