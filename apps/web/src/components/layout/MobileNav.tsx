"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  List,
  X,
  ChartLineUp,
  Scales,
  Flask,
  MagnifyingGlass,
  FileText,
  LockKey,
  Gear,
  QrCode,
  ShieldCheck,
  User,
  WifiHigh,
  WifiSlash,
  SignOut,
  SignIn,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-context";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; weight?: "bold" | "duotone" | "fill" | "regular"; className?: string }>;
  badge?: string;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: ChartLineUp },
  { label: "Instrument Intake", href: "/instruments", icon: Scales },
  { label: "Bench Execution", href: "/bench", icon: Flask },
  { label: "Reviewer Audit", href: "/review", icon: MagnifyingGlass },
  { label: "Test Reports", href: "/reports", icon: FileText },
  { label: "Audit & Provenance", href: "/provenance", icon: LockKey },
  { label: "Standards & Rules", href: "/rule-packs", icon: Gear },
  { label: "Standard Weights", href: "/weights", icon: ShieldCheck },
  { label: "Public Verification", href: "/verify", icon: QrCode },
];

export interface MobileNavProps {
  onMenuToggle?: (isOpen: boolean) => void;
}

export function MobileNav({ onMenuToggle }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const pathname = usePathname();
  const currentPath = pathname || "";
  const { user, logout, isAuthenticated } = useAuth();

  // Monitor network online status
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(window.navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (isOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    onMenuToggle?.(isOpen);
  }, [isOpen, onMenuToggle]);

  // Close drawer upon route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile Top Header (Visible on < 1024px) */}
      <header className="lg:hidden sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* 48px Touch Target Hamburger Button */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open navigation menu"
            aria-expanded={isOpen}
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <List size={24} weight="bold" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 focus:outline-none">
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs">
              <Image
                src="/logo.avif"
                alt="MAANAK Logo"
                width={32}
                height={32}
                className="object-contain w-full h-full"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-base tracking-tight text-foreground">MAANAK</span>
              <span className="hidden sm:inline text-[10px] font-bold text-primary px-1.5 py-0.2 rounded-full bg-primary/10 border border-primary/20">
                मानक
              </span>
            </div>
          </Link>
        </div>

        {/* Status Chip */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiSlash size={12} weight="bold" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Navigation Drawer Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          {/* Dark Semi-transparent Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Panel */}
          <div className="relative w-72 max-w-[85vw] h-full bg-sidebar border-r border-sidebar-border shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Top Header */}
            <div>
              <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center">
                    <Image
                      src="/logo.avif"
                      alt="MAANAK Logo"
                      width={36}
                      height={36}
                      className="object-contain w-full h-full"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-base text-sidebar-foreground">MAANAK (मानक)</div>
                    <div className="text-[10px] text-muted-foreground">Legal Metrology Workbench</div>
                  </div>
                </div>

                {/* 48px Touch Target Close Button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close navigation menu"
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X size={22} weight="bold" />
                </button>
              </div>

              {/* Drawer Nav Links */}
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-190px)]">
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
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all min-h-[48px] ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon size={20} weight={isActive ? "bold" : "duotone"} />
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

            {/* Drawer User & System Footer */}
            <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/30 space-y-2">
              {isAuthenticated && user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
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
                      onClick={() => {
                        logout();
                        setIsOpen(false);
                      }}
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
                      onClick={() => setIsOpen(false)}
                      className="text-muted-foreground hover:text-foreground underline underline-offset-2"
                    >
                      Switch Persona
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Not signed in</span>
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <SignIn size={14} weight="bold" />
                    <span>Sign In</span>
                  </Link>
                </div>
              )}

              <div className="pt-1.5 flex items-center justify-between text-[10px] text-muted-foreground border-t border-sidebar-border/60 font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>WELMEC 7.2 Service</span>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Mobile Bottom Quick-Access Bar (Fixed on < 1024px) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg"
      >
        <Link
          href="/dashboard"
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] rounded-xl px-2 py-1 transition-colors ${
            currentPath === "/dashboard"
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ChartLineUp size={20} weight={currentPath === "/dashboard" ? "bold" : "regular"} />
          <span className="text-[10px]">Dashboard</span>
        </Link>

        <Link
          href="/bench"
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] rounded-xl px-2 py-1 transition-colors ${
            currentPath.startsWith("/bench")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Flask size={20} weight={currentPath.startsWith("/bench") ? "bold" : "regular"} />
          <span className="text-[10px]">Bench</span>
        </Link>

        <Link
          href="/instruments"
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] rounded-xl px-2 py-1 transition-colors ${
            currentPath.startsWith("/instruments")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Scales size={20} weight={currentPath.startsWith("/instruments") ? "bold" : "regular"} />
          <span className="text-[10px]">Intake</span>
        </Link>

        <Link
          href="/reports"
          className={`flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] rounded-xl px-2 py-1 transition-colors ${
            currentPath.startsWith("/reports")
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText size={20} weight={currentPath.startsWith("/reports") ? "bold" : "regular"} />
          <span className="text-[10px]">Reports</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="More options"
          className="flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[48px] rounded-xl px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <List size={20} weight="bold" />
          <span className="text-[10px]">More</span>
        </button>
      </nav>
    </>
  );
}
