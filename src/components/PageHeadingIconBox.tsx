"use client";

import type { LucideIcon } from "lucide-react";

/** โทนสีไล่ระดับ + กรอบแบบเดียวกับการ์ดรายงานย่อยใน `ReportsWrapper` / `ReportDetailPageHeader` */
export type PageHeadingIconTone =
  | "stock"
  | "inbound"
  | "flow"
  | "assets"
  | "blue"
  | "sky"
  | "cyan"
  | "orange"
  | "indigo"
  | "violet"
  | "teal"
  | "amber"
  | "slate"
  | "rose"
  | "brand";

const TONE: Record<PageHeadingIconTone, { box: string; ring: string }> = {
  stock: {
    box: "bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-sky-500/25",
    ring: "ring-2 ring-sky-300/70 ring-offset-2 ring-offset-white",
  },
  inbound: {
    box: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25",
    ring: "ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-white",
  },
  flow: {
    box: "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/25",
    ring: "ring-2 ring-violet-300/70 ring-offset-2 ring-offset-white",
  },
  assets: {
    box: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25",
    ring: "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white",
  },
  blue: {
    box: "bg-gradient-to-br from-blue-500 to-blue-700 shadow-md shadow-blue-500/25",
    ring: "ring-2 ring-blue-300/70 ring-offset-2 ring-offset-white",
  },
  sky: {
    box: "bg-gradient-to-br from-sky-500 to-sky-700 shadow-md shadow-sky-500/25",
    ring: "ring-2 ring-sky-300/70 ring-offset-2 ring-offset-white",
  },
  cyan: {
    box: "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-md shadow-cyan-500/25",
    ring: "ring-2 ring-cyan-300/70 ring-offset-2 ring-offset-white",
  },
  orange: {
    box: "bg-gradient-to-br from-orange-500 to-orange-700 shadow-md shadow-orange-500/25",
    ring: "ring-2 ring-orange-300/70 ring-offset-2 ring-offset-white",
  },
  indigo: {
    box: "bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-md shadow-indigo-500/25",
    ring: "ring-2 ring-indigo-300/70 ring-offset-2 ring-offset-white",
  },
  violet: {
    box: "bg-gradient-to-br from-violet-500 to-violet-700 shadow-md shadow-violet-500/25",
    ring: "ring-2 ring-violet-300/70 ring-offset-2 ring-offset-white",
  },
  teal: {
    box: "bg-gradient-to-br from-teal-500 to-teal-700 shadow-md shadow-teal-500/25",
    ring: "ring-2 ring-teal-300/70 ring-offset-2 ring-offset-white",
  },
  amber: {
    box: "bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-500/25",
    ring: "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white",
  },
  slate: {
    box: "bg-gradient-to-br from-slate-500 to-slate-700 shadow-md shadow-slate-500/25",
    ring: "ring-2 ring-slate-300/70 ring-offset-2 ring-offset-white",
  },
  rose: {
    box: "bg-gradient-to-br from-rose-500 to-rose-700 shadow-md shadow-rose-500/25",
    ring: "ring-2 ring-rose-300/70 ring-offset-2 ring-offset-white",
  },
  brand: {
    box: "bg-gradient-to-br from-[#0055FF] to-blue-700 shadow-md shadow-[#0055FF]/30",
    ring: "ring-2 ring-blue-300/70 ring-offset-2 ring-offset-white",
  },
};

export type PageHeadingIconBoxProps = {
  icon: LucideIcon;
  tone: PageHeadingIconTone;
  className?: string;
  iconClassName?: string;
  strokeWidth?: number;
};

export function PageHeadingIconBox({
  icon: Icon,
  tone,
  className = "",
  iconClassName = "h-7 w-7",
  strokeWidth = 2.35,
}: PageHeadingIconBoxProps) {
  const t = TONE[tone];
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white ${t.box} ${t.ring} ${className}`.trim()}
      aria-hidden
    >
      <Icon className={iconClassName} strokeWidth={strokeWidth} />
    </div>
  );
}
