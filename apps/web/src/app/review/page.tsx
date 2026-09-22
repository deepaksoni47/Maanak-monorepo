import type { Metadata } from "next";
import React from "react";
import { ReviewAuditView } from "@/components/review/ReviewAuditView";

export const metadata: Metadata = {
  title: "Senior Reviewer Anomaly Audit",
  description:
    "Senior metrology reviewer anomaly audit queue, derivation tree inspection, and decision workflow under OIML R-76.",
};

export default function ReviewPage() {
  return <ReviewAuditView />;
}
