"use client";

import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Plug,
} from "lucide-react";
import { memo, useMemo } from "react";
import type { BatteryStatus } from "./types";

type BatteryIconProps = {
  status: BatteryStatus;
};

type IconType =
  | "charging"
  | "full"
  | "medium"
  | "low"
  | "warning"
  | "default"
  | "ac";

function getIconType(
  hasBattery: boolean,
  percent: number | null,
  isCharging: boolean | null,
  acConnected: boolean | null,
): IconType {
  if (!hasBattery) return "ac";
  if (acConnected && !isCharging && percent !== null && percent >= 80)
    return "ac";
  if (isCharging) return "charging";
  if (percent === null) return "default";
  if (percent >= 80) return "full";
  if (percent >= 50) return "medium";
  if (percent >= 20) return "low";
  return "warning";
}

function getColorClass(
  hasBattery: boolean,
  percent: number | null,
  isCharging: boolean | null,
  acConnected: boolean | null,
) {
  if (!hasBattery) return "text-green-400";
  if (isCharging) return "text-green-400";
  if (acConnected) return "text-green-400";
  if (percent === null) return "text-white/60";
  if (percent >= 50) return "text-white/80";
  if (percent >= 20) return "text-yellow-400";
  return "text-red-400";
}

function getTooltip(status: BatteryStatus): string {
  if (!status.hasBattery) return "AC Power";
  const parts = ["Battery"];
  if (status.percent !== null) parts.push(`${Math.round(status.percent)}%`);
  if (status.isCharging) parts.push("(Charging)");
  else if (status.acConnected) parts.push("(Plugged in)");
  return parts.join(" ");
}

function BatteryIconComponent({ status }: BatteryIconProps) {
  const iconType = useMemo(
    () =>
      getIconType(
        status.hasBattery,
        status.percent,
        status.isCharging,
        status.acConnected,
      ),
    [status.hasBattery, status.percent, status.isCharging, status.acConnected],
  );
  const colorClass = useMemo(
    () =>
      getColorClass(
        status.hasBattery,
        status.percent,
        status.isCharging,
        status.acConnected,
      ),
    [status.hasBattery, status.percent, status.isCharging, status.acConnected],
  );

  const iconClass = `h-4 w-4 ${colorClass}`;

  return (
    <div className="flex items-center gap-1" title={getTooltip(status)}>
      {iconType === "ac" && <Plug className={iconClass} />}
      {iconType === "charging" && <BatteryCharging className={iconClass} />}
      {iconType === "full" && <BatteryFull className={iconClass} />}
      {iconType === "medium" && <BatteryMedium className={iconClass} />}
      {iconType === "low" && <BatteryLow className={iconClass} />}
      {iconType === "warning" && <BatteryWarning className={iconClass} />}
      {iconType === "default" && <Battery className={iconClass} />}
      {status.hasBattery && status.percent !== null && (
        <span className={`text-xs font-medium ${colorClass}`}>
          {Math.round(status.percent)}%
        </span>
      )}
    </div>
  );
}

export const BatteryIcon = memo(BatteryIconComponent);
