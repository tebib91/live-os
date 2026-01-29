"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, MapPin, Wifi } from "lucide-react";
import type { ReactNode } from "react";
import type { TailscaleIntent, TailscaleStatus } from "@/types/setup";

type PostSetupProps = {
  locationStatus: string;
  locationError: string | null;
  tailscaleIntent: TailscaleIntent;
  tailscaleStatus: TailscaleStatus;
  tailscaleError: string | null;
  onUseLocation: () => void;
  onTailscaleChoice: (choice: Exclude<TailscaleIntent, "pending">) => void;
  version: string;
  onFinish: () => void;
};

export function PostSetup({
  locationStatus,
  locationError,
  tailscaleIntent,
  tailscaleStatus,
  tailscaleError,
  onUseLocation,
  onTailscaleChoice,
  version,
  onFinish,
}: PostSetupProps) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/25 space-y-3">
          <CardHeader
            title="Location (optional)"
            description="Improves weather and widget defaults."
            icon={<MapPin className="h-5 w-5 text-white" />}
          />
          <Button
            variant="ghost"
            onClick={onUseLocation}
            className="w-full border border-white/15 text-white"
            disabled={!!locationStatus}
          >
            {locationStatus ? locationStatus : "Use my location"}
          </Button>
          {locationError && (
            <p className="text-xs text-red-400">{locationError}</p>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-inner shadow-black/25 space-y-3">
          <CardHeader
            title="Tailscale (optional)"
            description="Deploy the bundled Tailscale container now or skip for later."
            icon={<Wifi className="h-5 w-5 text-white" />}
          />
          <div className="flex gap-3">
            <Button
              variant={tailscaleIntent === "auto" ? "default" : "ghost"}
              className="flex-1 border border-white/15 text-white"
              onClick={() => onTailscaleChoice("auto")}
              disabled={tailscaleStatus === "installing"}
            >
              {tailscaleStatus === "installing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Installing…
                </>
              ) : tailscaleStatus === "installed" ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-300" />
                  Installed
                </>
              ) : (
                "Install now"
              )}
            </Button>
            <Button
              variant={tailscaleIntent === "skip" ? "default" : "ghost"}
              className="flex-1 border border-white/15 text-white"
              onClick={() => onTailscaleChoice("skip")}
              disabled={tailscaleStatus === "installing"}
            >
              Skip for now
            </Button>
          </div>
          <p className="text-xs text-white/60">
            Runs the bundled docker compose and marks the app as installed.
          </p>
          {tailscaleError && (
            <p className="text-xs text-red-400">{tailscaleError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-white/60">
        <span>Version {version}</span>
        <Button
          onClick={onFinish}
          className="bg-white/10 text-white hover:bg-white/20 border border-white/15"
          disabled={tailscaleStatus === "installing"}
        >
          Go to login
        </Button>
      </div>
    </>
  );
}

function CardHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
        {icon}
      </div>
      <div>
        <p className="text-white font-medium">{title}</p>
        <p className="text-sm text-white/60">{description}</p>
      </div>
    </div>
  );
}
