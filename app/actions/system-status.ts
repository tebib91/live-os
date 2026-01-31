/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import os from "os";
import si from "systeminformation";
import { getBluetoothStatus } from "./bluetooth";

let lastNetworkSample: { rx: number; tx: number; timestamp: number } | null =
  null;

const SLOW_REFRESH_MS = 15_000;
const STORAGE_REFRESH_MS = 30_000;

const safeNumber = (value: any, fallback: number | null = null) =>
  Number.isFinite(value) ? value : fallback;

const firstItem = <T>(arr: T[] | undefined | null): T | undefined =>
  Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;

function buildHardwareSystem(systemMeta: any) {
  return {
    manufacturer: systemMeta?.manufacturer || "Unknown",
    model: systemMeta?.model || "Unknown",
    version: systemMeta?.version || "Unknown",
    serial: systemMeta?.serial || "Unknown",
    uuid: systemMeta?.uuid || "Unknown",
  };
}

function buildHardwareCpu(cpuMeta: any) {
  return {
    brand: cpuMeta?.brand || cpuMeta?.manufacturer || "Unknown",
    speed: cpuMeta?.speed || 0,
    cores: cpuMeta?.cores || 0,
    physicalCores: cpuMeta?.physicalCores || cpuMeta?.cores || 0,
  };
}

const buildThermals = (temperature: any) => ({
  main: safeNumber(temperature?.main),
  max: safeNumber(temperature?.max),
  cores: Array.isArray(temperature?.cores) ? temperature.cores : [],
  socket: Array.isArray(temperature?.socket) ? temperature.socket : [],
  chipset: safeNumber(temperature?.chipset),
});

const buildBattery = (batteryInfo: any) => ({
  hasBattery: batteryInfo?.hasBattery ?? batteryInfo?.hasbattery ?? false,
  percent: safeNumber(batteryInfo?.percent),
  cycleCount: safeNumber(batteryInfo?.cycleCount ?? batteryInfo?.cyclecount),
  isCharging:
    typeof batteryInfo?.isCharging === "boolean"
      ? batteryInfo.isCharging
      : typeof batteryInfo?.ischarging === "boolean"
      ? batteryInfo.ischarging
      : null,
  designedCapacity: safeNumber(
    batteryInfo?.designedCapacity ?? batteryInfo?.designedcapacity
  ),
  maxCapacity: safeNumber(batteryInfo?.maxCapacity ?? batteryInfo?.maxcapacity),
  currentCapacity: safeNumber(
    batteryInfo?.currentCapacity ?? batteryInfo?.currentcapacity
  ),
  voltage: safeNumber(batteryInfo?.voltage),
  timeRemaining: safeNumber(
    batteryInfo?.timeRemaining ?? batteryInfo?.timeremaining
  ),
  acConnected:
    typeof batteryInfo?.acConnected === "boolean"
      ? batteryInfo.acConnected
      : typeof batteryInfo?.acconnected === "boolean"
      ? batteryInfo.acconnected
      : null,
  manufacturer: batteryInfo?.manufacturer || null,
  model: batteryInfo?.model || null,
  serial: batteryInfo?.serial || null,
});

const buildGraphics = (graphicsInfo: any) => {
  const firstGpu = firstItem(graphicsInfo?.controllers) as any;
  if (!firstGpu) return undefined;
  return {
    model: firstGpu.model || firstGpu.name || "Unknown",
    vendor: firstGpu.vendor || "Unknown",
    vram: firstGpu.vram || 0,
    vramDynamic: firstGpu.vramDynamic ?? null,
    fanSpeed: safeNumber(firstGpu.fanSpeed),
    memoryTotal: safeNumber(firstGpu.memoryTotal),
    memoryUsed: safeNumber(firstGpu.memoryUsed),
    memoryFree: safeNumber(firstGpu.memoryFree),
    utilizationGpu: safeNumber(firstGpu.utilizationGpu ?? firstGpu.utilization),
    utilizationMemory: safeNumber(firstGpu.utilizationMemory),
    temperatureGpu: safeNumber(firstGpu.temperatureGpu),
    temperatureMemory: safeNumber(firstGpu.temperatureMemory),
    powerDraw: safeNumber(firstGpu.powerDraw),
    powerLimit: safeNumber(firstGpu.powerLimit),
  };
};

