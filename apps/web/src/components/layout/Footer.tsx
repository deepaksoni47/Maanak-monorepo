"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground py-10 sm:py-12 border-t border-primary/20 shadow-inner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-white/15">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xs overflow-hidden bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center p-1 shadow-xs">
              <Image
                src="/logo.avif"
                alt="MAANAK Logo"
                width={36}
                height={36}
                className="object-contain w-full h-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">
                  MAANAK (मानक)
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-xs bg-white/20 text-white border border-white/30">
                  OIML R-76
                </span>
              </div>
              <p className="text-xs text-white/80 font-medium">
                Department of Consumer Affairs • Ministry of Consumer Affairs, Food &amp; Public Distribution • Government of India
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 sm:gap-6 text-xs sm:text-sm font-medium text-white/85">
            <Link href="/" className="hover:text-white hover:underline underline-offset-4 transition-all">
              Home
            </Link>
            <Link href="/dashboard" className="hover:text-white hover:underline underline-offset-4 transition-all">
              Console
            </Link>
            <Link href="/bench" className="hover:text-white hover:underline underline-offset-4 transition-all">
              Bench Testing
            </Link>
            <Link href="/instruments" className="hover:text-white hover:underline underline-offset-4 transition-all">
              Instruments
            </Link>
            <Link href="/reports" className="hover:text-white hover:underline underline-offset-4 transition-all">
              Reports
            </Link>
            <Link href="/verify" className="hover:text-white hover:underline underline-offset-4 transition-all">
              Public Verification
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/75">
          <p className="max-w-2xl leading-relaxed">
            Designed &amp; Developed for Statutory Verification under Section 22 of the Legal Metrology Act, 2009 &amp; Legal Metrology (Approval of Models) Rules.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
            <span className="px-2 py-0.5 rounded-xs bg-white/15 border border-white/20 text-white font-semibold">
              OIML R-76:2006
            </span>
            <span className="px-2 py-0.5 rounded-xs bg-white/15 border border-white/20 text-white font-semibold">
              NABL 129
            </span>
            <span className="px-2 py-0.5 rounded-xs bg-white/15 border border-white/20 text-white font-semibold">
              WELMEC 7.2
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
