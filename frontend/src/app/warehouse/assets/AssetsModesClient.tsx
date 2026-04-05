"use client";

import { useState } from "react";
import AssetClient from "./AssetClient";
import ReusableUnitClient from "./reusable-unit-client";

type Mode = "med-asset" | "reusable";

export default function AssetsModesClient() {
  const [mode, setMode] = useState<Mode>("reusable");

  return (
    <div>
      <div className="px-8 pt-6 pb-2 bg-white border-b border-slate-100">
        <div className="inline-flex rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setMode("reusable")}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "reusable" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            ของใช้ซ้ำรายชิ้น (Reusable)
          </button>
          <button
            onClick={() => setMode("med-asset")}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              mode === "med-asset" ? "bg-blue-600 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            ครุภัณฑ์ภายในองค์กร (Med Asset)
          </button>
        </div>
      </div>

      {mode === "med-asset" ? <AssetClient /> : <ReusableUnitClient />}
    </div>
  );
}
