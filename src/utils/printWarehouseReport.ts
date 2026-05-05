/**
 * printWarehouseReport — PDF print utility with hospital-standard header/footer.
 *
 * พิมพ์หลายหน้า: หัวกระดาษ (โลโก้) + บล็อกลายเซ็น/หมายเหตุใช้ position:fixed ใน @media print
 * เพื่อให้ Chromium (Chrome/Edge) ซ้ำบนทุกหน้า — Firefox อาจส่งผลต่าง
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

const ACCENT = "#2563EB";

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

export interface SignerBox {
  role: string;
  name?: string | null;
  date?: string | null;
}

export interface PrintWarehouseReportOptions {
  reportTitle: string;
  period?: string;
  filterSummary?: string;
  docNo?: string;
  columns: PrintColumn[];
  rows: Record<string, string | number | undefined | null>[];
  printedBy?: PrintedBy;
  signers?: SignerBox[];
  signatureRoles?: string[];
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
    signers,
    signatureRoles = ["ผู้ออกรายงาน", "ผู้ตรวจสอบ"],
    showSignature = true,
  } = options;

  const todayShort = new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

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

  // First signer auto-filled with reporter name + today's date
  const resolvedSigners: SignerBox[] = signers
    ? signers
    : signatureRoles.map((role, i) => ({
        role,
        name: i === 0 && printedByName ? printedByName : null,
        date: i === 0 && printedByName ? todayShort : null,
      }));

  // ── Table cells ───────────────────────────────────────────────────────────
  const thCells = columns
    .map((c) => `<th class="align-${c.align ?? "left"}">${esc(c.header)}</th>`)
    .join("");

  const trRows = rows
    .map((row) => {
      const cells = columns
        .map((c) => `<td class="align-${c.align ?? "left"}">${esc(row[c.key])}</td>`)
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  // ── Signature boxes ───────────────────────────────────────────────────────
  const sigSection = showSignature
    ? `<div class="sig-section">
        ${resolvedSigners
          .map(
            ({ role, name, date }) => `
          <div class="sig-box">
            <p class="sig-line">(ลงชื่อ)..................................................${esc(role)}</p>
            <p class="sig-name">${name ? `(..........${esc(name)}..........)` : "(..................................................)"}</p>
            <p class="sig-date">วันที่${date ? `&nbsp;${esc(date)}` : "........./........./........."}</p>
          </div>`
          )
          .join("")}
      </div>`
    : "";

  // ── HTML document ─────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${esc(reportTitle)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    /* ระยะเว้นสำหรับ fixed header/footer ตอนพิมพ์ — ปรับให้พอดีกับความสูงจริงของบล็อก */
    :root {
      --print-header-block-h: 34mm;
      --print-footer-block-h: ${showSignature ? "46mm" : "22mm"};
    }

    @page { size: A4 portrait; margin: 0; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif;
      font-size: 13px;
      color: #111827;
      background: #fff;
      padding: 1.2cm 1.5cm;
      width: 210mm;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* ── PAGE HEADER (บนจอ: อยู่ใน flow; ตอนพิมพ์: fixed ซ้ำทุกหน้าใน Chromium) ── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 14px;
      border-bottom: 1px solid #e5e7eb;
      background: #fff;
    }
    .org-info  { display: flex; align-items: center; gap: 12px; }
    .org-logo  { width: 56px; height: 56px; object-fit: contain; }
    .org-name  { font-size: 17px; font-weight: 700; color: #111827; }
    .org-dept  { font-size: 12px; color: #4b5563; margin-top: 1px; }
    .org-addr  { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .print-meta { text-align: right; font-size: 11px; color: #6b7280; line-height: 1.6; }
    .print-meta .doc-no { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 2px; }

    /* ── เนื้อหารายงาน (ไม่รวมหัวลายเซ็นต์ที่พิมพ์ซ้ำ) ── */
    .print-main { }

    /* ── TITLE BLOCK ─────────────────────────────────────── */
    .report-title  { text-align: center; font-size: 19px; font-weight: 700; margin: 16px 0 4px; letter-spacing: 0.03em; }
    .report-period { text-align: center; font-size: 12px; color: #4b5563; margin-bottom: 2px; }
    .report-filter { text-align: center; font-size: 11px; color: #9ca3af; margin-bottom: 12px; }

    /* ── TABLE ───────────────────────────────────────────── */
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 2px; }
    thead { display: table-header-group; }
    thead tr { background: ${ACCENT}; color: #fff; }
    thead th { padding: 10px 12px; font-size: 13px; font-weight: 700; white-space: nowrap; letter-spacing: 0.02em; }
    tbody tr { page-break-inside: avoid; }
    tbody tr:nth-child(even) { background: #f0f6ff; }
    tbody tr:hover { background: #e8f0fe; }
    td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: middle; color: #111827; font-size: 13px; }
    .align-right  { text-align: right; }
    .align-center { text-align: center; }
    .align-left   { text-align: left; }

    /* ── SIGNATURE + หมายเหตุท้าย (บนจอ: flow; ตอนพิมพ์: fixed ซ้ำทุกหน้า) ── */
    .print-footer-block {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      background: #fff;
    }
    .sig-section { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 8px; }
    .sig-box  { text-align: center; font-size: 13px; min-width: 120px; }
    .sig-line { margin-bottom: 6px; }
    .sig-name { margin-bottom: 6px; }
    .sig-date { margin: 0; }

    .page-footer {
      margin-top: 10px;
      padding-top: 6px;
      text-align: right;
      font-size: 10px;
      color: #9ca3af;
      font-style: italic;
    }

    @media print {
      body {
        padding: 0 12mm;
        padding-top: var(--print-header-block-h);
        padding-bottom: var(--print-footer-block-h);
        width: 100%;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .page-header {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        width: 100%;
        margin: 0;
        padding: 6mm 12mm 5mm 12mm;
        border-bottom: 1px solid #e5e7eb;
        z-index: 1000;
      }

      .print-footer-block {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        margin: 0;
        padding: 4mm 12mm 6mm 12mm;
        border-top: 1px solid #e5e7eb;
        z-index: 1000;
      }

      .print-main {
        position: relative;
        z-index: 1;
      }

      table { page-break-inside: auto; }
      thead { display: table-header-group; }
      tbody { display: table-row-group; }
    }
  </style>
</head>
<body>

  <!-- หัวกระดาษ: พิมพ์ซ้ำทุกหน้า (Chrome / Edge) -->
  <div class="page-header">
    <div class="org-info">
      <img class="org-logo" src="${LOGO_URL}" alt="logo" />
      <div>
        <div class="org-name">โรงพยาบาลวัดห้วยปลากั้งเพื่อสังคม</div>
        <div class="org-dept">คลังหลักโรงพยาบาล</div>
        <div class="org-addr">เลขที่ 553/11 หมู่ 14 ตำบลริมกก อำเภอเมืองเชียงราย จังหวัดเชียงราย 57100</div>
      </div>
    </div>
    <div class="print-meta">
      ${docNo ? `<div class="doc-no">${esc(docNo)}</div>` : ""}
      <div>วันที่พิมพ์: ${printDate} เวลา ${printTime} น.</div>
    </div>
  </div>

  <div class="print-main">
    <h1 class="report-title">${esc(reportTitle)}</h1>
    ${period ? `<div class="report-period">ช่วงเวลา: ${esc(period)}</div>` : ""}
    ${filterSummary ? `<div class="report-filter">${esc(filterSummary)}</div>` : ""}

    <table>
      <thead><tr>${thCells}</tr></thead>
      <tbody>${trRows}</tbody>
    </table>
  </div>

  <!-- ลายเซ็น + หมายเหตุ: พิมพ์ซ้ำทุกหน้า -->
  <div class="print-footer-block">
    ${sigSection}
    <div class="page-footer">
      หมายเหตุ: เอกสารนี้ถูกสร้างจากระบบอิเล็กทรอนิกส์ ไม่ต้องลงนามหากใช้ภายในหน่วยงาน
    </div>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  // ── Print via hidden iframe — no new tab, no URL in address bar ───────────
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => iframe.remove(), 60_000);
}
