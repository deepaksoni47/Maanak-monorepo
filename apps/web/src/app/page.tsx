"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Scales,
  ShieldCheck,
  FileText,
  QrCode,
  CheckCircle,
  ArrowRight,
  Buildings,
  Flask,
  Fingerprint,
  Calculator,
  Check,
  WarningCircle,
  FilePdf,
  Shield,
  Gauge,
  Sparkle,
  CaretLeft,
  CaretRight,
  CaretDown,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Navbar, Footer } from "@/components/layout";

// Carousel Banners Metadata
const CAROUSEL_SLIDES = [
  {
    src: "/assets/carousel/Banner1b.d80b8a0b4ce3d22c648e.jpg",
    alt: "MAANAK Legal Metrology Banner 1",
    badge: "OIML R-76 Statutory Workbench",
    title: "Automated Non-Automatic Weighing Instrument Testing",
    subtitle: "Government of India Legal Metrology Portal under Section 22 of the Legal Metrology Act, 2009.",
    primaryAction: { label: "Open Testing Console", href: "/dashboard" },
    secondaryAction: { label: "Verify Certificate", href: "/verify" },
  },
  {
    src: "/assets/carousel/Banner2b.bf77a947cab6007a419a.jpg",
    alt: "MAANAK Legal Metrology Banner 2",
    badge: "NABL 129 Standard Weights Gatekeeper",
    title: "Precision Error Calculation & Class I–IIII Evaluation",
    subtitle: "Zero-error turning point calculations, MPE compliance enforcement, and real-time tolerance safety margins.",
    primaryAction: { label: "Start Test Battery", href: "/bench" },
    secondaryAction: { label: "Standard Weights", href: "/weights" },
  },
  {
    src: "/assets/carousel/Banner3b.48c75ac3c59b300d3193.jpg",
    alt: "MAANAK Legal Metrology Banner 3",
    badge: "Cryptographic Merkle Provenance",
    title: "Tamper-Evident Digital Certificates & QR Verification",
    subtitle: "Every observation is cryptographically sealed with SHA-256 Merkle provenance chains and e-Sign PIN authorization.",
    primaryAction: { label: "Public QR Verification", href: "/verify" },
    secondaryAction: { label: "View Reports", href: "/reports" },
  },
];

