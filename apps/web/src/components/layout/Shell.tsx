"use client";

import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNav, MAIN_NAV_ITEMS } from "./MobileNav";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import {
  User,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";

export interface ShellProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  pageTitle?: string;
  pageSubtitle?: string;
  headerActions?: ReactNode;
  bottomActionBar?: ReactNode;
}

export function Shell({
  children,
  breadcrumbs,
  pageTitle,
  pageSubtitle,
  headerActions,
  bottomActionBar,
}: ShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row">
      {/* Mobile Navigation Header & Drawer (< 1024px) */}
      <MobileNav />

      {/* Desktop Persistent Sidebar (>= 1024px) */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar border-r border-sidebar-border min-h-screen flex-col justify-between sticky top-0 h-screen z-30">
        <div>
          {/* Sidebar Top Header */}
          <div className="p-5 border-b border-sidebar-border flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none">
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs group-hover:border-primary/50 transition-all">
                <Image
                  src="/logo.avif"
                  alt="MAANAK Logo"
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-sidebar-foreground">MAANAK</span>
                  <span className="text-[10px] font-bold text-primary px-1.5 py-0.2 rounded-full bg-primary/10 border border-primary/20">
                    मानक
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Legal Metrology Division
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-none">
            {MAIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const currentPath = pathname || "";
              const isActive =
                item.href === "/dashboard"
                  ? currentPath === "/dashboard"
                  : currentPath.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all min-h-[44px] ${
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon size={18} weight={isActive ? "bold" : "duotone"} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-bold font-mono">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar User & Facility Footer */}
        <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/20 space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User size={16} weight="bold" />
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-bold text-sidebar-foreground truncate">Officer A. Sharma</div>
              <div className="text-[11px] text-muted-foreground truncate">RRSL Faridabad Facility</div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px] text-muted-foreground border-t border-sidebar-border/60 font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>WELMEC 7.2 Service</span>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">ACTIVE</span>
          </div>
        </div>
      </aside>

      {/* Main Workbench Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {/* Desktop Header Top Bar (Breadcrumbs & Title Strip) */}
        <div className="border-b border-border bg-card/30 px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky top-0 lg:static z-20 backdrop-blur-md lg:backdrop-blur-none">
          <Breadcrumbs items={breadcrumbs} />

          {headerActions && (
            <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
          )}
        </div>

        {/* Optional Page Title Header Strip */}
        {(pageTitle || pageSubtitle) && (
          <div className="border-b border-border/60 bg-background px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              {pageTitle && (
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {pageTitle}
                </h1>
              )}
              {pageSubtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {pageSubtitle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content Container (Mobile-first responsive with zero overflow) */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Sticky Bottom Action Bar Slot (e.g. for bench observation logging) */}
      {bottomActionBar && (
        <div className="fixed bottom-14 lg:bottom-0 left-0 right-0 lg:left-64 z-40 bg-background/95 backdrop-blur-md border-t border-border p-3 flex items-center justify-between shadow-xl">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            {bottomActionBar}
          </div>
        </div>
      )}
    </div>
  );
}
