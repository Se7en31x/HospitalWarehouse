import type { LucideIcon } from "lucide-react";
import {
  Warehouse,
  RotateCcw,
  PackagePlus,
  TrendingUp,
  Package,
  ArrowDownUp,
  FileText,
  FlaskConical,
  DollarSign,
  ClipboardCheck,
  BarChart3,
  AlarmClock,
  Stethoscope,
  Cpu,
} from "lucide-react";
import type { ReportPage } from "./ReportTypeSelector";

export type SectionTheme = "stock" | "inbound" | "flow" | "assets";

/** ชุดสีหมวด — ใช้หน้าหลัก + หน้ารายละเอียด */
export const SECTION_THEME: Record<
  SectionTheme,
  {
    rail: string;
    chip: string;
    iconBox: string;
    iconFg: string;
    iconRing: string;
    sectionRule: string;
    cardHover: string;
  }
> = {
  stock: {
    rail: "from-sky-600 to-blue-700",
    chip: "bg-sky-100 text-sky-900 ring-1 ring-sky-200/90",
    iconBox: "bg-gradient-to-br from-sky-500 to-blue-600 shadow-md shadow-sky-500/25",
    iconFg: "text-white",
    iconRing: "ring-2 ring-sky-300/70 ring-offset-2 ring-offset-white",
    sectionRule: "border-b-sky-200/90",
    cardHover: "hover:border-sky-300 hover:shadow-sky-500/10",
  },
  inbound: {
    rail: "from-emerald-600 to-teal-600",
    chip: "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/90",
    iconBox: "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/25",
    iconFg: "text-white",
    iconRing: "ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-white",
    sectionRule: "border-b-emerald-200/90",
    cardHover: "hover:border-emerald-300 hover:shadow-emerald-500/10",
  },
  flow: {
    rail: "from-violet-600 to-fuchsia-600",
    chip: "bg-violet-100 text-violet-900 ring-1 ring-violet-200/90",
    iconBox: "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-md shadow-violet-500/25",
    iconFg: "text-white",
    iconRing: "ring-2 ring-violet-300/70 ring-offset-2 ring-offset-white",
    sectionRule: "border-b-violet-200/90",
    cardHover: "hover:border-violet-300 hover:shadow-violet-500/10",
  },
  assets: {
    rail: "from-amber-600 to-orange-600",
    chip: "bg-amber-100 text-amber-900 ring-1 ring-amber-200/90",
    iconBox: "bg-gradient-to-br from-amber-500 to-orange-600 shadow-md shadow-amber-500/25",
    iconFg: "text-white",
    iconRing: "ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white",
    sectionRule: "border-b-amber-200/90",
    cardHover: "hover:border-amber-300 hover:shadow-amber-500/10",
  },
};

/** แท็บใต้หัวข้อ — สี active ให้สอดคล้องหมวด */
export const SECTION_TAB_ACTIVE: Record<SectionTheme, string> = {
  stock:   "bg-sky-600 text-white border-sky-600",
  inbound: "bg-emerald-600 text-white border-emerald-600",
  flow:    "bg-violet-600 text-white border-violet-600",
  assets:  "bg-amber-600 text-white border-amber-600",
};

export type ReportHeaderPage = Exclude<ReportPage, "all">;

/** ไอคอน + หมวดสี — ต้องตรงกับหน้าเลือกรายงานหลัก */
export const REPORT_HEADER: Record<ReportHeaderPage, { section: SectionTheme; Icon: LucideIcon }> = {
  "all-items":         { section: "stock",   Icon: Package },
  "stock-balance":     { section: "stock",   Icon: ArrowDownUp },
  "inventory-balance": { section: "stock",   Icon: Warehouse },
  "low-stock":         { section: "stock",   Icon: FileText },
  "expired-lots":      { section: "stock",   Icon: FlaskConical },
  "item-ranking":      { section: "stock",   Icon: TrendingUp },
  "inventory-value":   { section: "stock",   Icon: DollarSign },
  "receive-report":    { section: "inbound", Icon: PackagePlus },
  "requisition":       { section: "flow",    Icon: ClipboardCheck },
  "dept-consumption":  { section: "flow",    Icon: BarChart3 },
  "return-condition":  { section: "flow",    Icon: RotateCcw },
  "overdue-borrow":    { section: "flow",    Icon: AlarmClock },
  "assets":            { section: "assets",  Icon: Cpu },
  "reusable-items":    { section: "assets",  Icon: Stethoscope },
};
