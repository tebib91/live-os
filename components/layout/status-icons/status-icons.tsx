"use client";

import type { ReactNode } from "react";
import { BatteryIcon } from "./battery-icon";
import { DateDisplay } from "./date-display";
import { useStatusData } from "./use-status-data";
import { WifiIcon } from "./wifi-icon";

type StatusBarProps = {
  children?: ReactNode;
  onWifiClick?: () => void;
};

export function StatusBar({ children, onWifiClick }: StatusBarProps) {
  const status = useStatusData();

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-black/30 backdrop-blur-xl border border-white/10">
      <button
        type="button"
        onClick={onWifiClick}
        className="rounded-full p-1 hover:bg-white/10 transition-colors"
        title="Wi-Fi settings"
      >
        <WifiIcon status={status.wifi} />
      </button>
      <BatteryIcon status={status.battery} />
      {children}
      <DateDisplay />
    </div>
  );
}

/** @deprecated Use StatusBar instead */
export const StatusIcons = StatusBar;
