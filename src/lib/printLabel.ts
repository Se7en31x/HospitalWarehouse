/* eslint-disable @typescript-eslint/no-explicit-any */
// Thermal-label print utility — 5 cm × 3 cm per label, CODE128 barcode

export interface LabelData {
  name: string;
  code: string;
  subLabel?: string;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function makeSvg(code: string): string {
  const JsBarcode = (window as any).JsBarcode ?? require("jsbarcode");
  const svgEl = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svgEl, code, {
    format: "CODE128",
    width: 1.5,
    height: 44,
    fontSize: 9,
    margin: 0,
    displayValue: true,
    font: "Tahoma",
    textMargin: 2,
  });
  return svgEl.outerHTML;
}

const LABEL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  @page { size: 5cm 3cm; margin: 0; }

  html, body {
    width: 5cm;
    background: #fff;
    font-family: 'Sarabun', 'Tahoma', sans-serif;
  }

  .label {
    width: 5cm;
    height: 3cm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2mm 2mm;
    gap: 1mm;
    overflow: hidden;
    page-break-after: always;
  }
  .label:last-child { page-break-after: auto; }

  .text-name {
    font-size: 7pt;
    font-weight: 700;
    text-align: center;
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .text-sub {
    font-size: 5.5pt;
    text-align: center;
    color: #444;
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .label svg {
    max-width: 4.6cm;
    width: 100%;
    height: auto;
    display: block;
  }

  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
`;

export function printLabels(labels: LabelData[]): void {
  if (labels.length === 0) return;

  // Build SVG strings inside the current document context
  const svgs = labels.map((l) => {
    try { return makeSvg(l.code); } catch { return ""; }
  });

  const labelsHtml = labels
    .map(
      ({ name, subLabel }, i) => `
<div class="label">
  <span class="text-name">${escHtml(name)}</span>
  ${subLabel ? `<span class="text-sub">${escHtml(subLabel)}</span>` : ""}
  ${svgs[i]}
</div>`
    )
    .join("\n");

  const win = window.open(
    "",
    "_blank",
    "width=340,height=220,toolbar=0,menubar=0,scrollbars=0,resizable=0"
  );
  if (!win) return;

  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>พิมพ์ฉลาก (${labels.length} ดวง)</title>
  <style>${LABEL_CSS}</style>
</head>
<body>
${labelsHtml}
</body>
</html>`);
  win.document.close();

  win.onload = () => {
    win.focus();
    win.print();
    win.close();
  };
  // Fallback — onload may already have fired
  setTimeout(() => {
    try { win.print(); win.close(); } catch { /* already closed */ }
  }, 600);
}
