"use client";

import { listLanDevices, type LanDevice } from "@/app/actions/network";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Network, RefreshCw } from "lucide-react";

type NetworkDevicesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDevicesChange?: (devices: LanDevice[], error: string | null) => void;
};

export function NetworkDevicesDialog({
  open,
  onOpenChange,
  onDevicesChange,
}: NetworkDevicesDialogProps) {
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listLanDevices();
      setDevices(result.devices);
      if (result.error) setError(result.error);
      onDevicesChange?.(result.devices, result.error ?? null);
    } catch (err) {
      setError(
        "Failed to scan network devices: " +
          ((err as Error)?.message || "Unknown error"),
      );
      setDevices([]);
      onDevicesChange?.([], "Failed to scan network devices");
    } finally {
      setLoading(false);
    }
  }, [onDevicesChange]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-0 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="space-y-1">
            <DialogTitle className="text-xl font-semibold text-white">
              Network Devices
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Devices discovered via mDNS (avahi) and ARP scan
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
              onClick={refresh}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Rescan
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[520px] px-6 pb-6 pt-4">
          <div className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-100 text-sm">
                <AlertTriangle className="h-4 w-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {loading && devices.length === 0 && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning network...
              </div>
            )}

            {!loading && devices.length === 0 && !error && (
              <p className="text-sm text-white/60">No devices found.</p>
            )}

            {devices.length > 0 && (
              <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
                {devices.map((device) => (
                  <div
                    key={`${device.ip}-${device.mac ?? device.name ?? device.source}`}
                    className="flex items-center justify-between px-3 py-2 bg-white/5 text-sm text-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 border border-white/15">
                        <Network className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">
                          {device.name || "Unknown device"}
                        </div>
                        <div className="text-white/60 truncate text-xs">
                          {device.ip}
                          {device.mac ? ` • ${device.mac}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] uppercase tracking-wide text-white/60">
                      {device.source}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
