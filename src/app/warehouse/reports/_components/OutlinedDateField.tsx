"use client";

import React, { useState } from "react";

/** Outlined-style date field — label straddling top border; เหลี่ยมสูง h-10 ให้ชิดกับ input แถบเดียวกัน */
export const OutlinedDateField: React.FC<{
	label: string;
	value: string;
	onChange: (v: string) => void;
	className?: string;
}> = ({ label, value, onChange, className = "" }) => {
	const [focused, setFocused] = useState(false);

	return (
		<div
			className={`relative h-10 w-[168px] shrink-0 rounded-lg border bg-white shadow-sm transition-colors flex items-center px-3 ${
				focused ? "border-blue-500 ring-2 ring-blue-500/30" : "border-slate-300"
			} ${className}`}
		>
			<span className="absolute -top-2 left-3 z-[3] bg-white px-1 text-[11px] font-medium text-slate-600 leading-none">
				{label}
			</span>
			<div className="relative flex flex-1 min-w-0 items-center gap-1 h-full">
				<input
					type="date"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onFocus={() => setFocused(true)}
					onBlur={() => setFocused(false)}
					className={`relative z-[1] flex-1 min-w-0 h-full bg-transparent text-sm outline-none leading-none py-0 [color-scheme:light] ${
						!value ? "text-transparent caret-slate-800" : "text-slate-800"
					}`}
				/>
				{!value && !focused && (
					<span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 z-[2] text-sm text-slate-400 select-none leading-none">
						dd/mm/yyyy
					</span>
				)}
			</div>
		</div>
	);
};