const selectPrimaryInterface = (networkInterfaces: any[]) =>
  networkInterfaces.find((i) => i.default) ?? firstItem(networkInterfaces);

const buildNetwork = (networkInterfaces: any[]) => {
  const primaryInterface = selectPrimaryInterface(networkInterfaces);
  if (!primaryInterface) return undefined;
  return {
    iface: primaryInterface.iface || "Unknown",
    type: primaryInterface.type || "Unknown",
    ip4: primaryInterface.ip4 || "Unknown",
    mac: primaryInterface.mac || "Unknown",
    speed: primaryInterface.speed || 0,
    mtu: primaryInterface.mtu || 0,
  };
};

const buildWifi = (wifiConnections: any[], wifiNetworks: any[]) => {
  const firstConnection = firstItem(wifiConnections);
  if (firstConnection) {
    return {
      ssid: firstConnection.ssid || "Unknown",
      quality:
        safeNumber(firstConnection.quality) ??
        safeNumber(firstConnection.signalLevel) ??
        0,
      frequency: safeNumber(firstConnection.frequency) ?? 0,
    };
  }

  const firstWifi = firstItem(wifiNetworks);
  if (!firstWifi) return undefined;
  return {
    ssid: firstWifi.ssid || "Unknown",
    quality: safeNumber(firstWifi.quality) ?? 0,
    frequency: safeNumber(firstWifi.frequency) ?? 0,
  };
};

type BluetoothState = Awaited<ReturnType<typeof getBluetoothStatus>>;

const buildBluetooth = (
  bluetoothDevices: any[],
  state?: BluetoothState | null,
) => ({
  devices: Array.isArray(bluetoothDevices) ? bluetoothDevices.length : 0,
  firstName: firstItem(bluetoothDevices)?.name,
  powered:
    typeof state?.powered === "boolean" ? state.powered : undefined,
  blocked:
    typeof state?.blocked === "boolean" ? state.blocked : undefined,
  adapter: state?.adapter ?? null,
  available: state?.available,
  error: state?.error ?? undefined,
});

const estimatePowerWatts = (cpuUsage: number) =>
  parseFloat(((cpuUsage / 100) * 15).toFixed(1));

type StorageInfo = {
  total: number;
  used: number;
  usagePercent: number;
  health: string;
};

type Cached<T> = { value: T; timestamp: number };

type HardwareBase = {
  system: ReturnType<typeof buildHardwareSystem>;
  cpu: ReturnType<typeof buildHardwareCpu>;
  battery: ReturnType<typeof buildBattery>;
  network: ReturnType<typeof buildNetwork>;
};

const isFresh = (cache: Cached<unknown> | null, maxAge: number) =>
  !!(cache && Date.now() - cache.timestamp < maxAge);

let hardwareCache: Cached<HardwareBase> | null = null;
let wifiCache: Cached<ReturnType<typeof buildWifi>> | null = null;
let bluetoothCache: Cached<ReturnType<typeof buildBluetooth>> | null = null;
let storageCache: Cached<StorageInfo> | null = null;

