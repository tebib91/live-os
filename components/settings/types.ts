import { HardwareInfo } from "./hardware-utils";

export type SystemInfo = {
  username: string;
  hostname: string;
  platform: string;
  ip: string;
  arch: string;
};

export type StorageInfo = {
  total: number;
  used: number;
  usagePercent: number;
  health: string;
};

export type SystemStatus = {
  cpu: {
    usage: number;
    temperature: number;
    power: number;
  };
  memory: {
    usage: number;
    total: number;
    used: number;
    free: number;
  };
  hardware?: HardwareInfo;
};
