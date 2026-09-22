"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  User,
  LockKey,
  ArrowRight,
  Scales,
  CheckCircle,
  WarningCircle,
  Buildings,
  IdentificationBadge,
} from "@phosphor-icons/react";
import { useAuth, PRESET_OFFICERS } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, switchRoleQuick, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<"INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN">("INSPECTOR");
  const [email, setEmail] = useState<string>("inspector@maanak.gov.in");
  const [password, setPassword] = useState<string>("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectPreset = (role: "INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN") => {
    setSelectedRole(role);
    const preset = PRESET_OFFICERS.find((p) => p.role === role);
    if (preset) {
      setEmail(preset.email);
      setPassword("password123");
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        router.push("/dashboard");
      } else {
        setError("Invalid officer credentials. Please verify your email and password.");
      }
    } catch {
      setError("Unable to connect to authentication server. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOneClickLogin = async (role: "INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN") => {
    setError(null);
    setIsSubmitting(true);
    try {
      const ok = await switchRoleQuick(role);
      if (ok) {
        router.push("/dashboard");
      } else {
        setError("Quick login failed.");
      }
    } catch {
      setError("Authentication error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[200px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md sm:max-w-xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-3 group focus:outline-none">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-md group-hover:border-primary/50 transition-all">
              <Image
                src="/logo.avif"
                alt="MAANAK Logo"
                width={48}
                height={48}
                className="object-contain w-full h-full"
                priority
              />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-foreground">MAANAK</span>
                <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  मानक
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                National Legal Metrology Portal (SIH26035)
              </span>
            </div>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Legal Metrology Officer Sign In
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            OIML R-76 NAWI Verification, Testing Workbench & Digital Provenance
          </p>
        </div>

        {/* Quick Persona Switcher Tabs */}
        <div className="bg-card/70 border border-border/80 rounded-3xl p-4 sm:p-5 backdrop-blur-xl shadow-xl space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <IdentificationBadge size={16} className="text-primary" />
              <span>Select Authorized Testing Role</span>
            </label>
            <p className="text-[11px] text-muted-foreground">
              Choose an official testing persona for one-click access or manual sign in:
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_OFFICERS.map((preset) => {
              const isSelected = selectedRole === preset.role;
              return (
                <button
                  key={preset.role}
                  type="button"
                  onClick={() => handleSelectPreset(preset.role)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all min-h-[88px] ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background/50 hover:bg-card hover:border-border"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${preset.badgeColor}`}>
                      {preset.role}
                    </span>
                    <div className="text-xs font-bold text-foreground mt-1 truncate">
                      {preset.name}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {preset.facility.split(" ")[0]}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border/60">
            {error && (
              <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <WarningCircle size={16} weight="bold" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Official Email / Username</span>
                <span className="text-[10px] text-muted-foreground font-mono">Government ID</span>
              </label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@maanak.gov.in"
                required
                icon={<User size={16} />}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center justify-between">
                <span>Passphrase / PIN</span>
                <span className="text-[10px] text-muted-foreground">Argon2id Encrypted</span>
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                icon={<LockKey size={16} />}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                type="submit"
                variant="default"
                size="lg"
                disabled={isSubmitting}
                className="w-full sm:flex-1 h-12 min-h-[48px] rounded-2xl font-bold text-sm shadow-md"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Authenticating...</span>
                ) : (
                  <>
                    <span>Enter Legal Metrology Console</span>
                    <ArrowRight size={16} weight="bold" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                disabled={isSubmitting}
                onClick={() => handleOneClickLogin(selectedRole)}
                className="w-full sm:w-auto h-12 min-h-[48px] rounded-2xl text-xs font-semibold px-4"
              >
                ⚡ Fast Login ({selectedRole})
              </Button>
            </div>
          </form>

          {/* Security & Regulatory Standards Footer */}
          <div className="pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>WELMEC 7.2 Cryptographic Session Active</span>
            </div>
            <div className="flex items-center gap-1">
              <Buildings size={14} />
              <span>OIML R-76 Standards Registry</span>
            </div>
          </div>
        </div>

        {/* Public Links */}
        <div className="text-center text-xs text-muted-foreground">
          Public verification without login?{" "}
          <Link href="/verify" className="text-primary font-semibold hover:underline">
            Scan QR Code or Verify Report Hash
          </Link>
        </div>
      </div>
    </div>
  );
}
