import type { Metadata } from "next";
import React from "react";
import { RulePacksView } from "@/components/rule-packs/RulePacksView";

export const metadata: Metadata = {
  title: "Standards-as-Code & Statutory Rule Packs | MAANAK",
  description:
    "Explore compiled OIML R-76 and Legal Metrology Act 2009 statutory rules, Table 3 NAWI classes, and Table 6 MPE evaluation algorithms.",
};

export default function RulePacksPage() {
  return <RulePacksView />;
}
