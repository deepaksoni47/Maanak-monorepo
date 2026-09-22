import type { Metadata } from "next";
import React from "react";
import { ProvenanceView } from "@/components/provenance/ProvenanceView";

export const metadata: Metadata = {
  title: "WELMEC 7.2 Cryptographic Provenance Ledger | MAANAK",
  description:
    "Explore the immutable append-only cryptographic event chain guaranteeing audit compliance under WELMEC 7.2 Guide.",
};

export default function ProvenancePage() {
  return <ProvenanceView />;
}
