"use client";

import React, { useState } from "react";
import PurchaseReceiveForm from "./PurchaseReceiveForm";
import DonationReceiveForm from "./DonationReceiveForm";
import AssetReceiveForm from "./AssetReceiveForm";

type ReceiveType = "purchase" | "donation" | "purchase-asset";

export default function ReceiveFormPage() {
  const [receiveType, setReceiveType] = useState<ReceiveType>("purchase");

  const handleChangeType = (type: ReceiveType) => {
    setReceiveType(type);
  };

  switch (receiveType) {
    case "donation":
      return <DonationReceiveForm onChangeType={handleChangeType} />;
    case "purchase-asset":
      return <AssetReceiveForm onChangeType={handleChangeType} />;
    default:
      return <PurchaseReceiveForm onChangeType={handleChangeType} />;
  }
}


