"use client";

import React from "react";
import type { ReportPage } from "./ReportTypeSelector";
import { REPORT_HEADER, SECTION_THEME } from "./reportHeaderTheme";

export type ReportDetailPageHeaderProps = {
  reportPage: Exclude<ReportPage, "all">;
  title: string;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  /** ปุ่มด้านขวา (เช่น รีเฟรช) — อยู่ก่อนปุ่มย้อนกลับ */
  trailingActions?: React.ReactNode;
  /** แท็บหรือบล็อกเพิ่มใต้แถบหัวหลัก ภายในกล่อง header */
  children?: React.ReactNode;
};

export function ReportDetailPageHeader({
  reportPage,
  title,
  subtitle,
  onBack,
  trailingActions,
  children,
}: ReportDetailPageHeaderProps) {
  const { section, Icon } = REPORT_HEADER[reportPage];
  const st = SECTION_THEME[section];

  return (
    <div className="bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${st.iconBox} ${st.iconFg} ${st.iconRing}`}
          >
            <Icon className="h-7 w-7" strokeWidth={2.35} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h1>
            {subtitle != null ? (
              <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {trailingActions}
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">
              ย้อนกลับ
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
