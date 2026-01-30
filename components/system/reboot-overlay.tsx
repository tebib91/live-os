"use client";

import { OrbitLoader } from "@/components/auth/orbit-loader";
import { Button } from "@/components/ui/button";
import { useRebootTracker } from "@/hooks/useRebootTracker";
import { AlertTriangle, CheckCircle2, WifiOff } from "lucide-react";
import { useEffect } from "react";

export function RebootOverlay() {
  const { phase, elapsedSeconds, dismissFailure } = useRebootTracker();

  const visible =
    phase === "initiating" ||
    phase === "waiting" ||
    phase === "failed" ||
    phase === "online";

  useEffect(() => {
    if (phase === "online") {
      const timer = setTimeout(() => window.location.reload(), 800);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  if (!visible) return null;

  const statusLabel =
    phase === "online"
      ? "LiveOS is back online"
      : phase === "failed"
        ? "Restart failed"
        : "Restarting LiveOS…";

  const subLabel =
    phase === "waiting" || phase === "initiating"
      ? `Rebooting services • ${elapsedSeconds}s elapsed`
      : phase === "failed"
        ? "We couldn't reconnect. Please check the host and retry."
        : "Reloading…";

  const pillTone =
    phase === "failed"
      ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
      : phase === "online"
        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
        : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/75 backdrop-blur-2xl">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl shadow-2xl shadow-black/50 px-8 py-10">
        <div className="absolute -top-24 -left-16 h-52 w-52 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-60" />

        <div className="relative flex flex-col gap-6 text-white">
          <div className="flex items-center justify-between gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              System
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${pillTone}`}
            >
              {phase === "waiting" || phase === "initiating"
                ? "Rebooting"
                : phase === "online"
                  ? "Back online"
                  : "Failed"}
            </span>
          </div>

          <div className="flex flex-col items-center gap-4 text-center">
            <StatusVisual phase={phase} />
            <div className="space-y-2">
              <p className="text-2xl font-semibold drop-shadow-sm">
                {statusLabel}
              </p>
              <p className="text-sm text-white/70">{subLabel}</p>
            </div>
            {(phase === "waiting" || phase === "initiating") && (
              <p className="text-xs text-white/60">
                We&apos;ll keep trying to reconnect automatically, even if you
                refresh.
              </p>
            )}
          </div>

          {phase === "failed" && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-amber-50">
              <div className="flex items-center gap-2 text-sm">
                <WifiOff className="h-4 w-4" />
                <span>Check host reachability and try again.</span>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={dismissFailure}>
                  Dismiss
                </Button>
                <Button
                  variant="default"
                  onClick={() => window.location.reload()}
                >
                  Reload page
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusVisual({ phase }: { phase: string }) {
  if (phase === "failed") {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-100 shadow-inner shadow-amber-500/30">
        <AlertTriangle className="h-10 w-10" />
      </div>
    );
  }

  if (phase === "online") {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 shadow-inner shadow-emerald-500/30">
        <CheckCircle2 className="h-11 w-11" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <OrbitLoader />
    </div>
  );
}
