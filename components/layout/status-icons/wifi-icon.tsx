"use client";

import { Wifi, WifiHigh, WifiLow, WifiOff, WifiZero } from "lucide-react";
import { memo, useMemo } from "react";
import type { WifiStatus } from "./types";

type WifiIconProps = {
  status: WifiStatus;
};

type IconType = "off" | "high" | "medium" | "low" | "zero";

function getIconType(connected: boolean, quality: number | null): IconType {
  if (!connected) return "off";
  if (quality === null) return "medium";
  if (quality >= 70) return "high";
  if (quality >= 40) return "medium";
  if (quality >= 20) return "low";
  return "zero";
}

function getWifiColor(connected: boolean, quality: number | null) {
  if (!connected) return "text-white/40";
  if (quality === null) return "text-white/60";
  if (quality >= 70) return "text-white/80";
  if (quality >= 40) return "text-yellow-400";
  return "text-red-400";
}

function getTooltip(status: WifiStatus): string {
  if (!status.connected) return "WiFi: Disconnected";
  const parts = ["WiFi"];
  if (status.ssid) parts.push(`"${status.ssid}"`);
  if (status.quality !== null) parts.push(`(${status.quality}%)`);
  return parts.join(" ");
}

function WifiIconComponent({ status }: WifiIconProps) {
  const iconType = useMemo(
    () => getIconType(status.connected, status.quality),
    [status.connected, status.quality]
  );
  const colorClass = useMemo(
    () => getWifiColor(status.connected, status.quality),
    [status.connected, status.quality]
  );

  const iconClass = `h-4 w-4 ${colorClass}`;

  return (
    <div title={getTooltip(status)}>
      {iconType === "off" && <WifiOff className={iconClass} />}
      {iconType === "high" && <WifiHigh className={iconClass} />}
      {iconType === "medium" && <Wifi className={iconClass} />}
      {iconType === "low" && <WifiLow className={iconClass} />}
      {iconType === "zero" && <WifiZero className={iconClass} />}
    </div>
  );
}

export const WifiIcon = memo(WifiIconComponent);
