/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { getWallpapers, updateSettings } from "@/app/actions/settings";
import { getSystemInfo } from "@/app/actions/system";
import { getStorageInfo, getSystemStatus } from "@/app/actions/system-status";
import { WifiDialog } from "./wifi-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRightLeft,
  Database,
  Globe,
  Key,
  LogOut,
  Power,
  RotateCw,
  Shield,
  User,
  Wifi,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MetricCard } from "./metric-card";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWallpaperChange?: (wallpaper: string) => void;
  currentWallpaper?: string;
}

type WallpaperOption = {
  id: string;
  name: string;
  path: string;
};

export function SettingsDialog({
  open,
  onOpenChange,
  onWallpaperChange,
  currentWallpaper,
}: SettingsDialogProps) {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [wallpapers, setWallpapers] = useState<WallpaperOption[]>([]);
  const [wallpapersLoading, setWallpapersLoading] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      // Fetch initial data
      fetchSystemData();
      fetchSystemInfo();
      fetchWallpapers();

      // Poll every 3 seconds
      const interval = setInterval(fetchSystemData, 3000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const fetchSystemData = async () => {
    const [status, storage] = await Promise.all([
      getSystemStatus(),
      getStorageInfo(),
    ]);
    setSystemStatus(status);
    setStorageInfo(storage);
  };

  const fetchSystemInfo = async () => {
    const info = await getSystemInfo();
    setSystemInfo(info);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] bg-zinc-900 border-zinc-800 shadow-2xl p-0 gap-0 overflow-hidden"
        aria-describedby="settings-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6">
          <DialogTitle className="text-5xl font-bold text-white/90 -tracking-[0.02em]">
            Settings
          </DialogTitle>
          <DialogDescription id="settings-description" className="sr-only">
            System settings and configuration
          </DialogDescription>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full hover:bg-white/10 text-white/40 hover:text-white/90 transition-colors"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="flex">
            {/* Left Sidebar - System Metrics */}
            <div className="w-80 p-6 space-y-4">
              {/* System Preview Card */}
              <div className="relative aspect-video rounded-xl overflow-hidden border-[3px] border-white/20 bg-zinc-950">
                {currentWallpaper && (
                  <Image
                    src={currentWallpaper}
                    alt="System preview"
                    className="w-full h-full object-cover opacity-30"
                    width={500}
                    height={500}
                  />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-white/40 -tracking-[0.01em]">
                    Good evening, {systemInfo?.username || "User"}
                  </p>
                </div>
              </div>

              {/* Storage Card */}
              {storageInfo && (
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <MetricCard
                    label="Storage"
                    value={`${storageInfo.used} GB`}
                    total={`${storageInfo.total} GB`}
                    percentage={storageInfo.usagePercent}
                    detail={`${
                      Math.round((storageInfo.total - storageInfo.used) * 10) /
                      10
                    } GB left`}
                    color={getMetricColor(storageInfo.usagePercent)}
                  />
                </div>
              )}

              {/* Memory Card */}
              {systemStatus && (
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <MetricCard
                    label="Memory"
                    value={formatBytes(systemStatus.memory.used).replace(
                      " ",
                      " "
                    )}
                    total={formatBytes(systemStatus.memory.total).replace(
                      " ",
                      " "
                    )}
                    percentage={systemStatus.memory.usage}
                    detail={`${formatBytes(
                      systemStatus.memory.total - systemStatus.memory.used
                    )} left`}
                    color={getMetricColor(systemStatus.memory.usage)}
                  />
                </div>
              )}

              {/* CPU Card */}
              {systemStatus && (
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <MetricCard
                    label="CPU"
                    value={`${systemStatus.cpu.usage}%`}
                    percentage={systemStatus.cpu.usage}
                    detail="8 threads"
                    color={getMetricColor(systemStatus.cpu.usage)}
                  />
                </div>
              )}

              {/* Temperature Card */}
              {systemStatus && systemStatus.cpu.temperature && (
                <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                  <div className="space-y-1.5">
                    <div className="text-xs text-white/40 -tracking-[0.01em]">
                      Temperature
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                        {systemStatus.cpu.temperature}°C
                      </div>
                      <div className="flex gap-1">
                        <button className="px-2 py-1 text-xs rounded bg-white/10 text-white/90">
                          °C
                        </button>
                        <button className="px-2 py-1 text-xs rounded bg-white/5 text-white/40">
                          °F
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-xs text-white/40 -tracking-[0.01em]">
                        Normal
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Content Area - Settings Sections */}
            <div className="flex-1 bg-zinc-900/50 p-6 space-y-4">
              {/* Device Info Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white/90 -tracking-[0.01em]">
                      {systemInfo?.username || "User"}&apos;s{" "}
                      <span className="text-white/40">LiveOS</span>
                    </h3>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Restart
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-[#E22C2C]/20 text-[#F53737] hover:text-[#F53737] text-xs"
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Shut down
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex">
                    <span className="w-32 text-white/40">Device</span>
                    <span className="text-white/90">
                      {systemInfo?.hostname || "LiveOS Server"}
                    </span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-white/40">LiveOS</span>
                    <span className="text-white/90">LiveOS 1.5</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-white/40">Local IP</span>
                    <span className="text-white/90">192.168.1.12</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-white/40">Uptime</span>
                    <span className="text-white/90">6 hours</span>
                  </div>
                </div>
              </div>

              {/* Account Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 -tracking-[0.01em] mb-1">
                      Account
                    </h4>
                    <p className="text-xs text-white/40">
                      Your name and password
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Change name
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Change password
                    </Button>
                  </div>
                </div>
              </div>

              {/* Wallpaper Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="mb-4">
                  <h4 className="text-lg font-bold text-white mb-1">
                    Wallpaper
                  </h4>
                  <p className="text-sm text-zinc-400">
                    Your LiveOS wallpaper and theme
                  </p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {wallpapersLoading && (
                    <div className="text-xs text-white/40 py-2">
                      Loading wallpapers...
                    </div>
                  )}
                  {!wallpapersLoading && wallpapers.length === 0 && (
                    <div className="text-xs text-white/40 py-2">
                      No wallpapers found in `public/wallpapers`.
                    </div>
                  )}
                  {wallpapers.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      onClick={() => handleWallpaperSelect(wallpaper.path)}
                      className={`
                        relative flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden border-2 transition-all
                        ${
                          currentWallpaper === wallpaper.path
                            ? "border-cyan-500 ring-2 ring-cyan-500/20"
                            : "border-zinc-700 hover:border-zinc-600"
                        }
                      `}
                    >
                      <Image
                        src={wallpaper.path}
                        alt={wallpaper.name}
                        className="w-full h-full object-cover"
                        width={500}
                        height={500}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Wi-Fi Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 -tracking-[0.01em] mb-1">
                      Wi-Fi
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Wifi className="h-3.5 w-3.5" />
                      <span>HOMEAIJot</span>
                      <Shield className="h-3 w-3" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white"
                    onClick={() => setWifiDialogOpen(true)}
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    View networks
                  </Button>
                </div>
              </div>

              {/* 2FA Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 -tracking-[0.01em] mb-1">
                      2FA
                    </h4>
                    <p className="text-xs text-white/40">
                      A second layer of security for your LiveOS login and apps
                    </p>
                  </div>
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={setTwoFactorEnabled}
                  />
                </div>
              </div>

              {/* Backups Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 -tracking-[0.01em] mb-1">
                      Backups
                    </h4>
                    <p className="text-xs text-white/40">
                      Back up your files, apps, and data to another LiveOS, NAS,
                      or external drive
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Set up
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Restore
                    </Button>
                  </div>
                </div>
              </div>

              {/* Migration Assistant Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 -tracking-[0.01em] mb-1">
                      Migration Assistant
                    </h4>
                    <p className="text-xs text-white/40">
                      Transfer all your apps and data from a Raspberry Pi to
                      LiveOS
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-zinc-800 hover:bg-zinc-700 text-white"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Migrate
                  </Button>
                </div>
              </div>

              {/* Language Section */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white/90 -tracking-[0.01em] mb-1">
                      Language
                    </h4>
                    <p className="text-xs text-white/40">
                      Your preferred language
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white/10 hover:bg-white/15 text-white/90 text-xs"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    English
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        <WifiDialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen} />
      </DialogContent>
    </Dialog>
  );
}
