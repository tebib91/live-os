"use client";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bluetooth, Loader2, RefreshCw } from "lucide-react";

type BluetoothSectionProps = {
  powered?: boolean;
  blocked?: boolean;
  adapter?: string | null;
  devices?: number;
  firstDevice?: string;
  available?: boolean;
  loading?: boolean;
  error?: string | null;
  onToggle: (enabled: boolean) => void | Promise<void>;
  onRefresh?: () => void | Promise<void>;
};

export function BluetoothSection({
  powered,
  blocked,
  adapter,
  devices,
  firstDevice,
  available = true,
  loading = false,
  error,
  onToggle,
  onRefresh,
}: BluetoothSectionProps) {
  const statusLabel = available
    ? powered
      ? "On"
      : "Off"
    : "Unavailable";

  const deviceLabel =
    typeof devices === "number" && devices >= 0
      ? `${devices} device${devices === 1 ? "" : "s"}`
      : null;

  const adapterLabel = adapter
    ? `Adapter ${adapter}`
    : available
      ? "Detecting adapter..."
      : "No adapter detected";

  const subtitleParts = [
    deviceLabel,
    firstDevice ? `First: ${firstDevice}` : null,
  ].filter(Boolean);

  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-full border border-white/15 bg-white/10 p-2">
            <Bluetooth className="h-4 w-4 text-white" />
          </span>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white -tracking-[0.01em]">
                Bluetooth
              </h4>
              {blocked && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                  Blocked
                </span>
              )}
            </div>
            <div className="text-xs text-white/60 flex items-center gap-2 flex-wrap">
              <span className="text-white">{statusLabel}</span>
              <span className="text-white/50">•</span>
              <span className="text-white/70">{adapterLabel}</span>
            </div>
            {subtitleParts.length > 0 && (
              <div className="text-xs text-white/60">
                {subtitleParts.join(" • ")}
              </div>
            )}
            {error && (
              <p className="text-xs text-red-300">{error}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/80" />}
          <Switch
            checked={Boolean(powered)}
            disabled={loading || !available}
            onCheckedChange={onToggle}
            aria-label="Toggle Bluetooth"
          />
        </div>
      </div>
      {onRefresh && (
        <div className="mt-4 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh status
          </Button>
        </div>
      )}
    </div>
  );
}
