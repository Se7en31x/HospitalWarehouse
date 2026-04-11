"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AssetClient from "./AssetClient";
import ReusableUnitClient from "./reusable-unit-client";
import { UiItem } from "@/services/itemsService";

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

  const emptyItems: UiItem[] = [];

  return (
    <div>
      {mode === "med-asset" ? (
        <AssetClient initialItems={emptyItems} />
      ) : (
        <ReusableUnitClient />
      )}
    </div>
  );
}
