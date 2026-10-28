"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ChartLineUp,
  Scales,
  FileText,
  QrCode,
} from "@phosphor-icons/react";

import { useLanguage } from "@/lib/language-context";

export interface BottomNavItem {
  labelKey: keyof typeof import("@/lib/translations").translations.en.nav;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "regular" | "duotone" | "fill"; className?: string }>;
}

export const LANDING_BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { labelKey: "home", href: "/", icon: House },
  { labelKey: "dashboard", href: "/dashboard", icon: ChartLineUp },
  { labelKey: "instruments", href: "/instruments", icon: Scales },
  { labelKey: "reports", href: "/reports", icon: FileText },
  { labelKey: "verifyReport", href: "/verify", icon: QrCode },
];

export interface BottomNavProps {
  className?: string;
}

/**
 * Mobile Bottom Navigation Bar (tweakcn & shadcn aesthetic)
 * Provides thumb-friendly navigation on phones without causing top-navbar clutter.
 */
export function BottomNav({ className = "" }: BottomNavProps) {
  const pathname = usePathname() || "/";
  const { dict } = useLanguage();

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/85 dark:bg-background/90 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] transition-all ${className}`}
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {LANDING_BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const label = dict.nav[item.labelKey] || item.labelKey;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] rounded-xl px-2.5 py-1 text-xs transition-all duration-200 active:scale-95 group ${
                isActive
                  ? "text-primary font-bold bg-primary/10 dark:bg-primary/20 shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/40 font-medium"
              }`}
            >
              {/* Tweakcn active top glowing indicator pill */}
              {isActive && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)] animate-in fade-in zoom-in-50 duration-200" />
              )}
              <Icon
                size={20}
                weight={isActive ? "bold" : "regular"}
                className={`transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
              <span className="text-[10px] tracking-tight leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
