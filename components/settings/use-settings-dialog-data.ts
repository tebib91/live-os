"use client";

import { getFirewallStatus } from "@/app/actions/firewall";
import {
  listLanDevices,
  type LanDevice,
  type LanDevicesResult,
} from "@/app/actions/network";
import { getWallpapers, updateSettings } from "@/app/actions/settings";
import { getSystemInfo, getUptime } from "@/app/actions/system";
import { checkForUpdates, type UpdateStatus } from "@/app/actions/update";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useRebootTracker } from "@/hooks/useRebootTracker";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { HardwareInfo } from "./hardware-utils";
import type { WallpaperOption } from "./sections";

const LAN_DEVICES_TIMEOUT_MS = 10000;

type UseSettingsDialogDataParams = {
  open: boolean;
  onWallpaperChange?: (wallpaper: string) => void;
};

type SystemInfo = {
  username: string;
  hostname: string;
  platform: string;
  ip: string;
  arch: string;
};

export function useSettingsDialogData({
  open,
  onWallpaperChange,
}: UseSettingsDialogDataParams) {
  const router = useRouter();
  const { systemStats, storageStats } = useSystemStatus({ enabled: open });
  const { requestReboot } = useRebootTracker();

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [wallpapers, setWallpapers] = useState<WallpaperOption[]>([]);
  const [wallpapersLoading, setWallpapersLoading] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [firewallDialogOpen, setFirewallDialogOpen] = useState(false);
  const [firewallEnabled, setFirewallEnabled] = useState<boolean | undefined>(
    undefined,
  );
  const [systemDetailsOpen, setSystemDetailsOpen] = useState(false);
  const [networkDevicesOpen, setNetworkDevicesOpen] = useState(false);
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [lanDevices, setLanDevices] = useState<LanDevice[]>([]);
  const [lanDevicesLoading, setLanDevicesLoading] = useState(false);
  const [lanDevicesError, setLanDevicesError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [advancedDialogOpen, setAdvancedDialogOpen] = useState(false);
  const [savingWallpaper, setSavingWallpaper] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchSystemInfo();
    fetchWallpapers();
    fetchUptime();
    fetchFirewallStatus();
  }, [open]);

  useEffect(() => {
    if (networkDevicesOpen) {
      fetchLanDevices();
    }
  }, [networkDevicesOpen]);

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

  const fetchFirewallStatus = async () => {
    try {
      const result = await getFirewallStatus();
      setFirewallEnabled(result.status.enabled);
    } catch (error) {
      console.error("Failed to load firewall status:", error);
    }
  };

  const fetchLanDevices = async () => {
    setLanDevicesLoading(true);
    setLanDevicesError(null);
    try {
      const timeoutPromise = new Promise<LanDevicesResult>((resolve) => {
        setTimeout(
          () =>
            resolve({
              devices: [],
              error: "LAN scan timed out",
            }),
          LAN_DEVICES_TIMEOUT_MS,
        );
      });
      const result = await Promise.race([listLanDevices(), timeoutPromise]);
      setLanDevices(result.devices);
      if (result.error) setLanDevicesError(result.error);
    } catch (error) {
      console.error("Failed to list LAN devices:", error);
      setLanDevicesError("Failed to scan network devices");
      setLanDevices([]);
    } finally {
      setLanDevicesLoading(false);
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
    setSavingWallpaper(true);
    try {
      await updateSettings({ currentWallpaper: path });
    } catch (error) {
      console.error("Failed to update wallpaper:", error);
      toast.error("Wallpaper could not be saved. It will reset on refresh.");
    } finally {
      setSavingWallpaper(false);
    }
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
    const result = await requestReboot();
    if (result.ok) {
      toast.success("Restarting system...");
    } else {
      toast.error(result.error ?? "Restart failed");
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

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      const status = await checkForUpdates();
      setUpdateStatus(status);
      toast.success(status.message || "Update check completed");
    } catch {
      toast.error("Failed to check for updates");
    } finally {
      setCheckingUpdate(false);
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
    percentage: number,
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

  return {
    systemStats,
    storageStats,
    hardware,
    systemInfo,
    wallpapers,
    wallpapersLoading,
    firewallEnabled,
    lanDevices,
    lanDevicesLoading,
    lanDevicesError,
    updateStatus,
    checkingUpdate,
    savingWallpaper,
    wifiDialogOpen,
    setWifiDialogOpen,
    firewallDialogOpen,
    setFirewallDialogOpen,
    systemDetailsOpen,
    setSystemDetailsOpen,
    networkDevicesOpen,
    setNetworkDevicesOpen,
    logsDialogOpen,
    setLogsDialogOpen,
    advancedDialogOpen,
    setAdvancedDialogOpen,
    fetchLanDevices,
    fetchFirewallStatus,
    handleWallpaperSelect,
    handleLogout,
    handleRestart,
    handleShutdown,
    handleCheckUpdate,
    formatBytes,
    getMetricColor,
    uptimeLabel,
    setLanDevices,
    setLanDevicesError,
  };
}
