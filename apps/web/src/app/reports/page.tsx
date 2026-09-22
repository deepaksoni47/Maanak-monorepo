import type { Metadata } from "next";
import React from "react";
import { ReportsListView } from "@/components/reports/ReportsListView";

export const metadata: Metadata = {
  title: "Statutory Test Reports & Certificates | MAANAK",
  description:
    "Official directory of OIML R 76-2 verification certificates, digital X.509 signatures, and tamper-evident audit reports.",
};

export default function ReportsPage() {
  return <ReportsListView />;
}
