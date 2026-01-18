/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { getWallpapers, updateSettings } from "@/app/actions/settings";
import { getSystemInfo, getUptime } from "@/app/actions/system";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SettingsSidebar } from "./settings-sidebar";
import {
  AccountSection,
  DeviceInfoSection,
  LanguageSection,
  SystemDetailsCard,
  WallpaperOption,
  WallpaperSection,
  WifiSection,
} from "./sections";
import { SystemDetailsDialog } from "./system-details-dialog";
import { WifiDialog } from "./wifi-dialog";
import { HardwareInfo } from "./hardware-utils";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWallpaperChange?: (wallpaper: string) => void;
  currentWallpaper?: string;
}

export function SettingsDialog({
  open,
  onOpenChange,
  onWallpaperChange,
  currentWallpaper,
}: SettingsDialogProps) {
  // Real-time metrics from SSE stream
  const { systemStats, storageStats } = useSystemStatus();

  // Static data - fetched once when dialog opens
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [wallpapers, setWallpapers] = useState<WallpaperOption[]>([]);
  const [wallpapersLoading, setWallpapersLoading] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [systemDetailsOpen, setSystemDetailsOpen] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const router = useRouter();

  // Fetch static data once when dialog opens
  useEffect(() => {
    if (open) {
      fetchSystemInfo();
      fetchWallpapers();
      fetchUptime();
    }
  }, [open]);

  const fetchSystemInfo = async () => {
    const info = await getSystemInfo();
    setSystemInfo(info);
  };

  const fetchUptime = async () => {
    try {
      const seconds = await getUptime();
      setUptimeSeconds(seconds);
    } catch (error) {
      console.error("Failed to load uptime:", error);
    }
  };

  const fetchWallpapers = async () => {
    setWallpapersLoading(true);
    try {
      const availableWallpapers = await getWallpapers();
      setWallpapers(availableWallpapers);
    } catch (error) {
      console.error("Failed to load wallpapers:", error);
      setWallpapers([]);
    } finally {
      setWallpapersLoading(false);
    }
  };

  const handleWallpaperSelect = async (path: string) => {
    onWallpaperChange?.(path);
    try {
      await updateSettings({ currentWallpaper: path });
    } catch (error) {
      console.error("Failed to update wallpaper:", error);
    }
  };

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 GB";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getMetricColor = (
    percentage: number
  ): "cyan" | "green" | "yellow" | "red" => {
    if (percentage < 80) return "cyan";
    if (percentage < 90) return "yellow";
    return "red";
  };

  const hardware: HardwareInfo | undefined = systemStats?.hardware;

  const uptimeLabel = () => {
    const seconds = uptimeSeconds || 0;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const handleLogout = async () => {
    const res = await fetch("/api/auth/logout", { method: "POST" });
    if (res.ok) {
      toast.success("Logged out");
      router.push("/login");
    } else {
      toast.error("Failed to log out");
    }
  };

  const handleRestart = async () => {
    const res = await fetch("/api/system/restart", { method: "POST" });
    if (res.ok) {
      toast.success("Restarting system...");
    } else {
      toast.error("Restart failed");
    }
  };

  const handleShutdown = async () => {
    const res = await fetch("/api/system/shutdown", { method: "POST" });
    if (res.ok) {
      toast.success("Shutting down...");
    } else {
      toast.error("Shutdown failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
        aria-describedby="settings-description"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              System
            </span>
            <DialogTitle className="text-4xl font-semibold text-white drop-shadow">
              Settings
            </DialogTitle>
            <DialogDescription id="settings-description" className="sr-only">
              System settings and configuration
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="flex">
            <SettingsSidebar
              currentWallpaper={currentWallpaper}
              systemInfo={systemInfo}
              storageInfo={storageStats}
              systemStatus={systemStats}
              formatBytes={formatBytes}
              getMetricColor={getMetricColor}
            />

            <div className="flex-1 bg-white/5 p-6 space-y-4 backdrop-blur-xl">
              <DeviceInfoSection
                systemInfo={systemInfo}
                uptimeLabel={uptimeLabel()}
                onLogout={handleLogout}
                onRestart={handleRestart}
                onShutdown={handleShutdown}
              />
              <AccountSection />
              <WallpaperSection
                wallpapers={wallpapers}
                wallpapersLoading={wallpapersLoading}
                currentWallpaper={currentWallpaper}
                onSelect={handleWallpaperSelect}
              />
              <WifiSection onOpenDialog={() => setWifiDialogOpen(true)} />
              <LanguageSection />
              {hardware && (
                <SystemDetailsCard
                  hardware={hardware}
                  onOpenTabs={() => setSystemDetailsOpen(true)}
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {wifiDialogOpen && (
          <WifiDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />
        )}
        <SystemDetailsDialog
          open={systemDetailsOpen}
          onOpenChange={setSystemDetailsOpen}
          hardware={hardware}
          cpuUsage={systemStats?.cpu?.usage}
          cpuPower={systemStats?.cpu?.power}
          memory={systemStats?.memory}
        />
      </DialogContent>
    </Dialog>
  );
}