export default function HomePage() {
  // Simple interactive demonstration for load evaluation
  const [selectedLoad, setSelectedLoad] = useState<number>(2.5); // 2.5 kg = 500e for Class III (e=5g)
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Auto-advance carousel every 5.5 seconds unless hovered
  React.useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  // Quick calculations for the interactive demo (Class III: e = 0.005 kg, Max = 15 kg)
  const eVal = 0.005; // 5g
  const mDivs = selectedLoad / eVal;
  let mpeLimitG = 2.5; // ±0.5e
  if (mDivs > 500 && mDivs <= 2000) mpeLimitG = 5.0; // ±1.0e
  if (mDivs > 2000) mpeLimitG = 7.5; // ±1.5e

  // Simulated typical error
  const sampleErrorG = selectedLoad === 0.1 ? 0.0 : selectedLoad === 2.5 ? 0.5 : selectedLoad === 10 ? 1.0 : 1.5;
  const isPass = Math.abs(sampleErrorG) <= mpeLimitG;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* Top Navigation Bar: Department of Consumer Affairs / Government of India */}
      <Navbar />

      {/* Hero Section with Full-Width Loop Animated Carousel */}
      <section 
        className="relative w-full overflow-hidden border-b border-border bg-card group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides Track */}
        <div className="relative w-full h-[460px] sm:h-[520px] md:h-[580px] lg:h-[640px] overflow-hidden">
          <div
            className="flex w-full h-full transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {CAROUSEL_SLIDES.map((slide, index) => {
              const isActive = index === currentSlide;
              return (
                <div
                  key={slide.src}
                  className="relative w-full min-w-full h-full shrink-0 overflow-hidden"
                >
                  {/* Background Image with subtle zoom on active */}
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    priority={index === 0}
                    className={cn(
                      "object-cover object-center transition-transform duration-1000 ease-out",
                      isActive ? "scale-100" : "scale-105"
                    )}
                  />

                  {/* Gradient Overlays for Optimal Text Legibility on Right Half */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 lg:hidden" />
                  <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-transparent via-black/40 to-black/90" />

                  {/* Slide Content: 2-Column Split (Left Empty, Right Text) */}
                  <div className="absolute inset-0 z-20 flex items-center py-10 sm:py-14 lg:py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                        {/* Left Half: Empty to showcase banner artwork */}
                        <div className="hidden lg:block" aria-hidden="true" />

                        {/* Right Half: Text & Action Content */}
                        <div className="space-y-4 max-w-2xl lg:max-w-none">
                          <div className="inline-flex items-center px-3 py-1 rounded-xs bg-primary/20 backdrop-blur-md border border-primary/40 text-xs font-semibold text-white w-fit shadow-xs">
                            <span>{slide.badge}</span>
                          </div>

                          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-extrabold tracking-tight text-white leading-[1.18] drop-shadow-lg">
                            {slide.title}
                          </h1>

                          <p className="text-sm sm:text-base md:text-lg text-neutral-200 font-normal leading-relaxed drop-shadow-md">
                            {slide.subtitle}
                          </p>

                          <div className="pt-2 flex flex-wrap items-center gap-3">
                            <Link
                              href={slide.primaryAction.href}
                              className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
                            >
                              <Scales size={18} weight="bold" />
                              <span>{slide.primaryAction.label}</span>
                              <ArrowRight size={16} weight="bold" />
                            </Link>
                            <Link
                              href={slide.secondaryAction.href}
                              className="inline-flex items-center justify-center gap-2 rounded-sm bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white px-5 py-2.5 text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0"
                            >
                              <QrCode size={18} weight="duotone" />
                              <span>{slide.secondaryAction.label}</span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Left & Right Arrow Navigation Controls */}
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label="Previous Slide"
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-sm bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
          >
            <CaretLeft size={24} weight="bold" />
          </button>
          <button
            type="button"
            onClick={handleNextSlide}
            aria-label="Next Slide"
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-sm bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary shadow-lg"
          >
            <CaretRight size={24} weight="bold" />
          </button>

          {/* Bottom Slide Indicators with Auto-Loop Animation Bar */}
          <div className="absolute bottom-6 left-0 right-0 z-30 pointer-events-none">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end">
              <div className="pointer-events-auto flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3.5 py-2 rounded-xs border border-white/20 shadow-md">
                {CAROUSEL_SLIDES.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    aria-label={`Jump to slide ${idx + 1}`}
                    className={cn(
                      "h-2 rounded-xs transition-all cursor-pointer",
                      idx === currentSlide
                        ? "w-8 bg-primary"
                        : "w-2.5 bg-white/40 hover:bg-white/70"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Step-by-Step Lab Testing Journey */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Simple 4-Step Process</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              How a test session works
            </h2>
            <p className="text-sm text-muted-foreground">
              From scale intake to digitally signed certificate in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Step 1 */}
            <div className="rounded-sm bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <Scales size={22} weight="duotone" className="text-primary" />
              </div>
              <h3 className="font-bold text-base text-foreground">Scale Intake</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter model details and capacity. The system automatically verifies scale division limits (n = Max/e).
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-sm bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <ShieldCheck size={22} weight="duotone" className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-base text-foreground">Weight Check</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Picks certified test weights and checks uncertainty. Blocks testing if reference weights are not accurate enough.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-sm bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <Flask size={22} weight="duotone" className="text-primary" />
              </div>
              <h3 className="font-bold text-base text-foreground">Log Readings</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Enter reading and small changeover weights on tablet or phone. Pre-rounding error is calculated instantly.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-sm bg-card border border-border p-5 space-y-3 relative hover:border-primary/40 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  04
                </div>
                <FilePdf size={22} weight="duotone" className="text-emerald-500" />
              </div>
              <h3 className="font-bold text-base text-foreground">Sign & Export</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review automated derivation trees, apply digital signature, and export official OIML PDF with verification QR.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Interactive Live Tolerance Check Demonstration */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
        <div className="rounded-sm border border-border bg-card p-6 sm:p-10 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Calculator size={15} weight="bold" />
                <span>Try Live Calculation</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                See instant tolerance evaluation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Select a standard test load for a typical 15 kg grocery scale (Class III, e = 5 g) to see how the system
                checks error against official OIML Table 6 limits.
              </p>

              {/* Load Selection Buttons */}
              <div className="pt-2 flex flex-wrap gap-2">
                {[
                  { label: "Min (100 g)", value: 0.1 },
                  { label: "500e (2.5 kg)", value: 2.5 },
                  { label: "2000e (10 kg)", value: 10.0 },
                  { label: "Max (15 kg)", value: 15.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setSelectedLoad(item.value)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all min-h-[44px] ${
                      selectedLoad === item.value
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "bg-background border border-border text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Output Card */}
            <div className="lg:col-span-7 bg-background rounded-sm border border-border p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <Gauge size={18} weight="bold" className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    Applied Test Load: {selectedLoad.toFixed(3)} kg
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono">
                  {isPass ? "PASS" : "FAIL"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-2xl bg-card border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Observed Error</div>
                  <div className="font-bold text-foreground text-sm mt-0.5">
                    +{sampleErrorG.toFixed(1)} g
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/60">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Allowed Limit (MPE)</div>
                  <div className="font-bold text-foreground text-sm mt-0.5">
                    ±{mpeLimitG.toFixed(1)} g
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-card border border-border/60 col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-sans">Accuracy Margin</div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                    {(((mpeLimitG - Math.abs(sampleErrorG)) / mpeLimitG) * 100).toFixed(0)}% Safe
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-accent/50 border border-primary/20 text-xs flex items-center gap-2.5 text-muted-foreground">
                <CheckCircle size={18} weight="fill" className="text-emerald-500 shrink-0" />
                <span>
                  Error (+{sampleErrorG.toFixed(1)} g) is within Table 6 tolerance bracket (±{mpeLimitG.toFixed(1)} g) for Class III scales.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Accuracy Classes Supported (Educational & Practical) */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">All Weighing Categories</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Covers every scale class from lab to highway
            </h2>
            <p className="text-sm text-muted-foreground">
              Built-in rules tailored for all 4 official OIML R-76 accuracy classes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-sm bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class I
                </span>
                <span className="text-[11px] text-muted-foreground">Special</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Analytical & Gold Balances</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Precision down to 1 mg and 0.1 mg for precious metals, pharmaceuticals, and chemical research.
              </p>
            </div>

            <div className="rounded-sm bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class II
                </span>
                <span className="text-[11px] text-muted-foreground">High</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Jewelry & Pharmacy Scales</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                High accuracy scales up to 100,000 divisions for medical compounding and trade assaying.
              </p>
            </div>

            <div className="rounded-sm bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class III
                </span>
                <span className="text-[11px] text-muted-foreground">Medium</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Commercial Retail Scales</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Grocery balances, supermarket checkout scales, and parcel scales up to 10,000 divisions.
              </p>
            </div>

            <div className="rounded-sm bg-card border border-border p-5 space-y-2 hover:border-primary/40 transition-all">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                  Class IIII
                </span>
                <span className="text-[11px] text-muted-foreground">Ordinary</span>
              </div>
              <h3 className="font-bold text-base text-foreground">Weighbridges & Industrial</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Heavy truck weighbridges, crane hoists, and bulk cargo scales operating in tough industrial environments.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Regional Reference Standard Laboratories (RRSL) */}
      <section className="py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">National Laboratory Network</div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">Regional Reference Standard Laboratories</h2>
            </div>
            <span className="text-xs text-muted-foreground">Authorized under Legal Metrology Act, 2009</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { code: "RRSL-FBD", city: "Faridabad", zone: "Northern Region" },
              { code: "RRSL-BLR", city: "Bengaluru", zone: "Southern Region" },
              { code: "RRSL-BBS", city: "Bhubaneswar", zone: "Eastern Region" },
              { code: "RRSL-AMD", city: "Ahmedabad", zone: "Western Region" },
              { code: "RRSL-GHY", city: "Guwahati", zone: "North-Eastern Region" },
            ].map((item) => (
              <div
                key={item.code}
                className="p-3.5 rounded-2xl bg-card border border-border space-y-1 hover:border-primary/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-foreground">{item.code}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <div className="text-xs font-semibold text-foreground">{item.city}</div>
                <div className="text-[10px] text-muted-foreground">{item.zone}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
