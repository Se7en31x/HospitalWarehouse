"use client";

import { useRef } from "react";
import Barcode from "react-barcode";
import QRCode from "react-qr-code";
import { Printer } from "lucide-react";

export interface BarcodePrinterProps {
  value: string;
  type?: "BARCODE" | "QR";
  label?: string;
  subLabel?: string;
  /** Size of the inline preview (default: "md") */
  size?: "sm" | "md" | "lg";
}

const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 5cm;
    height: 3cm;
    overflow: hidden;
  }

  .label {
    width: 5cm;
    height: 3cm;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2mm;
    font-family: 'Sarabun', 'Tahoma', sans-serif;
  }

  /* ── BARCODE layout ── */
  .label--barcode {
    flex-direction: column;
    gap: 1mm;
  }
  .label--barcode .text-label {
    font-size: 6pt;
    font-weight: 700;
    text-align: center;
    max-width: 4.6cm;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .label--barcode .text-sub {
    font-size: 5pt;
    text-align: center;
    color: #444;
    max-width: 4.6cm;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .label--barcode svg {
    max-width: 4.6cm;
    height: auto;
  }

  /* ── QR layout ── */
  .label--qr {
    flex-direction: row;
    gap: 2mm;
  }
  .label--qr svg {
    width: 2.2cm;
    height: 2.2cm;
    flex-shrink: 0;
  }
  .label--qr .qr-text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1mm;
    max-width: 2.4cm;
  }
  .label--qr .text-label {
    font-size: 6pt;
    font-weight: 700;
    word-break: break-word;
    line-height: 1.2;
  }
  .label--qr .text-sub {
    font-size: 5pt;
    color: #444;
    word-break: break-word;
    line-height: 1.2;
  }
  .label--qr .text-value {
    font-size: 5pt;
    font-family: monospace;
    color: #666;
    word-break: break-all;
  }
`;

export default function BarcodePrinter({
  value,
  type = "BARCODE",
  label,
  subLabel,
  size = "md",
}: BarcodePrinterProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printAreaRef.current) return;

    const win = window.open("", "_blank", "width=300,height=200,toolbar=0,menubar=0,scrollbars=0");
    if (!win) return;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${label ?? value}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  ${printAreaRef.current.innerHTML}
</body>
</html>`);
    win.document.close();

    // Give images/fonts a moment to render before triggering print
    win.onload = () => {
      win.focus();
      win.print();
      win.close();
    };
    // Fallback if onload already fired
    setTimeout(() => {
      try { win.print(); win.close(); } catch { /* already closed */ }
    }, 500);
  };

  // ── Inline preview sizing ──────────────────────────────────────────────────
  const barcodeWidth = size === "sm" ? 1.2 : size === "lg" ? 2 : 1.6;
  const barcodeHeight = size === "sm" ? 32 : size === "lg" ? 56 : 44;
  const qrSize = size === "sm" ? 52 : size === "lg" ? 88 : 68;

  return (
    <div className="inline-flex items-center gap-2">

      {/* ── Hidden print-ready area (written into the popup) ── */}
      <div ref={printAreaRef} style={{ display: "none" }} aria-hidden="true">
        {type === "BARCODE" ? (
          <div className="label label--barcode">
            {label && <span className="text-label">{label}</span>}
            {subLabel && <span className="text-sub">{subLabel}</span>}
            {/* react-barcode renders an <svg> which innerHTML captures cleanly */}
            <Barcode
              value={value}
              width={1.4}
              height={40}
              fontSize={9}
              margin={0}
              displayValue
            />
          </div>
        ) : (
          <div className="label label--qr">
            <QRCode value={value} size={80} />
            <div className="qr-text">
              {label && <span className="text-label">{label}</span>}
              {subLabel && <span className="text-sub">{subLabel}</span>}
              <span className="text-value">{value}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Visible inline preview ── */}
      <div className="flex flex-col items-center gap-0.5">
        {type === "BARCODE" ? (
          <Barcode
            value={value}
            width={barcodeWidth}
            height={barcodeHeight}
            fontSize={9}
            margin={0}
            displayValue
          />
        ) : (
          <div className="flex items-center gap-2">
            <QRCode value={value} size={qrSize} />
            {(label || subLabel) && (
              <div className="flex flex-col gap-0.5 max-w-[120px]">
                {label && (
                  <span className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">
                    {label}
                  </span>
                )}
                {subLabel && (
                  <span className="text-[10px] text-gray-500 leading-tight line-clamp-2">
                    {subLabel}
                  </span>
                )}
                <span className="text-[9px] font-mono text-gray-400 break-all">{value}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Print button ── */}
      <button
        type="button"
        onClick={handlePrint}
        title="พิมพ์ฉลาก"
        className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors flex-shrink-0"
      >
        <Printer className="w-3.5 h-3.5" />
        พิมพ์
      </button>
    </div>
  );
}
