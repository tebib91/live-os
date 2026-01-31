import type { HardwareInfo } from "@/components/settings/hardware-utils";

export interface SystemStats {
  cpu: { usage: number; temperature: number; power: number };
  memory: { usage: number; total: number; used: number; free: number };
  hardware?: HardwareInfo;
}

export interface StorageStats {
  total: number;
  used: number;
  usagePercent: number;
  health: string;
}

export interface NetworkStats {
  uploadMbps: number;
  downloadMbps: number;
}

export interface AppUsage {
  id: string;
  name: string;
  icon: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
  netRx?: number;
  netTx?: number;
}

export interface InstalledApp {
  id: string;
  appId: string;
  name: string;
  icon: string;
  status: "running" | "stopped" | "error";
  webUIPort?: number;
  containerName: string;
  containers?: string[];
  installedAt: number;
  source?: string;
}

export interface InstallProgress {
  appId: string;
  name: string;
  icon: string;
  progress: number;
  status: "starting" | "running" | "completed" | "error";
  message?: string;
}

export interface UseSystemStatusReturn {
  systemStats: SystemStats | null;
  storageStats: StorageStats | null;
  networkStats: NetworkStats | null;
  runningApps: AppUsage[];
  installedApps: InstalledApp[];
  installProgress: InstallProgress[];
  connected: boolean;
  error: string | null;
  pushInstallProgress: (update: InstallProgress) => void;
}

export interface MetricsMessage {
  type: "metrics";
  systemStatus?: SystemStats;
  storageInfo?: StorageStats;
  networkStats?: NetworkStats;
  installedApps?: InstalledApp[];
  runningApps?: AppUsage[];
}

export interface ErrorMessage {
  type: "error";
  message?: string;
}

export type SSEMessage =
  | MetricsMessage
  | ErrorMessage
  | (InstallProgress & { type: "install-progress" });

export type SharedState = {
  systemStats: SystemStats | null;
  storageStats: StorageStats | null;
  networkStats: NetworkStats | null;
  runningApps: AppUsage[];
  installedApps: InstalledApp[];
  installProgress: InstallProgress[];
  connected: boolean;
  error: string | null;
};

export type Subscriber = {
  callback: (state: SharedState) => void;
  fast: boolean;
};
