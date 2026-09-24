"use client";

import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileNav, MAIN_NAV_ITEMS, filterNavItemsByRole } from "./MobileNav";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import {
  User,
  ShieldCheck,
  CheckCircle,
  SignOut,
  SignIn,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-context";
import { FacilitySwitcher } from "./FacilitySwitcher";

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
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Main Body Layout: Sidebar + Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Mobile Navigation Drawer (< 1024px) */}
        <MobileNav />

        {/* Desktop Persistent Sidebar (>= 1024px) */}
        <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex-col justify-between sticky top-0 h-screen z-20">
          <div>
            {/* Sidebar Brand Header */}
            <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs group-hover:border-primary/50 transition-colors">
                  <Image
                    src="/logo.avif"
                    alt="MAANAK Logo"
                    width={32}
                    height={32}
                    className="object-contain w-full h-full"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base tracking-tight text-sidebar-foreground">MAANAK</span>
                  <span className="text-[10px] text-muted-foreground font-medium truncate">
                    Testing Workbench
                  </span>
                </div>
              </Link>
              <span className="text-[10px] font-mono font-bold text-primary px-1.5 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
                OIML R-76
              </span>
            </div>

            {/* RRSL Multi-Facility Node Indicator / Switcher (TASK-087) */}
            <div className="px-3 pt-3 pb-1" data-testid="sidebar-facility-section">
              <FacilitySwitcher compact={false} />
            </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-170px)] scrollbar-none">
            {filterNavItemsByRole(MAIN_NAV_ITEMS, user?.role).map((item) => {
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
          {isAuthenticated && user ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl text-primary flex items-center justify-center shrink-0">
                    <User size={16} weight="bold" />
                  </div>
                  <div className="truncate text-left min-w-0">
                    <div className="text-xs font-bold text-sidebar-foreground truncate">
                      {user.fullName || user.username}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {user.designation || "Legal Metrology Officer"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
                  aria-label="Sign Out"
                >
                  <SignOut size={16} weight="bold" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-1 text-[10px]">
                <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                  {user.role}
                </span>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Switch Persona
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Guest / Not signed in</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  GUEST
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold text-center hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5 min-h-[38px]"
                >
                  <SignIn size={14} weight="bold" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/login"
                  className="py-2 px-2.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-semibold text-center transition-colors min-h-[38px] flex items-center justify-center"
                  title="Create Officer Account"
                >
                  Register
                </Link>
              </div>
            </div>
          )}

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
        {/* Content Container with inline Breadcrumbs directly above Heading */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
          {/* Breadcrumbs & Heading Block */}
          {(breadcrumbs || pageTitle || pageSubtitle || headerActions) && (
            <div className="mb-6 space-y-3">
              {/* Breadcrumbs + Actions Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Breadcrumbs items={breadcrumbs} />
                {headerActions && (
                  <div className="flex items-center gap-2 shrink-0">{headerActions}</div>
                )}
              </div>

              {/* Page Heading & Subtitle */}
              {(pageTitle || pageSubtitle) && (
                <div className="pt-1">
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
              )}
            </div>
          )}

          {children}
        </main>
      </div>
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
