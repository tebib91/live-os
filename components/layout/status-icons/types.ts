/**
 * Type definitions for status icons
 */

export type BatteryStatus = {
  hasBattery: boolean;
  percent: number | null;
  isCharging: boolean | null;
  acConnected: boolean | null;
};

export type WifiStatus = {
  connected: boolean;
  ssid: string | null;
  quality: number | null;
};

export type StatusData = {
  battery: BatteryStatus;
  wifi: WifiStatus;
};
