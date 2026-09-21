"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretRight, House } from "@phosphor-icons/react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

// Friendly segment map for metrological domain routes
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  instruments: "Instrument Intake",
  new: "Register New NAWI",
  bench: "Bench Execution",
  reviews: "Reviewer Audit",
  reports: "Test Reports",
  provenance: "Audit & Provenance",
  "rule-packs": "Standards & Rules",
  weights: "Standard Weights",
  verify: "Public Verification",
};

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const pathname = usePathname();

  // If explicit items not provided, parse dynamically from pathname
  const breadcrumbItems: BreadcrumbItem[] = React.useMemo(() => {
    if (items && items.length > 0) return items;

    if (!pathname || pathname === "/") {
      return [{ label: "Home" }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const generated: BreadcrumbItem[] = [{ label: "Home", href: "/" }];

    let currentHref = "";
    segments.forEach((seg, index) => {
      currentHref += `/${seg}`;
      const isLast = index === segments.length - 1;

      let label = ROUTE_LABELS[seg];
      if (!label) {
        // Check if it's an ID (e.g. TS-2026-0089 or UUID)
        if (seg.startsWith("TS-") || seg.length > 8) {
          label = `Session ${seg.substring(0, 12)}...`;
        } else {
          label = seg.charAt(0).toUpperCase() + seg.slice(1);
        }
      }

      generated.push({
        label,
        href: isLast ? undefined : currentHref,
      });
    });

    return generated;
  }, [items, pathname]);

  return (
    <nav
      aria-label="Breadcrumbs"
      className={`flex items-center text-xs text-muted-foreground overflow-x-auto scrollbar-none py-1 ${className}`}
    >
      <ol className="flex items-center gap-1.5 shrink-0">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          const isFirst = index === 0;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1.5 shrink-0">
              {index > 0 && (
                <CaretRight
                  size={12}
                  weight="bold"
                  className="text-muted-foreground/60 shrink-0"
                  aria-hidden="true"
                />
              )}

              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-foreground px-2 py-0.5 rounded-lg bg-accent/60 truncate max-w-[200px] sm:max-w-xs"
                >
                  {item.label}
                </span>
              ) : item.href ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors px-1.5 py-0.5 rounded-lg hover:bg-muted"
                >
                  {isFirst && <House size={14} weight="bold" className="text-muted-foreground shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span className="px-1.5 py-0.5">{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
