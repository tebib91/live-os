export type HardwareInfo = {
  system?: {
    manufacturer?: string;
    model?: string;
    version?: string;
    serial?: string;
    uuid?: string;
  };
  cpu?: {
    brand?: string;
    speed?: number;
    cores?: number;
    physicalCores?: number;
  };
  cpuTemperature?: number;
  thermals?: {
    main?: number | null;
    max?: number | null;
    cores?: (number | null)[];
    socket?: (number | null)[];
    chipset?: number | null;
  };
  memory?: {
    total?: number;
    used?: number;
    free?: number;
    usage?: number;
  };
  battery?: {
    hasBattery?: boolean;
    percent?: number;
    cycleCount?: number;
    isCharging?: boolean;
    designedCapacity?: number;
    maxCapacity?: number;
    currentCapacity?: number;
    voltage?: number;
    timeRemaining?: number;
    acConnected?: boolean;
    manufacturer?: string | null;
    model?: string | null;
    serial?: string | null;
  };
  graphics?: {
    model?: string;
    vendor?: string;
    vram?: number;
    vramDynamic?: boolean;
    fanSpeed?: number | null;
    memoryTotal?: number | null;
    memoryUsed?: number | null;
    memoryFree?: number | null;
    utilizationGpu?: number | null;
    utilizationMemory?: number | null;
    temperatureGpu?: number | null;
    temperatureMemory?: number | null;
    powerDraw?: number | null;
    powerLimit?: number | null;
  };
  network?: {
    iface?: string;
    type?: string;
    ip4?: string;
    mac?: string;
    speed?: number;
    mtu?: number;
  };
  wifi?: {
    ssid?: string;
    quality?: number;
    frequency?: number;
  };
  bluetooth?: {
    devices?: number;
    firstName?: string;
    powered?: boolean;
    blocked?: boolean;
    adapter?: string | null;
    available?: boolean;
    error?: string | null;
  };
};

export const formatCpuLabel = (cpu?: HardwareInfo["cpu"]) => {
  if (!cpu) return "Unknown";
  const coreCount = cpu.physicalCores || cpu.cores;
  const brand = cpu.brand || "Unknown";
  return coreCount ? `${brand} • ${coreCount} cores` : brand;
};

export const formatCpuSpeed = (cpu?: HardwareInfo["cpu"]) => {
  if (!cpu?.speed || cpu.speed <= 0) return "Unknown";
  return `${cpu.speed} GHz`;
};

export const formatCpuTemp = (temp?: number) => {
  if (typeof temp !== "number") return "Unknown";
  return `${temp}°C`;
};
