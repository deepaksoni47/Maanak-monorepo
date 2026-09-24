"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Buildings,
  CaretUpDown,
  Check,
  MapPin,
  ShieldCheck,
  Globe,
} from "@phosphor-icons/react";
import { useFacility, ALL_FACILITIES_ID } from "@/lib/facility-context";

export interface FacilitySwitcherProps {
  className?: string;
  compact?: boolean;
}

export function FacilitySwitcher({ className = "", compact = false }: FacilitySwitcherProps) {
  const {
    currentFacility,
    selectedFacilityId,
    setSelectedFacilityId,
    facilities,
    isAllFacilities,
    canSwitchFacility,
    userHomeFacility,
  } = useFacility();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // For non-admin officers: static facility node indicator
  if (!canSwitchFacility) {
    return (
      <div
        className={`rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-2.5 shadow-xs flex items-center gap-2.5 text-xs ${className}`}
        data-testid="facility-indicator-badge"
      >
        <div className="text-primary flex items-center justify-center shrink-0">
          <Buildings size={18} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-foreground truncate flex items-center gap-1.5">
            <span>{currentFacility.shortName}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent text-primary font-semibold">
              {currentFacility.nablAccreditationNo}
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {currentFacility.jurisdiction}
          </div>
        </div>
      </div>
    );
  }

  // For Admins / Cross-facility managers: interactive switcher dropdown
  return (
    <div className={`relative ${className}`} ref={containerRef} data-testid="facility-switcher-container">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select RRSL Facility Node"
        className="w-full text-left rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card hover:border-primary p-2.5 shadow-xs flex items-center justify-between gap-2 text-xs transition-colors group focus:outline-none focus:ring-2 focus:ring-primary/40"
        data-testid="facility-switcher-btn"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-primary flex items-center justify-center shrink-0">
            {isAllFacilities ? (
              <Globe size={18} weight="duotone" />
            ) : (
              <Buildings size={18} weight="duotone" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-foreground truncate">
                {isAllFacilities ? "National Grid" : currentFacility.shortName}
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded-full border border-neutral-300 dark:border-neutral-700 bg-transparent text-primary font-semibold shrink-0">
                {isAllFacilities ? "ALL RRSLs" : currentFacility.code}
              </span>
            </div>
            {!compact && (
              <div className="text-[10px] text-muted-foreground truncate">
                {currentFacility.nablAccreditationNo} · {currentFacility.city}
              </div>
            )}
          </div>
        </div>

        <CaretUpDown size={14} className="text-muted-foreground group-hover:text-foreground shrink-0" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="RRSL Laboratory Facilities"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-card p-1.5 shadow-xl max-h-80 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150"
          data-testid="facility-dropdown-menu"
        >
          {/* Option: National Grid Aggregated */}
          <button
            type="button"
            role="option"
            aria-selected={isAllFacilities}
            onClick={() => {
              setSelectedFacilityId(ALL_FACILITIES_ID);
              setIsOpen(false);
            }}
            className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
              isAllFacilities
                ? "bg-primary/10 text-primary font-bold border border-primary/20"
                : "hover:bg-accent/40 text-foreground"
            }`}
            data-testid="facility-option-all"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Globe size={16} weight={isAllFacilities ? "bold" : "regular"} className="shrink-0 text-primary" />
              <div className="truncate">
                <div className="font-bold truncate">All Facilities (National Grid)</div>
                <div className="text-[10px] text-muted-foreground font-normal truncate">
                  Pan-India Aggregated OIML R-76 Metrics
                </div>
              </div>
            </div>
            {isAllFacilities && <Check size={14} weight="bold" className="text-primary shrink-0" />}
          </button>

          <div className="border-t border-neutral-300 dark:border-neutral-700 my-1" />

          {/* Option: Individual RRSL Branches */}
          {facilities.map((fac) => {
            const isSelected = selectedFacilityId === fac.id;
            return (
              <button
                key={fac.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setSelectedFacilityId(fac.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary font-bold border border-primary/20"
                    : "hover:bg-accent/40 text-foreground"
                }`}
                data-testid={`facility-option-${fac.code.toLowerCase()}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Buildings size={16} weight={isSelected ? "bold" : "regular"} className="shrink-0 text-foreground" />
                  <div className="truncate">
                    <div className="font-bold truncate flex items-center gap-1.5">
                      <span>{fac.name}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal truncate">
                      {fac.region} · {fac.city}, {fac.state}
                    </div>
                  </div>
                </div>
                {isSelected && <Check size={14} weight="bold" className="text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
