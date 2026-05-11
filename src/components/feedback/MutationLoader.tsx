"use client";

import type { CSSProperties } from "react";

export interface MutationLoaderProps {
  /** เปิด/ปิด overlay */
  open: boolean;
  /** ข้อความใต้ animation (default: "กำลังบันทึก...") */
  message?: string;
  /** ขนาดของ spinner หน่วย px (default: 50) */
  size?: number;
  /** ซ่อน message text (default: false) */
  hideMessage?: boolean;
}

/**
 * Full-screen overlay สำหรับการแสดง loading ตอน mutation (save/edit/delete)
 *
 * ใช้สำหรับ "การกระทำของผู้ใช้" เท่านั้น (เช่น กดบันทึก, ลบ, อัปเดต)
 * — ไม่ใช่สำหรับ loading ข้อมูลครั้งแรก (data fetching) ซึ่งควรใช้ skeleton
 *
 * Spinner: 4-dot circular pattern (วงนอก + วงใน หมุนคนละความเร็ว)
 * Reference: https://cssloaders.github.io/
 *
 * @example
 *   <MutationLoader open={isSaving} message="กำลังบันทึกการรับเข้า..." />
 */
export default function MutationLoader({
  open,
  message = "กำลังบันทึก...",
  size = 50,
  hideMessage = false,
}: MutationLoaderProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-slate-900/45 backdrop-blur-sm"
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <Spinner size={size} />
      {!hideMessage && message ? (
        <p className="text-sm font-semibold text-white/90 drop-shadow">
          {message}
        </p>
      ) : null}
    </div>
  );
}

/**
 * 4-dot circular spinner — ใช้ pseudo-elements + radial-gradient
 * วงนอก: blue-500 dot ใหญ่
 * วงใน: blue-300 dot เล็ก หมุนเร็วกว่า (linear timing)
 */
function Spinner({ size }: { size: number }) {
  // คำนวณสัดส่วนตามขนาด — ฐาน design = 50px
  const styleVars = {
    "--mu-size": `${size}px`,
    "--mu-margin": `${size * 0.08}px`,
    "--mu-outer-dot": `${size * 0.24}px`,
    "--mu-inner-dot": `${size * 0.16}px`,
  } as CSSProperties;

  return (
    <>
      <div
        className="mutation-spinner"
        style={styleVars}
        aria-hidden="true"
      />
      <style jsx>{`
        .mutation-spinner {
          width: var(--mu-size);
          aspect-ratio: 1;
          display: grid;
        }

        .mutation-spinner::before,
        .mutation-spinner::after {
          content: "";
          grid-area: 1 / 1;
          background:
            no-repeat radial-gradient(farthest-side, #3b82f6 92%, transparent) 50% 0,
            no-repeat radial-gradient(farthest-side, #3b82f6 92%, transparent) 50% 100%,
            no-repeat radial-gradient(farthest-side, #3b82f6 92%, transparent) 100% 50%,
            no-repeat radial-gradient(farthest-side, #3b82f6 92%, transparent) 0 50%;
          background-size: var(--mu-outer-dot) var(--mu-outer-dot);
          animation: mutation-rot 1s infinite;
        }

        .mutation-spinner::before {
          margin: var(--mu-margin);
          background:
            no-repeat radial-gradient(farthest-side, #93c5fd 92%, transparent) 50% 0,
            no-repeat radial-gradient(farthest-side, #93c5fd 92%, transparent) 50% 100%,
            no-repeat radial-gradient(farthest-side, #93c5fd 92%, transparent) 100% 50%,
            no-repeat radial-gradient(farthest-side, #93c5fd 92%, transparent) 0 50%;
          background-size: var(--mu-inner-dot) var(--mu-inner-dot);
          animation-timing-function: linear;
        }

        @keyframes mutation-rot {
          100% {
            transform: rotate(0.5turn);
          }
        }
      `}</style>
    </>
  );
}