export async function getSystemStatus() {
  try {
    const now = Date.now();
    const [load, mem, temperature] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.cpuTemperature(),
    ]);

    let hardwareBase = hardwareCache?.value;
    if (!isFresh(hardwareCache, SLOW_REFRESH_MS)) {
      const [systemMeta, cpuMeta, batteryInfo, networkInterfaces] =
        await Promise.all([
          si.system(),
          si.cpu(),
          si.battery(),
          si.networkInterfaces(),
        ]);

      hardwareBase = {
        system: buildHardwareSystem(systemMeta),
        cpu: buildHardwareCpu(cpuMeta),
        battery: buildBattery(batteryInfo),
        network: buildNetwork(networkInterfaces),
      };

      hardwareCache = { value: hardwareBase, timestamp: now };
    }

    let graphicsInfo: Awaited<ReturnType<typeof si.graphics>> = {
      controllers: [],
      displays: [],
    };
    try {
      graphicsInfo = await si.graphics();
    } catch {
      graphicsInfo = { controllers: [], displays: [] };
    }

    let wifiInfo = wifiCache?.value;
    if (!isFresh(wifiCache, SLOW_REFRESH_MS)) {
      let wifiConnections: Awaited<ReturnType<typeof si.wifiConnections>> = [];
      if (typeof si.wifiConnections === "function") {
        try {
          wifiConnections = await si.wifiConnections();
        } catch {
          wifiConnections = [];
        }
      }
      let wifiNetworks: Awaited<ReturnType<typeof si.wifiNetworks>> = [];
      if (wifiConnections.length === 0) {
        try {
          wifiNetworks = await si.wifiNetworks();
        } catch {
          wifiNetworks = [];
        }
      }
      wifiInfo = buildWifi(wifiConnections, wifiNetworks);
      wifiCache = { value: wifiInfo, timestamp: now };
    }

    let bluetoothInfo = bluetoothCache?.value;
    if (!isFresh(bluetoothCache, SLOW_REFRESH_MS)) {
      let bluetoothDevices: Awaited<ReturnType<typeof si.bluetoothDevices>> =
        [];
      if (typeof si.bluetoothDevices === "function") {
        try {
          bluetoothDevices = await si.bluetoothDevices();
        } catch {
          bluetoothDevices = [];
        }
      }
      let bluetoothState: BluetoothState | null = null;
      try {
        bluetoothState = await getBluetoothStatus();
      } catch {
        bluetoothState = null;
      }

      bluetoothInfo = buildBluetooth(bluetoothDevices, bluetoothState);
      bluetoothCache = { value: bluetoothInfo, timestamp: now };
    }

    const cpuUsage = Math.round(load.currentLoad);
    const memoryUsage = Math.round((mem.active / mem.total) * 100);
    const usedMemory = mem.total - mem.available;
    const tempValue = Number.isFinite(temperature.main)
      ? Math.round(temperature.main)
      : 0;
    const powerWatts = estimatePowerWatts(cpuUsage);

    const hardware = hardwareBase
      ? {
          ...hardwareBase,
          cpuTemperature: tempValue,
          thermals: buildThermals(temperature),
          memory: {
            total: mem.total,
            used: usedMemory,
            free: mem.available,
            usage: memoryUsage,
          },
          battery: hardwareBase.battery,
          graphics: buildGraphics(graphicsInfo),
          network: hardwareBase.network,
          wifi: wifiInfo,
          bluetooth: bluetoothInfo,
        }
      : undefined;

    return {
      cpu: {
        usage: cpuUsage,
        temperature: tempValue,
        power: powerWatts,
      },
      memory: {
        usage: memoryUsage,
        total: mem.total,
        used: usedMemory,
        free: mem.available,
      },
      hardware,
    };
  } catch (error) {
    console.error(
      "[SystemStatus] Failed to gather stats with systeminformation:",
      error
    );

    // Minimal fallback using built-in os module
    try {
      const cpus = os.cpus();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      const totalTick = cpus.reduce(
        (sum, cpu) => sum + Object.values(cpu.times).reduce((t, v) => t + v, 0),
        0
      );
      const totalIdle = cpus.reduce((sum, cpu) => sum + cpu.times.idle, 0);
      const fallbackCpuUsage =
        totalTick > 0
          ? Math.max(
              0,
              Math.min(100, Math.round(100 - (100 * totalIdle) / totalTick))
            )
          : 0;
      const cpuModel = cpus[0]?.model ?? "Unknown";
      const cpuSpeedGHz = cpus[0]?.speed
        ? parseFloat((cpus[0].speed / 1000).toFixed(2))
        : 0;

      return {
        cpu: { usage: fallbackCpuUsage, temperature: 0, power: 0 },
        memory: {
          usage: Math.round((usedMemory / totalMemory) * 100),
          total: totalMemory,
          used: usedMemory,
          free: freeMemory,
        },
        hardware: {
          system: {
            manufacturer: "Unknown",
            model: os.hostname(),
            version: "Unknown",
            serial: "Unknown",
            uuid: "Unknown",
          },
          cpu: {
            brand: cpuModel,
            speed: cpuSpeedGHz,
            cores: cpus.length,
            physicalCores: cpus.length,
          },
          cpuTemperature: 0,
          thermals: {
            main: 0,
            max: 0,
            cores: [],
            socket: [],
            chipset: null,
          },
          memory: {
            total: totalMemory,
            used: usedMemory,
            free: freeMemory,
            usage: Math.round((usedMemory / totalMemory) * 100),
          },
          battery: {
            hasBattery: false,
            percent: null,
            cycleCount: null,
            isCharging: null,
            designedCapacity: null,
            maxCapacity: null,
            currentCapacity: null,
            voltage: null,
            timeRemaining: null,
            acConnected: null,
            manufacturer: null,
            model: null,
            serial: null,
          },
          graphics: undefined,
          network: undefined,
          wifi: undefined,
          bluetooth: {
            devices: 0,
            firstName: undefined,
          },
        },
      };
    } catch {
      return {
        cpu: { usage: 0, temperature: 0, power: 0 },
        memory: { usage: 0, total: 0, used: 0, free: 0 },
        hardware: {
          system: {
            manufacturer: "Unknown",
            model: "Unknown",
            version: "Unknown",
            serial: "Unknown",
            uuid: "Unknown",
          },
          cpu: {
            brand: "Unknown",
            speed: 0,
            cores: 0,
            physicalCores: 0,
          },
          cpuTemperature: 0,
          thermals: {
            main: null,
            max: null,
            cores: [],
            socket: [],
            chipset: null,
          },
          memory: {
            total: 0,
            used: 0,
            free: 0,
            usage: 0,
          },
          battery: {
            hasBattery: false,
            percent: null,
            cycleCount: null,
            isCharging: null,
            designedCapacity: null,
            maxCapacity: null,
            currentCapacity: null,
            voltage: null,
            timeRemaining: null,
            acConnected: null,
            manufacturer: null,
            model: null,
            serial: null,
          },
          graphics: undefined,
          network: undefined,
          wifi: undefined,
          bluetooth: {
            devices: 0,
            firstName: undefined,
          },
        },
      };
    }
  }
}

