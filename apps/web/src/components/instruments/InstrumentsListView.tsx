"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shell } from "@/components/layout/Shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Scales, Plus, ArrowRight, Flask, CheckCircle, CircleNotch } from "@phosphor-icons/react";
import {
  InstrumentItem,
  DEFAULT_INSTRUMENTS,
  getStoredInstruments,
} from "@/lib/instruments-store";
import { instrumentsApi } from "@/lib/api";

export type { InstrumentItem };
export const REGISTERED_INSTRUMENTS = DEFAULT_INSTRUMENTS;

export function InstrumentsListView() {
  const [instruments, setInstruments] = useState<InstrumentItem[]>(DEFAULT_INSTRUMENTS);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadInstruments() {
      try {
        setIsLoading(true);
        const res = await instrumentsApi.list();
        if (isMounted && res && res.instruments && res.instruments.length > 0) {
          const mapped: InstrumentItem[] = res.instruments.map((inst: any) => {
            const classCode = inst.accuracyClass?.code || "III";
            const classNormalized = classCode.startsWith("CLASS_") ? classCode : `CLASS_${classCode}`;
            const maxCap = Number(inst.maxCapacity) || 15;
            const eVal = Number(inst.verificationScaleIntervalE) || 0.005;
            const nDiv = inst.scaleDivisionCountN || Math.round(maxCap / eVal);

            return {
              id: inst.id,
              model: inst.modelName,
              manufacturer: inst.manufacturer?.companyName || "Domestic Manufacturer",
              serialNumber: inst.physicalUnits?.[0]?.serialNumber || `SN-${inst.modelName.replace(/\s+/g, "")}-001`,
              tacNumber: inst.patternDesignation || `IND-OIML-${inst.id.slice(0, 6).toUpperCase()}`,
              accuracyClass: classNormalized as any,
              maxCapacity: `${inst.maxCapacity} ${inst.unitOfMeasure || "kg"}`,
              verificationInterval: `${inst.verificationScaleIntervalE} ${inst.unitOfMeasure || "kg"}`,
              minCapacity: inst.minCapacity ? `${inst.minCapacity} ${inst.unitOfMeasure || "kg"}` : undefined,
              ratioN: nDiv,
              status: "VERIFIED",
              createdAt: inst.createdAt || new Date().toISOString(),
            };
          });
          setInstruments(mapped);
        } else if (isMounted) {
          setInstruments(getStoredInstruments());
        }
      } catch (err) {
        console.error("Failed to load live instruments from DB:", err);
        if (isMounted) {
          setInstruments(getStoredInstruments());
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadInstruments();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalRegistered = instruments.length;
  const verifiedCount = instruments.filter((i) => i.status === "VERIFIED").length;
  const inProgressCount = instruments.filter((i) => i.status === "IN_PROGRESS").length;

  return (
    <Shell
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Instrument Intake & Registry" },
      ]}
      pageTitle="NAWI Instrument Registry"
      pageSubtitle="Official directory of pattern-approved Non-Automatic Weighing Instruments connected to live PostgreSQL database."
      headerActions={
        <Link href="/instruments/new">
          <Button
            leftIcon={<Plus size={16} weight="bold" />}
            className="font-bold min-h-[48px] px-5"
          >
            Intake New Instrument
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Scales size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Total Registered</div>
              <div className="text-xl font-bold font-mono text-foreground">
                {isLoading ? <CircleNotch size={20} className="animate-spin" /> : `${totalRegistered} Active Scales`}
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Verified &amp; Stamped</div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {isLoading ? <CircleNotch size={20} className="animate-spin" /> : `${verifiedCount} Compliant`}
              </div>
            </div>
          </Card>
          <Card className="p-4 rounded-3xl border border-border bg-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Flask size={22} weight="duotone" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Under Test Battery</div>
              <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {isLoading ? <CircleNotch size={20} className="animate-spin" /> : `${inProgressCount} on Bench`}
              </div>
            </div>
          </Card>
        </div>

        {/* Instruments Grid List */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <CircleNotch size={32} className="animate-spin text-primary" />
            <p className="text-xs font-medium">Fetching instrument models from PostgreSQL...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {instruments.map((inst) => {
              const classVariant =
                inst.accuracyClass === "CLASS_I"
                  ? "neutral"
                  : inst.accuracyClass === "CLASS_II"
                  ? "default"
                  : "pass";

              return (
                <Card
                  key={inst.id}
                  className="rounded-3xl border border-border overflow-hidden shadow-xs hover:border-primary/40 transition-all"
                >
                  <CardHeader className="p-4 sm:p-5 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Scales size={20} weight="duotone" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold text-foreground">
                            {inst.model}
                          </CardTitle>
                          <Badge
                            variant={classVariant as any}
                            showIcon={false}
                            className="py-0.5 px-2 text-[10px] font-mono font-bold"
                          >
                            {inst.accuracyClass.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={
                              inst.status === "VERIFIED"
                                ? "pass"
                                : inst.status === "IN_PROGRESS"
                                ? "in_progress"
                                : "neutral"
                            }
                            showIcon={false}
                            className="py-0.5 px-2 text-[10px] font-mono"
                          >
                            {inst.status}
                          </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{inst.manufacturer}</span>
                          <span>·</span>
                          <span className="font-mono font-semibold text-foreground">
                            Serial: {inst.serialNumber}
                          </span>
                          <span>·</span>
                          <span className="font-mono">TAC: {inst.tacNumber}</span>
                        </CardDescription>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Link href={`/bench?instrumentId=${inst.id}`}>
                        <Button
                          size="sm"
                          rightIcon={<ArrowRight size={14} weight="bold" />}
                          className="text-xs font-bold shadow-xs min-h-[40px] px-4"
                        >
                          Test on Bench
                        </Button>
                      </Link>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-muted-foreground text-[11px]">Maximum Capacity (Max)</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">
                        {inst.maxCapacity}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-muted-foreground text-[11px]">Scale Interval (e)</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">
                        {inst.verificationInterval}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-muted-foreground text-[11px]">Minimum Capacity (Min)</div>
                      <div className="text-sm font-bold text-foreground mt-0.5">
                        {inst.minCapacity || "—"}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-background border border-border/60">
                      <div className="text-muted-foreground text-[11px]">Table 3 Divisions (n)</div>
                      <div className="text-sm font-bold text-primary mt-0.5">
                        {inst.ratioN ? `${inst.ratioN.toLocaleString()} div` : "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
