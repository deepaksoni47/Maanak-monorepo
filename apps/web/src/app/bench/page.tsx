import type { Metadata } from "next";
import React from "react";
import { BenchWorkbenchView } from "@/components/bench/BenchWorkbenchView";

export const metadata: Metadata = {
  title: "Real-Time Metrology Test Bench",
  description:
    "Interactive legal metrology testing bench for OIML R-76 Clause A.4.4 Form 1 weighing performance with real-time turning point calculations.",
};

export default function BenchPage() {
  return <BenchWorkbenchView />;
}
