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
  UserPlus,
  SignIn,
} from "@phosphor-icons/react";
import { useAuth, PRESET_OFFICERS } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  let router: ReturnType<typeof useRouter> | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter();
  } catch {
    // Safe fallback for isolated SSR / static unit test execution
  }

  const { user, login, register, switchRoleQuick, isLoading } = useAuth();
  const [mode, setMode] = useState<"SIGN_IN" | "REGISTER">("SIGN_IN");

  // Sign In State
  const [selectedRole, setSelectedRole] = useState<"INSPECTOR" | "REVIEWER" | "DIRECTOR" | "ADMIN">("INSPECTOR");
  const [email, setEmail] = useState<string>("inspector@maanak.gov.in");
  const [password, setPassword] = useState<string>("password123");

  // Register State
  const [regFullName, setRegFullName] = useState<string>("");
  const [regEmail, setRegEmail] = useState<string>("");
  const [regPassword, setRegPassword] = useState<string>("");
  const [regRole, setRegRole] = useState<"INSPECTOR" | "REVIEWER" | "DIRECTOR">("INSPECTOR");
  const [regFacility, setRegFacility] = useState<string>("RRSL National Testing Facility");
  const [regDesignation, setRegDesignation] = useState<string>("Legal Metrology Officer");

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const ok = await login(email, password);
      if (ok) {
        if (router) router.push("/dashboard");
        else if (typeof window !== "undefined") window.location.href = "/dashboard";
      } else {
        setError("Invalid officer credentials. Please verify your email and password.");
      }
    } catch {
      setError("Unable to connect to authentication server. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!regFullName.trim()) {
      setError("Please provide your full legal name.");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      setError("Please provide a valid official government or institutional email address.");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await register({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        role: regRole,
        designation: regDesignation.trim(),
        facility: regFacility.trim(),
      });

      if (ok) {
        if (router) router.push("/dashboard");
        else if (typeof window !== "undefined") window.location.href = "/dashboard";
      } else {
        setError("Failed to create officer account. Email might already be registered.");
      }
    } catch {
      setError("Unable to connect to registration server. Please retry.");
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
        if (router) router.push("/dashboard");
        else if (typeof window !== "undefined") window.location.href = "/dashboard";
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
              <p className="text-xs text-muted-foreground font-medium">
                National Legal Metrology Digital Infrastructure
              </p>
            </div>
          </Link>

          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Statutory NAWI pattern compliance & OIML R-76 test bench verification access.
          </p>
        </div>

        {/* Tab Toggle: Sign In vs Create Account */}
        <div className="p-1 bg-muted/60 rounded-2xl flex items-center gap-1 border border-border/80">
          <button
            type="button"
            onClick={() => {
              setMode("SIGN_IN");
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "SIGN_IN"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SignIn size={16} weight="bold" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("REGISTER");
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "REGISTER"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus size={16} weight="bold" />
            <span>Create Officer Account</span>
          </button>
        </div>

        {/* Form Card */}
        <div className="rounded-sm border border-border bg-card p-6 sm:p-8 shadow-xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5">
              <WarningCircle size={18} className="shrink-0 mt-0.5" weight="bold" />
              <span>{error}</span>
            </div>
          )}

          {mode === "SIGN_IN" ? (
            /* Sign In Mode */
            <div className="space-y-6">
              {/* Officer Persona Presets */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Fast Testing Personas</span>
                  <span className="text-[10px] lowercase text-primary font-normal">Click to pre-fill</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_OFFICERS.map((preset) => (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => handleSelectPreset(preset.role)}
                      className={`p-2.5 rounded-2xl border text-left transition-all text-xs flex flex-col justify-between min-h-[64px] cursor-pointer ${
                        selectedRole === preset.role
                          ? "bg-primary/10 border-primary font-bold shadow-xs ring-1 ring-primary/40"
                          : "bg-muted/30 border-border/60 hover:bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase font-bold text-foreground">
                          {preset.role}
                        </span>
                        {selectedRole === preset.role && (
                          <CheckCircle size={14} weight="fill" className="text-primary" />
                        )}
                      </div>
                      <div className="truncate font-semibold text-foreground mt-1">
                        {preset.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex justify-between">
                    <span>Official Email / Username</span>
                    <span className="text-[11px] text-muted-foreground font-mono">gov.in ID</span>
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@maanak.gov.in"
                    icon={<User size={16} />}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex justify-between">
                    <span>Password</span>
                    <span className="text-[11px] text-muted-foreground">Default: password123</span>
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    icon={<LockKey size={16} />}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  isLoading={isSubmitting}
                  rightIcon={<ArrowRight size={16} weight="bold" />}
                  className="w-full font-bold min-h-[48px] text-sm mt-2"
                >
                  Sign In to Workbench
                </Button>
              </form>

              {/* One-Tap Direct Login */}
              <div className="pt-2 border-t border-border/60 text-center">
                <button
                  type="button"
                  onClick={() => handleOneClickLogin(selectedRole)}
                  disabled={isSubmitting}
                  className="text-xs text-primary hover:underline font-semibold"
                >
                  ⚡ Direct 1-Tap Sign In as {selectedRole}
                </button>
              </div>
            </div>
          ) : (
            /* Register Mode */
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Full Legal Name
                </label>
                <Input
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="e.g. Vikram Malhotra"
                  icon={<User size={16} />}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Official Gov / Laboratory Email
                </label>
                <Input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. v.malhotra@maanak.gov.in"
                  icon={<IdentificationBadge size={16} />}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Role Designation
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => {
                      const r = e.target.value as any;
                      setRegRole(r);
                      setRegDesignation(
                        r === "REVIEWER"
                          ? "Senior Technical Reviewer"
                          : r === "DIRECTOR"
                          ? "Laboratory Director & Signatory"
                          : "Legal Metrology Testing Officer"
                      );
                    }}
                    className="w-full h-11 min-h-[48px] rounded-2xl border border-border bg-input/50 px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="INSPECTOR">Legal Metrology Inspector</option>
                    <option value="REVIEWER">Technical Reviewer</option>
                    <option value="DIRECTOR">Laboratory Director</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Facility / Bay
                  </label>
                  <Input
                    type="text"
                    value={regFacility}
                    onChange={(e) => setRegFacility(e.target.value)}
                    placeholder="RRSL Bay #1"
                    icon={<Buildings size={16} />}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Create Password
                </label>
                <Input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  icon={<LockKey size={16} />}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || isLoading}
                isLoading={isSubmitting}
                rightIcon={<UserPlus size={16} weight="bold" />}
                className="w-full font-bold min-h-[48px] text-sm mt-2"
              >
                Create Account &amp; Enter Workbench
              </Button>
            </form>
          )}
        </div>

        {/* Security & Statutory Seal */}
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 font-mono">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>X.509 PKI &amp; WELMEC 7.2 Cryptographic Session Security</span>
        </div>
      </div>
    </div>
  );
}
