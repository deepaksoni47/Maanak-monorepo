"use client";

import React from "react";
import {
  Icon,
  Scales,
  Thermometer,
  CornersOut,
  Crosshair,
  Repeat,
  Timer,
  CheckCircle,
  WarningCircle,
  Clock,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";

export type FormId = "form1" | "form2" | "form3" | "form4" | "form5" | "form6";

export interface FormMeta {
  id: FormId;
  title: string;
  shortTitle: string;
  clause: string;
  icon: Icon;
  defaultTotalSteps: number;
}

export const STATUTORY_FORMS: FormMeta[] = [
  {
    id: "form1",
    title: "Form 1: Weighing Performance",
    shortTitle: "Form 1: Weighing",
    clause: "OIML R 76-1 A.4.4.3",
    icon: Scales,
    defaultTotalSteps: 10,
  },
  {
    id: "form2",
    title: "Form 2: Thermal Drift & No-Load",
    shortTitle: "Form 2: Temp Drift",
    clause: "OIML R 76-1 A.4.4.2",
    icon: Thermometer,
    defaultTotalSteps: 5,
  },
  {
    id: "form3",
    title: "Form 3: Eccentricity & Corner Load",
    shortTitle: "Form 3: Eccentricity",
    clause: "OIML R 76-1 A.4.7",
    icon: CornersOut,
    defaultTotalSteps: 5,
  },
  {
    id: "form4",
    title: "Form 4: Discrimination (1.4d)",
    shortTitle: "Form 4: Discrimination",
    clause: "OIML R 76-1 A.4.8",
    icon: Crosshair,
    defaultTotalSteps: 3,
  },
  {
    id: "form5",
    title: "Form 5: Repeatability 10-Cycle",
    shortTitle: "Form 5: Repeatability",
    clause: "OIML R 76-1 A.4.10",
    icon: Repeat,
    defaultTotalSteps: 10,
  },
  {
    id: "form6",
    title: "Form 6: 30-Min Creep & Zero Return",
    shortTitle: "Form 6: Creep & Zero",
    clause: "OIML R 76-1 A.4.11",
    icon: Timer,
    defaultTotalSteps: 6,
  },
];

export interface FormStatusDetail {
  status: "PASS" | "FAIL" | "PENDING";
  progressPercent: number; // 0 to 100
  completedSteps?: number;
  totalSteps?: number;
}

export interface TestBatteryNavigatorProps {
  activeForm: FormId;
  onSelectForm: (formId: FormId) => void;
  formStatuses?: Partial<Record<FormId, FormStatusDetail>>;
  className?: string;
}

export function TestBatteryNavigator({
  activeForm,
  onSelectForm,
  formStatuses = {},
  className = "",
}: TestBatteryNavigatorProps) {
  return (
    <div
      role="tablist"
      aria-label="OIML R-76 Statutory Test Battery Forms"
      className={`rounded-2xl border border-border/80 bg-muted/40 p-1.5 overflow-x-auto scrollbar-none flex items-stretch gap-1.5 sm:gap-2 shadow-xs ${className}`}
    >
      {STATUTORY_FORMS.map((form) => {
        const Icon = form.icon;
        const isActive = activeForm === form.id;
        const statusDetail = formStatuses[form.id] || {
          status: "PENDING",
          progressPercent: form.id === "form1" ? 30 : 0,
        };

        const isPass = statusDetail.status === "PASS";
        const isFail = statusDetail.status === "FAIL";
        const isPending = !isPass && !isFail;

        return (
          <button
            key={form.id}
            role="tab"
            type="button"
            id={`tab-${form.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${form.id}`}
            onClick={() => onSelectForm(form.id)}
            className={`min-h-[48px] px-3 py-2 rounded-xl transition-all flex flex-col justify-between shrink-0 text-left cursor-pointer border select-none group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
              isActive
                ? "bg-card text-foreground border-primary/50 shadow-xs ring-1 ring-primary/20"
                : "bg-transparent text-muted-foreground border-transparent hover:bg-card/60 hover:text-foreground"
            }`}
            style={{ minWidth: "155px" }}
          >
            {/* Top row: Icon + Short Title + Status Badge */}
            <div className="flex items-center justify-between gap-2 w-full">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon
                  size={15}
                  weight={isActive ? "bold" : "duotone"}
                  className={`shrink-0 ${
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                />
                <span className="text-xs font-semibold truncate tracking-tight">
                  {form.shortTitle}
                </span>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0">
                {isPass ? (
                  <Badge variant="pass" showIcon={false} className="py-0 px-1.5 text-[9px] font-bold">
                    PASS
                  </Badge>
                ) : isFail ? (
                  <Badge variant="fail" showIcon={false} className="py-0 px-1.5 text-[9px] font-bold">
                    FAIL
                  </Badge>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground font-medium px-1.5 py-0.5 rounded-full bg-muted">
                    <Clock size={10} className="shrink-0" />
                    {statusDetail.progressPercent > 0 ? `${statusDetail.progressPercent}%` : "0%"}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom row: Statutory Clause and Mini Progress Bar */}
            <div className="w-full mt-1.5 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span className="truncate">{form.clause}</span>
                {statusDetail.completedSteps !== undefined && statusDetail.totalSteps !== undefined && (
                  <span className="shrink-0 ml-1">
                    {statusDetail.completedSteps}/{statusDetail.totalSteps}
                  </span>
                )}
              </div>

              {/* Micro-Progress Bar */}
              <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    isPass
                      ? "bg-emerald-500"
                      : isFail
                      ? "bg-destructive"
                      : isActive
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, statusDetail.progressPercent))}%` }}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
