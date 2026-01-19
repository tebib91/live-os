import { Button } from "@/components/ui/button";
import { VERSION } from "@/lib/config";
import {
  Globe,
  Key,
  LogOut,
  Power,
  RotateCw,
  Shield,
  User,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import { HardwareInfo, formatCpuLabel, formatCpuTemp } from "./hardware-utils";
import type { SystemInfo } from "./types";

export type WallpaperOption = {
  id: string;
  name: string;
  path: string;
};

type DeviceInfoSectionProps = {
  systemInfo?: SystemInfo;
  uptimeLabel?: string;
  onLogout?: () => void;
  onRestart?: () => void;
  onShutdown?: () => void;
};

export function DeviceInfoSection({
  systemInfo,
  uptimeLabel,
  onLogout,
  onRestart,
  onShutdown,
}: DeviceInfoSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white -tracking-[0.01em]">
            {systemInfo?.username || "User"}&apos;s{" "}
            <span className="text-white/60">LiveOS</span>
          </h3>
        </div>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
            onClick={onRestart}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-[#E22C2C]/20 text-[#F53737] hover:text-[#F53737] text-xs shadow-sm"
            onClick={onShutdown}
          >
            <Power className="h-4 w-4 mr-2" />
            Shut down
          </Button>
        </div>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex">
          <span className="w-32 text-white/60">Device</span>
          <span className="text-white">
            {systemInfo?.hostname || "LiveOS Server"}
          </span>
        </div>
        <div className="flex">
          <span className="w-32 text-white/60">LiveOS</span>
          <span className="text-white">{VERSION}</span>
        </div>
        <div className="flex">
          <span className="w-32 text-white/60">Local IP</span>
          <span className="text-white">192.168.1.12</span>
        </div>
        <div className="flex">
          <span className="w-32 text-white/60">Uptime</span>
          <span className="text-white">{uptimeLabel || "..."}</span>
        </div>
      </div>
    </div>
  );
}

export function AccountSection() {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            Account
          </h4>
          <p className="text-xs text-white/60">Your name and password</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          >
            <User className="h-4 w-4 mr-2" />
            Change name
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          >
            <Key className="h-4 w-4 mr-2" />
            Change password
          </Button>
        </div>
      </div>
    </div>
  );
}

type WallpaperSectionProps = {
  wallpapers: WallpaperOption[];
  wallpapersLoading: boolean;
  currentWallpaper?: string;
  onSelect: (path: string) => void;
};

export function WallpaperSection({
  wallpapers,
  wallpapersLoading,
  currentWallpaper,
  onSelect,
}: WallpaperSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-1">Wallpaper</h4>
        <p className="text-sm text-white/60">Your LiveOS wallpaper and theme</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide ">
        {wallpapersLoading && (
          <div className="text-xs text-white/60 py-2">
            Loading wallpapers...
          </div>
        )}
        {!wallpapersLoading && wallpapers.length === 0 && (
          <div className="text-xs text-white/60 py-2">
            No wallpapers found in `public/wallpapers`.
          </div>
        )}
        {wallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            onClick={() => onSelect(wallpaper.path)}
            className={`
              relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden border transition-all shadow-sm
              ${
                currentWallpaper === wallpaper.path
                  ? "border-white/80 ring-2 ring-white/40"
                  : "border-white/15 hover:border-white/30"
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
  );
}

type WifiSectionProps = {
  onOpenDialog: () => void;
  ssid?: string;
  quality?: number;
};

export function WifiSection({ onOpenDialog, ssid, quality }: WifiSectionProps) {
  const wifiLabel = ssid || "Not connected";
  const qualityLabel =
    typeof quality === "number" && quality > 0 ? `${quality}%` : null;

  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            Wi-Fi
          </h4>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Wifi className="h-3.5 w-3.5" />
            <span className="text-white">{wifiLabel}</span>
            {qualityLabel && (
              <span className="text-white/60">• {qualityLabel}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
          onClick={onOpenDialog}
        >
          <Wifi className="h-4 w-4 mr-2" />
          View networks
        </Button>
      </div>
    </div>
  );
}

export function LanguageSection() {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            Language
          </h4>
          <p className="text-xs text-white/60">Your preferred language</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
        >
          <Globe className="h-4 w-4 mr-2" />
          English
        </Button>
      </div>
    </div>
  );
}

type FirewallSectionProps = {
  onOpenDialog: () => void;
  enabled?: boolean;
};

export function FirewallSection({
  onOpenDialog,
  enabled,
}: FirewallSectionProps) {
  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            Firewall
          </h4>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-white">
              {enabled === undefined
                ? "Unknown"
                : enabled
                  ? "Enabled"
                  : "Disabled"}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
          onClick={onOpenDialog}
        >
          <Shield className="h-4 w-4 mr-2" />
          Manage rules
        </Button>
      </div>
    </div>
  );
}

type SystemDetailsCardProps = {
  hardware?: HardwareInfo;
  onOpenTabs: () => void;
};

export function SystemDetailsCard({
  hardware,
  onOpenTabs,
}: SystemDetailsCardProps) {
  const manufacturer = hardware?.system?.manufacturer || "Unknown";
  const cpuLabel = formatCpuLabel(hardware?.cpu);
  const cpuTempLabel = formatCpuTemp(hardware?.cpuTemperature);

  return (
    <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-6 border border-white/15 shadow-lg shadow-black/25">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-white -tracking-[0.01em] mb-1">
            System Details
          </h4>
          <p className="text-xs text-white/60">Live hardware snapshot</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs shadow-sm"
          onClick={onOpenTabs}
        >
          View tabs
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div className="flex flex-col">
          <span className="text-white/60 text-xs">Manufacturer</span>
          <span className="text-white">{manufacturer}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white/60 text-xs">CPU</span>
          <span className="text-white">{cpuLabel}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-white/60 text-xs">CPU Temp</span>
          <span className="text-white">{cpuTempLabel}</span>
        </div>
      </div>
    </div>
  );
}
