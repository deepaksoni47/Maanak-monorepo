import type { Metadata } from "next";
import React from "react";
import { InstrumentIntakeView } from "@/components/instruments/InstrumentIntakeView";

export const metadata: Metadata = {
  title: "New Instrument Intake & Classification",
  description:
    "Intake Non-Automatic Weighing Instruments (NAWI) with real-time OIML R-76 Table 3 classification and pattern approval registration.",
};

export default function NewInstrumentPage() {
  return <InstrumentIntakeView />;
}
