"use client";

import React, { useState } from "react";
import {
  X,
  Key,
  ShieldCheck,
  Certificate,
  LockKey,
  WarningCircle,
  CheckCircle,
  DownloadSimple,
  FilePdf,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface DigitalSignatureData {
  signedBy: string;
  signatoryTitle: string;
  issuer: string;
  algorithm: string;
  serialNumber: string;
  timestampUtc: string;
  signatureHash: string;
}

export interface SigningPinModalProps {
  isOpen: boolean;
  reportId: string;
  onClose: () => void;
  onSignSuccess: (sigData: DigitalSignatureData) => void;
}

export function SigningPinModal({
  isOpen,
  reportId,
  onClose,
  onSignSuccess,
}: SigningPinModalProps) {
  const [pin, setPin] = useState<string>("");
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigitClick = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setErrorMsg(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin("");
    setErrorMsg(null);
  };

  const handleSign = () => {
    if (pin.length !== 6) {
      setErrorMsg("Please enter your complete 6-digit Director signing PIN.");
      return;
    }

    setIsSigning(true);
    setErrorMsg(null);

    // Simulate cryptographic HSM / X.509 PKI signature generation
    setTimeout(() => {
      setIsSigning(false);
      const signatureData: DigitalSignatureData = {
        signedBy: "Dr. Rajesh Sharma",
        signatoryTitle: "Director (Legal Metrology), RRSL Western Region",
        issuer: "CCA India / National Root CA - Class 3 Digital Certificate",
        algorithm: "RSA-2048 / SHA-256 with PKCS#7 Attached Signature",
        serialNumber: "4A:8F:12:D9:3E:01:BC:77:E9:10:4B",
        timestampUtc: new Date().toISOString(),
        signatureHash:
          "9f8a2c14e6b7d3058a74e9c1f6d3a82e5b4c7d0182f6e9a3c5b8d7e14a2f09c6",
      };

      onSignSuccess(signatureData);
      onClose();
    }, 600);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header with Close */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Key className="h-6 w-6" weight="duotone" />
            </div>
            <div>
              <h3
                id="signing-modal-title"
                className="text-lg font-bold text-foreground"
              >
                Director X.509 PKI Signature
              </h3>
              <p className="text-xs text-muted-foreground">
                Official Authorization for Report #{reportId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close signing dialog"
            className="p-2 text-muted-foreground hover:text-foreground rounded-xl transition min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Certificate Credentials Card */}
        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Certificate className="h-4 w-4 text-primary" weight="bold" />
              Signatory Identity
            </span>
            <Badge variant="pass" className="text-[10px] py-0 px-2">
              Valid Token
            </Badge>
          </div>
          <div className="space-y-0.5 text-muted-foreground font-mono text-[11px]">
            <div>CN=Dr. Rajesh Sharma (Director)</div>
            <div>O=Regional Reference Standard Laboratory, Ahmedabad</div>
            <div className="text-[10px] text-primary">
              CCA India / RSA-2048 / SHA-256 PKCS#7
            </div>
          </div>
        </div>

        {/* 6-Digit PIN Display */}
        <div className="space-y-2 text-center">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-center gap-1.5">
            <LockKey className="h-4 w-4 text-primary" />
            Enter 6-Digit Director Signing PIN
          </label>

          <div
            className="flex items-center justify-center gap-3 py-3"
            data-testid="pin-display"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`h-11 w-11 rounded-xl border flex items-center justify-center text-lg font-bold transition ${
                  i < pin.length
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/80 bg-background text-muted-foreground/30"
                }`}
              >
                {i < pin.length ? "●" : "—"}
              </div>
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs text-destructive flex items-center justify-center gap-1">
              <WarningCircle className="h-4 w-4 shrink-0" weight="fill" />
              {errorMsg}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Test PIN: <span className="font-mono font-bold text-foreground">123456</span>
          </p>
        </div>

        {/* Touch Keypad */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <Button
              key={num}
              type="button"
              variant="outline"
              onClick={() => handleDigitClick(num)}
              className="min-h-[48px] text-base font-semibold border-border/70 hover:bg-muted/60"
            >
              {num}
            </Button>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="min-h-[48px] text-xs font-semibold text-muted-foreground hover:bg-muted/60"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDigitClick("0")}
            className="min-h-[48px] text-base font-semibold border-border/70 hover:bg-muted/60"
          >
            0
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleBackspace}
            className="min-h-[48px] text-xs font-semibold text-muted-foreground hover:bg-muted/60"
          >
            ⌫
          </Button>
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col gap-2">
          <Button
            type="button"
            disabled={pin.length !== 6 || isSigning}
            onClick={handleSign}
            className="w-full min-h-[48px] text-sm font-bold flex items-center justify-center gap-2"
          >
            {isSigning ? (
              <span>Sealing Cryptographic Signature...</span>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" weight="bold" />
                <span>Confirm &amp; Digitally Sign Report</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full min-h-[48px] text-xs"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
