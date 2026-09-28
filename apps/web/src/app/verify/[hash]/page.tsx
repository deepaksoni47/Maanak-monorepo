import type { Metadata } from "next";
import React from "react";
import { PublicVerificationView } from "@/components/verify/PublicVerificationView";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ hash: string }>;
}

export async function generateStaticParams() {
  return [
    {
      hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    },
    {
      hash: "4a58b8f72a91283d5a84e2098d63a89047bf1b2c45e6d78a9c1e0f3b4a58b8f7",
    },
    {
      hash: "0x8fa37b12d94e77",
    },
    {
      hash: "0x8fa37b12d94e7732a10b8cf6347209",
    },
    {
      hash: "tampered-hash-violation",
    },
  ];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { hash } = await params;
  const shortHash = hash.slice(0, 10);
  return {
    title: `Public Verification [${shortHash}...]`,
    description: `Public verification and cryptographic provenance audit for OIML R-76 test certificate hash ${hash}.`,
  };
}

export default async function VerifyPage({ params }: PageProps) {
  const { hash } = await params;
  return <PublicVerificationView hash={hash} />;
}
