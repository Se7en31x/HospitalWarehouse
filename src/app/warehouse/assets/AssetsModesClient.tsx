"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AssetClient from "./AssetClient";
import ReusableUnitClient from "./reusable-unit-client";

type Mode = "med-asset" | "reusable";

export default function AssetsModesClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("reusable");

  useEffect(() => {
    const modeParam = searchParams.get("mode") as Mode | null;
    if (modeParam === "med-asset" || modeParam === "reusable") {
      setMode(modeParam);
    }
  }, [searchParams]);

  return (
    <div>
      {mode === "med-asset" ? <AssetClient /> : <ReusableUnitClient />}
    </div>
  );
}