export async function getStorageInfo(): Promise<StorageInfo> {
  if (isFresh(storageCache, STORAGE_REFRESH_MS)) {
    return storageCache!.value;
  }

  try {
    const disks = await si.fsSize();
    const primary = disks.find((d) => d.mount === "/") ?? disks[0];

    if (!primary) {
      throw new Error("No disks found");
    }

    const totalGB = primary.size / 1024 / 1024 / 1024;
    const usedGB = primary.used / 1024 / 1024 / 1024;
    const usagePercent = Math.round((primary.used / primary.size) * 100);

    const result: StorageInfo = {
      total: parseFloat(totalGB.toFixed(2)),
      used: parseFloat(usedGB.toFixed(1)),
      usagePercent,
      health:
        usagePercent < 80
          ? "Healthy"
          : usagePercent < 90
          ? "Warning"
          : "Critical",
    };

    storageCache = { value: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error("[SystemStatus] Failed to gather storage info:", error);
    if (storageCache) {
      return storageCache.value;
    }
    return {
      total: 0,
      used: 0,
      usagePercent: 0,
      health: "Unknown",
    };
  }
}

export async function getNetworkStats() {
  try {
    const now = Date.now();
    const stats = await si.networkStats();
    const filtered = stats.filter((s) => s.iface !== "lo");

    const rx = filtered.reduce((sum, s) => sum + (s.rx_bytes || 0), 0);
    const tx = filtered.reduce((sum, s) => sum + (s.tx_bytes || 0), 0);

    if (!lastNetworkSample) {
      lastNetworkSample = { rx, tx, timestamp: now };
      return { uploadMbps: 0, downloadMbps: 0 };
    }

    const deltaSeconds = (now - lastNetworkSample.timestamp) / 1000;
    const deltaRx = rx - lastNetworkSample.rx;
    const deltaTx = tx - lastNetworkSample.tx;
    lastNetworkSample = { rx, tx, timestamp: now };

    if (deltaSeconds <= 0) {
      return { uploadMbps: 0, downloadMbps: 0 };
    }

    const uploadMbps = Math.max(0, (deltaTx * 8) / 1_000_000 / deltaSeconds);
    const downloadMbps = Math.max(0, (deltaRx * 8) / 1_000_000 / deltaSeconds);

    return {
      uploadMbps: parseFloat(uploadMbps.toFixed(2)),
      downloadMbps: parseFloat(downloadMbps.toFixed(2)),
    };
  } catch (error) {
    console.error("[SystemStatus] Failed to gather network stats:", error);
    return { uploadMbps: 0, downloadMbps: 0 };
  }
}
