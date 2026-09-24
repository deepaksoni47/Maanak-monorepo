"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export interface AccessDeniedViewProps {
  requiredRoles?: string[];
  currentRole?: string;
  onLogout?: () => void;
}

export function AccessDeniedView({
  requiredRoles = [],
  currentRole = "OFFICER",
  onLogout,
}: AccessDeniedViewProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background radial gradient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="relative max-w-xl w-full bg-slate-900/90 border border-red-500/30 rounded-xl p-8 shadow-2xl backdrop-blur-md">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-mono font-bold text-lg">
              403
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Statutory Access Restricted
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                OIML R-76 / WELMEC 7.2 ROLE PARTITION
              </p>
            </div>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-red-950 text-red-400 border border-red-800/60">
            FORBIDDEN
          </span>
        </div>

        {/* Main Body Notice */}
        <div className="mt-6 space-y-4 text-sm text-slate-300 leading-relaxed">
          <p>
            Your current metrological clearance level does not grant authority to access or manipulate
            records in this partition.
          </p>

          {/* Role Status Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 font-mono text-xs space-y-2">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/80">
              <span className="text-slate-400">Current Role Profile:</span>
              <span className="font-semibold text-amber-400 uppercase tracking-wide">
                {currentRole}
              </span>
            </div>
            {requiredRoles.length > 0 && (
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Permitted Roles:</span>
                <span className="font-semibold text-emerald-400 uppercase tracking-wide">
                  {requiredRoles.join(", ")}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 text-slate-500">
              <span>Audit Event Code:</span>
              <span className="text-slate-400">EVT-403-RBAC-VIOLATION</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Under Legal Metrology Rules (General) 2011 and WELMEC 7.2 software separation guidelines,
            unauthorized role elevation or partition crossing is strictly audited and logged.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-800">
          <Link
            href="/dashboard"
            className="flex-1 text-center py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors shadow-sm"
          >
            Return to Dashboard
          </Link>

          <Link
            href="/login"
            onClick={onLogout}
            className="flex-1 text-center py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-colors"
          >
            Switch Officer Role
          </Link>

          <Link
            href="/verify"
            className="py-2.5 px-4 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 text-xs font-mono rounded-lg transition-colors text-center"
          >
            Verify Certificate
          </Link>
        </div>
      </div>
    </div>
  );
}

function AccessDeniedSearchParamsConsumer() {
  const searchParams = useSearchParams();
  const requiredRoles = searchParams?.get("required")?.split(",") || [];
  const queryRole = searchParams?.get("role") || undefined;
  const { user, isAuthenticated, logout } = useAuth();

  const currentRole = user?.role || queryRole || (isAuthenticated ? "OFFICER" : "UNAUTHENTICATED");

  return (
    <AccessDeniedView
      requiredRoles={requiredRoles}
      currentRole={currentRole}
      onLogout={logout}
    />
  );
}

export default function AccessDeniedPage() {
  return (
    <Suspense
      fallback={
        <AccessDeniedView
          requiredRoles={[]}
          currentRole="UNAUTHENTICATED"
        />
      }
    >
      <AccessDeniedSearchParamsConsumer />
    </Suspense>
  );
}
