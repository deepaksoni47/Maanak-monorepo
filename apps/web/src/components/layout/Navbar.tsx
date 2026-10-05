"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  QrCode,
  ArrowRight,
  CaretDown,
  User,
  SignOut,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { BottomNav } from "./BottomNav";

export interface NavbarProps {
  showMobileBottomNav?: boolean;
}

export function Navbar({ showMobileBottomNav }: NavbarProps) {
  const pathname = usePathname() || "/";
  const { language, setLanguage, dict } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();

  const NAV_LINKS = [
    { label: dict.nav.home, href: "/" },
    { label: dict.nav.dashboard, href: "/dashboard" },
    { label: dict.nav.instruments, href: "/instruments" },
    { label: dict.nav.reports, href: "/reports" },
  ];

  const shouldShowBottomNav =
    showMobileBottomNav !== undefined ? showMobileBottomNav : pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur-md shadow-xs">
        {/* Tier 1: Department of Consumer Affairs Government Utility Bar */}
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-border/80 px-3 sm:px-6 py-1 flex items-center justify-between text-[11px] sm:text-xs gap-2">
          <span className="font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase truncate">
            <span className="sm:hidden">{dict.nav.deptNameShort}</span>
            <span className="hidden sm:inline">{dict.nav.deptNameFull}</span>
          </span>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <a
              href="#main-content"
              className="hidden md:inline-flex items-center rounded-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              {dict.nav.skipToMain}
            </a>

            {/* Accessibility Icon */}
            <div
              title="Accessibility Options"
              className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 flex items-center justify-center text-[9px] sm:text-[10px] font-bold shadow-xs cursor-pointer select-none"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
              </svg>
            </div>

            <span className="text-slate-300 dark:text-slate-700 text-xs font-light">|</span>

            {/* Language Selector */}
            <div className="relative inline-flex items-center">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "hi")}
                aria-label={dict.nav.selectLanguage}
                className="bg-transparent text-[10px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 pr-4 sm:pr-5 py-0.5 rounded-xs cursor-pointer border-none focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
              >
                <option value="en" className="bg-background text-foreground">English</option>
                <option value="hi" className="bg-background text-foreground">हिन्दी (Hindi)</option>
              </select>
              <CaretDown size={11} weight="bold" className="absolute right-0 pointer-events-none text-slate-600 dark:text-slate-300" />
            </div>
          </div>
        </div>

        {/* Tier 2: Main Brand & Navigation Tier */}
        <div className="w-full flex items-center justify-between px-3 sm:px-6 py-2">
          {/* Brand Identity: Satyamev Jayate Emblem & MAANAK Portal Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 sm:gap-3.5 group focus:outline-none focus:ring-2 focus:ring-ring rounded-xs p-0.5"
            >
              {/* Satyamev Jayate (State Emblem of India) */}
              <div className="relative w-8 h-10 sm:w-10 sm:h-12 shrink-0 flex items-center justify-center">
                <Image
                  src="/assets/satyamev-jayate.svg"
                  alt="State Emblem of India - Satyamev Jayate"
                  width={40}
                  height={48}
                  className="object-contain h-full w-auto"
                  priority
                />
              </div>

              {/* Portal Icon & Typography */}
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-sm overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs group-hover:border-primary/50 transition-all">
                  <Image
                    src="/logo.avif"
                    alt="MAANAK Portal Logo"
                    width={36}
                    height={36}
                    className="object-contain w-full h-full"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="font-extrabold text-lg sm:text-xl tracking-tight text-foreground leading-none">{dict.nav.portalName}</span>
                    <span className="hidden md:inline font-semibold text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-xs border border-amber-500/20">
                      मानक
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium hidden md:inline leading-tight mt-0.5">
                    {dict.nav.portalSub}
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links with animated hover interactions */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ease-out group select-none ${
                    isActive
                      ? "text-primary font-bold bg-primary/10 dark:bg-primary/20 shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60 dark:hover:bg-accent/30 font-medium"
                  }`}
                >
                  <span className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5 inline-block">
                    {link.label}
                  </span>
                  {/* Tweakcn animated underline indicator */}
                  <span
                    className={`absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-full bg-primary transition-all duration-300 ease-out ${
                      isActive
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Action Buttons: Verify Report & Start Session / User Info */}
          <div className="relative shrink-0 flex items-center gap-2 sm:gap-2.5">
            <Link
              href="/verify"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 sm:px-3.5 py-1.5 text-xs font-semibold hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all shadow-xs"
            >
              <QrCode size={15} weight="bold" />
              <span>{dict.nav.verifyReport}</span>
            </Link>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl border border-border bg-card px-2.5 sm:px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors"
                >
                  <User size={14} weight="bold" className="text-primary" />
                  <span className="truncate max-w-[90px] sm:max-w-[120px]">{user.fullName || user.username}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  title={dict.nav.signOut}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label={dict.nav.signOut}
                >
                  <SignOut size={16} weight="bold" />
                </button>
              </div>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all shadow-xs"
              >
                <span>{dict.nav.startSession}</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Responsive mobile bottom navigation bar */}
      {shouldShowBottomNav && <BottomNav />}
    </>
  );
}
