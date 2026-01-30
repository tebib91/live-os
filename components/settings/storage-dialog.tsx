"use client";

import { getStorageInfo, type StorageInfo } from "@/app/actions/storage";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/utils";
import {
    Gauge,
    HardDrive,
    HardDriveDownload,
    Loader2,
    RefreshCw,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

type StorageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StorageDialog({ open, onOpenChange }: StorageDialogProps) {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getStorageInfo();
      setInfo(data);
    } catch (err) {
      setError((err as Error)?.message || "Unable to read storage info.");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void refresh();
    }
  }, [open, refresh]);

  const diskCount = info?.disks.length ?? 0;
  const partitionCount = info?.partitions.length ?? 0;
  const volumeCount = info?.volumes.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl max-h-[90vh] bg-white/5 backdrop-blur-xl border border-white/10 p-0 overflow-hidden shadow-2xl shadow-black/40">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/70">
              <Gauge className="h-3.5 w-3.5" />
              Stockage
            </div>
            <DialogTitle className="text-xl font-semibold text-white">
              Disks, partitions, and volumes
            </DialogTitle>
            <DialogDescription className="text-xs text-white/60">
              Live snapshot from systeminformation plus df / lsblk
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
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
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

        <ScrollArea className="max-h-[75vh] px-6 pb-6 pt-4">
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard
                label="Disks"
                value={diskCount}
                icon={<HardDrive className="h-4 w-4" />}
              />
              <StatCard
                label="Partitions"
                value={partitionCount}
                icon={<HardDriveDownload className="h-4 w-4" />}
              />
              <StatCard
                label="Volumes"
                value={volumeCount}
                icon={<HardDrive className="h-4 w-4" />}
              />
            </div>

            {info && (
              <>
                <Section title="Disks">
                  {info.disks.length === 0 ? (
                    <EmptyMessage text="No disks detected." />
                  ) : (
                    <div className="space-y-2">
                      {info.disks.map((disk, idx) => (
                        <div
                          key={`${disk.device}-${idx}`}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold truncate">
                              {disk.name || disk.device}
                            </p>
                            <p className="text-white/60 text-xs truncate">
                              {disk.vendor || "Unknown vendor"} ·{" "}
                              {disk.interfaceType || "?"}
                            </p>
                          </div>
                          <div className="text-white/80">
                            {formatBytes(disk.size)}
                          </div>
                          <div className="text-white/70 text-xs">
                            Type: {disk.type || "Unknown"}
                          </div>
                          <div className="text-white/60 text-xs truncate">
                            Serial: {disk.serialNum || "N/A"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Partitions">
                  {info.partitions.length === 0 ? (
                    <EmptyMessage text="No partitions detected." />
                  ) : (
                    <div className="space-y-2">
                      {info.partitions.map((part) => (
                        <div
                          key={`${part.name}-${part.uuid ?? part.label ?? part.mount}`}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white"
                        >
                          <div className="truncate font-semibold">
                            {part.name}
                          </div>
                          <div className="text-white/80 truncate">
                            {part.mount || "—"}
                          </div>
                          <div className="text-white/70 text-xs">
                            {part.fsType || "Unknown"}
                          </div>
                          <div className="text-white/70 text-xs truncate">
                            {part.label || part.uuid || "No label"}
                          </div>
                          <div className="text-white/80 text-sm">
                            {formatBytes(Number(part.size) || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="Volumes">
                  {info.volumes.length === 0 ? (
                    <EmptyMessage text="No mounted volumes found." />
                  ) : (
                    <div className="space-y-2">
                      {info.volumes.map((vol) => (
                        <div
                          key={vol.fs}
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white"
                        >
                          <div className="truncate font-semibold">{vol.fs}</div>
                          <div className="text-white/70 text-xs">
                            {vol.type || "Unknown"}
                          </div>
                          <div className="text-white/70 text-xs truncate">
                            {vol.mount || "—"}
                          </div>
                          <div className="text-white/80 text-sm">
                            {formatBytes(vol.used)} / {formatBytes(vol.size)}{" "}
                            {vol.use ? `(${vol.use}%)` : ""}
                          </div>
                          <div className="text-white/60 text-xs truncate">
                            {vol.mount || vol.type || ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                <Section title="df -h">
                  <CommandOutput
                    output={info.dfOutput}
                    placeholder="df -h output unavailable."
                  />
                </Section>

                <Section title="lsblk -f">
                  <CommandOutput
                    output={info.lsblkOutput}
                    placeholder="lsblk output unavailable."
                  />
                </Section>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs text-white/60">{label}</p>
        <p className="text-lg font-semibold">{value}</p>
      </div>
      <span className="rounded-full border border-white/15 bg-white/10 p-2 text-white/80">
        {icon}
      </span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      {children}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return <p className="text-sm text-white/60">{text}</p>;
}

function CommandOutput({
  output,
  placeholder,
}: {
  output: string | null;
  placeholder: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 text-white/80 font-mono text-xs p-3 overflow-x-auto whitespace-pre-wrap">
      {output || placeholder}
    </div>
  );
}
