import type { Metadata } from "next";
import React from "react";
import { WeightsInventoryView } from "@/components/weights/WeightsInventoryView";

export const metadata: Metadata = {
  title: "Standard Weight Inventory & NABL 129 Gatekeeper",
  description:
    "Reference standard weight inventory, calibration traceability, and live NABL 129 expanded uncertainty gatekeeper under OIML R-76.",
};

export default function WeightsPage() {
  return <WeightsInventoryView />;
}
