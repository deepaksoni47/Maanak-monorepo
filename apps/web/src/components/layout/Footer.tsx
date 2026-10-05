"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Globe, MapTrifold, PaperPlaneTilt } from "@phosphor-icons/react";
import { useLanguage } from "@/lib/language-context";

export function Footer() {
  const { dict } = useLanguage();

  return (
    <footer className="bg-primary text-primary-foreground py-10 sm:py-12 border-t border-primary/20 shadow-inner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tier 1: Centered Brand Identity & Ministry Header */}
        <div className="flex flex-col items-center justify-center text-center gap-2.5 pb-6 border-b border-white/15">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-xs overflow-hidden bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center p-1 shadow-xs">
              <Image
                src="/logo.avif"
                alt="MAANAK Logo"
                width={36}
                height={36}
                className="object-contain w-full h-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
                MAANAK (मानक)
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs bg-white/20 text-white border border-white/30 font-mono">
                OIML R-76
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-white/85 font-medium max-w-2xl">
            {dict.footer.ministry}
          </p>
        </div>

        {/* Tier 2: Centered Navigation Links & Quick Action Badges */}
        <div className="py-6 flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-3.5 text-xs sm:text-sm font-medium text-white/90">
          <Link href="/" className="hover:text-white hover:underline underline-offset-4 transition-all">
            {dict.nav.home}
          </Link>
          <Link href="/dashboard" className="hover:text-white hover:underline underline-offset-4 transition-all">
            {dict.nav.dashboard}
          </Link>
          <Link href="/bench" className="hover:text-white hover:underline underline-offset-4 transition-all">
            Bench Testing
          </Link>
          <Link href="/instruments" className="hover:text-white hover:underline underline-offset-4 transition-all">
            {dict.nav.instruments}
          </Link>
          <Link href="/reports" className="hover:text-white hover:underline underline-offset-4 transition-all">
            {dict.nav.reports}
          </Link>
          <Link href="/verify" className="hover:text-white hover:underline underline-offset-4 transition-all">
            {dict.nav.verifyReport}
          </Link>

          {/* Centered Site Map & Feedback Action Badges */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xs border border-white/40 bg-white/10 text-white hover:bg-white/25 transition-all text-xs font-semibold shadow-xs"
          >
            <MapTrifold size={14} weight="bold" />
            <span>{dict.footer.siteMap}</span>
          </Link>
          <Link
            href="/verify"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs text-white/90 hover:text-white transition-all text-xs font-semibold"
          >
            <PaperPlaneTilt size={14} weight="bold" />
            <span>{dict.footer.feedback}</span>
          </Link>
        </div>

        {/* Tier 3: Centered Suggestions & Public Channel Icons */}
        <div className="flex flex-col items-center justify-center gap-2.5 pb-6 text-center">
          <span className="text-xs text-white/80 font-medium">{dict.footer.suggestions}</span>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://consumeraffairs.nic.in"
              target="_blank"
              rel="noreferrer"
              aria-label="Official Website"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all shadow-xs"
            >
              <Globe size={18} weight="bold" />
            </a>
            <div
              title="Social / Facebook"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div
              title="LinkedIn"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </div>
            <div
              title="Instagram"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Tier 4: Centered Copyright & Standards Strip */}
        <div className="pt-5 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/80 text-center sm:text-left">
          <p className="max-w-2xl leading-relaxed">
            {dict.footer.copyright}
          </p>
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono shrink-0">
            <span className="px-2 py-0.5 rounded-xs bg-white/15 border border-white/20 text-white font-semibold">
              OIML R-76
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
