"use client";

import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useMemo } from "react";
import type { StatusData } from "./types";

const DEFAULT_STATUS: StatusData = {
  battery: {
    hasBattery: false,
    percent: null,
    isCharging: null,
    acConnected: null,
  },
  wifi: {
    connected: false,
    ssid: null,
    quality: null,
  },
};

export function useStatusData(): StatusData {
  const { systemStats } = useSystemStatus();

  return useMemo(() => {
    const hardware = systemStats?.hardware;
    if (!hardware) return DEFAULT_STATUS;

    return {
      battery: {
        hasBattery: hardware.battery?.hasBattery ?? false,
        percent: hardware.battery?.percent ?? null,
        isCharging: hardware.battery?.isCharging ?? null,
        acConnected: hardware.battery?.acConnected ?? null,
      },
      wifi: {
        connected: !!hardware.wifi?.ssid,
        ssid: hardware.wifi?.ssid ?? null,
        quality: hardware.wifi?.quality ?? null,
      },
    };
  }, [systemStats?.hardware]);
}
