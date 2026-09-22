import type { Metadata } from "next";
import React from "react";
import { InstrumentsListView } from "@/components/instruments/InstrumentsListView";

export const metadata: Metadata = {
  title: "Instrument Registry & Verification Roster | MAANAK",
  description:
    "Official directory of registered Non-Automatic Weighing Instruments (NAWI) undergoing OIML R-76 statutory verification.",
};

export default function InstrumentsPage() {
  return <InstrumentsListView />;
}
