"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useRebootTracker } from "@/hooks/useRebootTracker";
import { Button } from "@/components/ui/button";

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
      ? `This may take ~60–90 seconds • ${elapsedSeconds}s`
      : phase === "failed"
        ? "Please try again or check server access."
        : "Reloading…";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl">
      <div className="relative w-[360px] max-w-[90vw] overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40">
        <div className="absolute -top-24 -left-10 h-48 w-48 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -bottom-28 -right-12 h-60 w-60 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="relative flex flex-col items-center gap-4 text-center text-white">
          <CircleStatus phase={phase} />
          <div className="space-y-1">
            <div className="text-lg font-semibold drop-shadow-sm">{statusLabel}</div>
            <div className="text-sm text-white/70">{subLabel}</div>
          </div>

          {phase === "failed" && (
            <div className="mt-2 flex flex-col gap-3">
              <div className="text-sm text-amber-200/90">
                Verify the server is reachable, then retry.
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

function CircleStatus({ phase }: { phase: string }) {
  const base = "absolute inset-0 rounded-full";
  if (phase === "failed") {
    return (
      <div className="relative h-24 w-24">
        <div className={`${base} border border-amber-500/50`} />
        <div className="absolute inset-0 flex items-center justify-center text-amber-300">
          <AlertTriangle className="h-10 w-10" />
        </div>
      </div>
    );
  }

  if (phase === "online") {
    return (
      <div className="relative h-24 w-24">
        <div className={`${base} border border-emerald-400/50`} />
        <div className="absolute inset-0 flex items-center justify-center text-emerald-300">
          <CheckCircle2 className="h-11 w-11" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-24 w-24">
      <div className={`${base} border border-white/10`} />
      <div
        className={`${base} border-4 border-white/30 border-t-transparent animate-spin`}
        style={{ animationDuration: "1.2s" }}
      />
      <div className="absolute inset-2 rounded-full border border-white/10" />
      <div className="absolute inset-0 flex items-center justify-center text-white/80">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    </div>
  );
}
