"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layout/Shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { QrCode, ShieldCheck, MagnifyingGlass, ArrowRight, CheckCircle, WarningOctagon, LockKey } from "@phosphor-icons/react";

const SAMPLE_HASHES = [
  {
    label: "Authentic Certificate #TS-2026-0142 (Essae DS-215)",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    status: "PASS",
  },
  {
    label: "Authentic Certificate #TS-2026-0140 (Mettler Toledo)",
    hash: "4a58b8f72a91283d5a84e2098d63a89047bf1b2c45e6d78a9c1e0f3b4a58b8f7",
    status: "PASS",
  },
  {
    label: "Tampered Test Hash (Cryptographic Audit Alarm)",
    hash: "tampered-hash-violation",
    status: "TAMPER DETECTED",
  },
];

export default function PublicVerifyLookupPage() {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    // Safe fallback for isolated SSR and static unit testing
  }

  const [searchHash, setSearchHash] = useState<string>("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchHash.trim();
    if (clean) {
      if (router) {
        router.push(`/verify/${encodeURIComponent(clean)}`);
      } else if (typeof window !== "undefined") {
        window.location.href = `/verify/${encodeURIComponent(clean)}`;
      }
    }
  };

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Public Verification Portal" },
      ]}
      pageTitle="National Metrological Verification Portal"
      pageSubtitle="Instant public validation of official OIML R 76-2 verification certificates, digital stamps, and cryptographic ledger provenance."
    >
      <div className="space-y-6 max-w-4xl">
        {/* Verification Card */}
        <Card className="rounded-3xl border border-border shadow-xs overflow-hidden">
          <CardHeader className="p-5 sm:p-6 bg-muted/20 border-b border-border/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <QrCode size={22} weight="duotone" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">
                  Verify Certificate Authenticity
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Scan the QR code on any MAANAK certificate or enter its SHA-256 cryptographic stamp below.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-5">
            <form onSubmit={handleLookup} className="space-y-3">
              <label className="text-xs font-semibold text-foreground">
                Certificate SHA-256 Ledger Hash or TAC Reference
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <Input
                  value={searchHash}
                  onChange={(e) => setSearchHash(e.target.value)}
                  placeholder="Enter 64-character SHA-256 hash or session ID (e.g. e3b0c442...)"
                  icon={<MagnifyingGlass size={16} />}
                  className="font-mono text-xs sm:text-sm"
                />
                <Button
                  type="submit"
                  disabled={!searchHash.trim()}
                  rightIcon={<ArrowRight size={16} weight="bold" />}
                  className="font-bold min-h-[48px] px-6 shrink-0"
                >
                  Verify Now
                </Button>
              </div>
            </form>

            {/* Quick Samples for Testing */}
            <div className="pt-4 border-t border-border/70 space-y-2.5">
              <div className="text-xs font-semibold text-muted-foreground">
                Or test with pre-registered national ledger records:
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SAMPLE_HASHES.map((sample) => (
                  <Link
                    key={sample.hash}
                    href={`/verify/${sample.hash}`}
                    className="p-3 rounded-2xl border border-border/80 bg-card hover:bg-accent/40 text-left transition-all flex items-center justify-between gap-3 group cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 truncate">
                        <span>{sample.label}</span>
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground truncate">
                        {sample.hash}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={sample.status === "PASS" ? "pass" : "fail"}
                        showIcon={false}
                        className="text-[10px] font-mono py-0.5 px-2"
                      >
                        {sample.status}
                      </Badge>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statutory Assurance Banner */}
        <div className="rounded-3xl border border-border/80 bg-muted/20 p-4 sm:p-5 flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <LockKey size={18} weight="duotone" />
          </div>
          <div className="text-xs space-y-1">
            <div className="font-bold text-foreground">
              WELMEC 7.2 Guide & Legal Metrology Act, 2009 Compliance Guarantee
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Every verification decision rendered by MAANAK is signed with an X.509 PKI certificate and sealed into an append-only SHA-256 cryptographic audit ledger. Any retroactive alteration invalidates the public hash verification instantaneously.
            </p>
          </div>
        </div>
      </div>
    </Shell>
  );
}
