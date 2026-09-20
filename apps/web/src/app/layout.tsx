import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "MAANAK (मानक) — Metrological Automation & Analysis Network",
  description: "Automated OIML R-76 NAWI Test Report & Compliance Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
