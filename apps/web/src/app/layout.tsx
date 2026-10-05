import type { Metadata, Viewport } from "next";
import React from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: {
    template: "%s | MAANAK (मानक) — OIML R-76 Legal Metrology",
    default: "MAANAK (मानक) — OIML R-76 Legal Metrology Workbench",
  },
  description:
    "Automated OIML R-76 NAWI Test Report, Compliance Verification & Cryptographic Provenance Platform under Section 22 of the Legal Metrology Act, 2009",
  keywords: [
    "OIML R-76",
    "Legal Metrology",
    "NAWI",
    "Model Approval",
    "RRSL",
    "Weighing Instruments",
    "NABL 129",
    "WELMEC 7.2",
  ],
  authors: [{ name: "Department of Consumer Affairs, Government of India" }],
  icons: {
    icon: "/favicon.ico",
  },
};

import { AuthProvider } from "@/lib/auth-context";
import { FacilityProvider } from "@/lib/facility-context";
import { LanguageProvider } from "@/lib/language-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
        <LanguageProvider>
          <AuthProvider>
            <FacilityProvider>
              {children}
            </FacilityProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
