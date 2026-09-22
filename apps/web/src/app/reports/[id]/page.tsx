import type { Metadata } from "next";
import React from "react";
import { ReportDetailView } from "@/components/reports/ReportDetailView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return [
    { id: "TS-2026-0142" },
    { id: "TS-2026-0140" },
    { id: "TS-2026-0089" },
  ];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `OIML R 76-2 Test Certificate #${id}`,
    description: `Official OIML R 76-2 test certificate, vector error curve, and Director X.509 PKI digital signature preview for session ${id}.`,
  };
}

export default async function ReportPage({ params }: PageProps) {
  const { id } = await params;
  return <ReportDetailView id={id} />;
}
