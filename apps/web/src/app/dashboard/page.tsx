import type { Metadata } from "next";
import React from "react";
import { DashboardView } from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard & Lab Analytics",
  description:
    "Laboratory executive metrics, active test sessions, and verification queue under OIML R-76.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
