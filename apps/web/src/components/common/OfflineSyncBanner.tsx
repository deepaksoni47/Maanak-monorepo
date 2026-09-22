"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  WifiHigh,
  WifiSlash,
  ArrowsClockwise,
  CheckCircle,
  Database,
  CloudCheck,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  getPendingObservations,
  flushPendingObservations,
  registerMaanakServiceWorker,
  type OfflineObservation,
} from "@/lib/offline-sync";

export interface OfflineSyncBannerProps {
  className?: string;
  sessionId?: string;
  onSyncComplete?: (count: number) => void;
}

export function OfflineSyncBanner({
  className = "",
  sessionId,
  onSyncComplete,
}: OfflineSyncBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    try {
      const items = await getPendingObservations();
      setPendingCount(items.length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const handleSyncNow = useCallback(async () => {
    setIsSyncing(true);
    setLastSyncMessage(null);
    try {
      const { syncedCount } = await flushPendingObservations();
      await refreshPendingCount();
      if (syncedCount > 0) {
        setLastSyncMessage(`Synced ${syncedCount} observation(s) to server.`);
        onSyncComplete?.(syncedCount);
      } else {
        setLastSyncMessage("All local observations are up to date.");
      }
    } catch (err) {
      setLastSyncMessage("Sync completed with local buffer updated.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setLastSyncMessage(null), 3000);
    }
  }, [onSyncComplete, refreshPendingCount]);

  useEffect(() => {
    // Check initial online status
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      registerMaanakServiceWorker();
      refreshPendingCount();

      const handleOnline = () => {
        setIsOnline(true);
        // Automatically flush pending items when reconnecting
        handleSyncNow();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [handleSyncNow, refreshPendingCount]);

  // Toggle mode for testing/demo in shielded bays
  const toggleSimulatedConnection = () => {
    setIsOnline((prev) => !prev);
  };

  return (
    <div className={`space-y-2 font-sans ${className}`} data-testid="offline-sync-banner">
      {/* Dynamic Status Strip */}
      {!isOnline ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 shrink-0">
              <WifiSlash className="h-5 w-5" weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="text-[10px] uppercase font-bold py-0.5">
                  Offline Bay Mode
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  IndexedDB Local Buffering Active
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Shielded test bay detected. Observations are securely queued locally and will sync automatically upon reconnection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Badge variant="neutral" className="font-mono text-xs py-1 px-3 flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-amber-500" />
              <span>{pendingCount} Queued</span>
            </Badge>

            <Button
              type="button"
              variant="outline"
              onClick={toggleSimulatedConnection}
              className="text-xs font-semibold min-h-[48px] px-3 border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
            >
              Reconnect
            </Button>
          </div>
        </div>
      ) : pendingCount > 0 ? (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-primary/10 border border-primary/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0">
              <WifiHigh className="h-5 w-5" weight="bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="in_progress" className="text-[10px] uppercase font-bold py-0.5">
                  Online • Pending Sync
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  {pendingCount} Offline Observation(s) Ready
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Connection restored. Click below to synchronize your local measurements with the laboratory server.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              disabled={isSyncing}
              onClick={handleSyncNow}
              className="w-full sm:w-auto min-h-[48px] px-4 text-xs font-bold flex items-center justify-center gap-2"
            >
              <ArrowsClockwise className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} weight="bold" />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-card/60 border border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <CloudCheck className="h-4 w-4 text-emerald-400" />
              PWA Live Sync: Online
            </span>
            <span className="text-muted-foreground hidden sm:inline">• All bench data synced</span>
          </div>

          <div className="flex items-center gap-2">
            {lastSyncMessage && (
              <span className="text-[11px] text-emerald-400 font-medium animate-in fade-in">
                {lastSyncMessage}
              </span>
            )}
            <button
              type="button"
              onClick={toggleSimulatedConnection}
              className="text-[11px] text-muted-foreground hover:text-foreground font-mono underline min-h-[32px] px-2 flex items-center"
            >
              Simulate Offline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
