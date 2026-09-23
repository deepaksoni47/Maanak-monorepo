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

export function Navbar() {
  const pathname = usePathname() || "/";
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const { user, isAuthenticated, logout } = useAuth();

  const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Instruments", href: "/instruments" },
    { label: "Bench Testing", href: "/bench" },
    { label: "Reports", href: "/reports" },
    { label: "Verify", href: "/verify" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-md shadow-xs">
      <div className="w-full flex flex-col md:flex-row items-stretch">
        {/* Left Brand Identity: Satyamev Jayate Emblem & MAANAK Portal Logo */}
        <div className="flex items-center gap-3.5 px-4 sm:px-6 py-2.5 bg-background shrink-0 border-b md:border-b-0 md:border-r-4 md:border-amber-500">
          <Link
            href="/"
            className="flex items-center gap-3.5 group focus:outline-none focus:ring-2 focus:ring-ring rounded-xs p-0.5"
          >
            {/* Satyamev Jayate (State Emblem of India) */}
            <div className="relative w-11 h-14 shrink-0 flex items-center justify-center">
              <Image
                src="/assets/satyamev-jayate.svg"
                alt="State Emblem of India - Satyamev Jayate"
                width={44}
                height={56}
                className="object-contain h-full w-auto"
                priority
              />
            </div>

            {/* Portal Icon & Typography */}
            <div className="flex items-center gap-2.5">
              <div className="relative w-10 h-10 rounded-sm overflow-hidden border border-border bg-card flex items-center justify-center shadow-xs group-hover:border-primary/50 transition-all">
                <Image
                  src="/logo.avif"
                  alt="MAANAK Portal Logo"
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight text-foreground leading-none">MAANAK</span>
                  <span className="font-semibold text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded-xs border border-amber-500/20">
                    मानक
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline leading-tight mt-0.5">
                  Legal Metrology Testing Portal
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Right Navigation & Utility Sections */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          {/* Top Tier: Department of Consumer Affairs Government Utility Bar */}
          <div className="bg-slate-100 dark:bg-slate-900 border-b border-border/80 px-4 sm:px-6 py-1 flex items-center justify-between text-xs gap-3">
            <span className="font-bold text-[11px] sm:text-xs tracking-wider text-slate-800 dark:text-slate-200 uppercase truncate">
              DEPARTMENT OF CONSUMER AFFAIRS | GOVERNMENT OF INDIA
            </span>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href="#main-content"
                className="hidden sm:inline-flex items-center rounded-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Skip to Main Content
              </a>

              {/* Accessibility Icon */}
              <div
                title="Accessibility Options"
                className="w-5 h-5 rounded-full bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 flex items-center justify-center text-[10px] font-bold shadow-xs cursor-pointer select-none"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
                </svg>
              </div>

              <span className="text-slate-300 dark:text-slate-700 text-xs font-light">|</span>

              {/* Language Selector */}
              <div className="relative inline-flex items-center">
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  aria-label="Select Language"
                  className="bg-transparent text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 pr-5 py-0.5 rounded-xs cursor-pointer border-none focus:outline-none focus:ring-1 focus:ring-primary appearance-none"
                >
                  <option value="English" className="bg-background text-foreground">English</option>
                  <option value="Hindi" className="bg-background text-foreground">हिन्दी (Hindi)</option>
                </select>
                <CaretDown size={12} weight="bold" className="absolute right-0.5 pointer-events-none text-slate-600 dark:text-slate-300" />
              </div>
            </div>
          </div>

          {/* Bottom Tier: Primary Links & Login / Session Button */}
          <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
            <nav className="flex items-center gap-5 sm:gap-7 text-sm font-medium text-muted-foreground overflow-x-auto no-scrollbar py-0.5">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`transition-colors shrink-0 ${
                      isActive
                        ? "text-amber-600 dark:text-amber-500 font-bold hover:text-amber-700 dark:hover:text-amber-400"
                        : "text-muted-foreground hover:text-foreground font-medium"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Action Buttons: Verify & Start Session / User Info */}
            <div className="relative shrink-0 flex items-center gap-2.5">
              <Link
                href="/verify"
                className="hidden lg:inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-3.5 py-1.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground transition-all"
              >
                <QrCode size={15} weight="bold" />
                <span>Verify Report</span>
              </Link>
              
              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xs border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition-colors"
                  >
                    <User size={14} weight="bold" className="text-primary" />
                    <span className="truncate max-w-[120px]">{user.fullName || user.username}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 rounded-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Sign Out"
                  >
                    <SignOut size={16} weight="bold" />
                  </button>
                </div>
              ) : (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xs bg-primary text-primary-foreground px-4 sm:px-5 py-1.5 text-xs sm:text-sm font-semibold hover:bg-primary/90 transition-all shadow-xs"
                >
                  <span>Start Session</span>
                  <ArrowRight size={15} weight="bold" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
