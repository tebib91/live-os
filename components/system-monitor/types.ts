export interface ChartDataPoint {
  value: number;
}

export type SelectedMetric = "cpu" | "memory" | null;

export interface RunningApp {
  id: string;
  name: string;
  icon?: string;
  cpuUsage: number;
  memoryUsage: number;
  netRx?: number;
  netTx?: number;
}

export interface SystemStats {
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
  gpu?: {
    usage: number;
    name: string;
  };
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
