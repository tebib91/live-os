/* eslint-disable @typescript-eslint/no-explicit-any */
import prisma from "@/lib/prisma";
import { exec } from "child_process";
import type { Server } from "http";
import os from "os";
import type { Systeminformation } from "systeminformation";
import si from "systeminformation";
import { promisify } from "util";
import { WebSocket, WebSocketServer } from "ws";

const execAsync = promisify(exec);
const DEFAULT_APP_ICON = "/icons/default-app-icon.png";
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";

// Types for the data we broadcast
export interface SystemStats {
  cpu: { usage: number; temperature: number; power: number };
  memory: { usage: number; total: number; used: number; free: number };
  gpu?: { usage: number; name: string };
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
  memoryUsage: number; // in bytes
  memoryLimit: number; // in bytes
  memoryPercent: number;
}

export interface InstalledApp {
  id: string;
  appId: string;
  name: string;
  icon: string;
  status: "running" | "stopped" | "error";
  webUIPort?: number;
  containerName: string;
  installedAt: number;
  source?: string;
}

export interface SystemUpdateMessage {
  type: "system-update";
  data: {
    cpu: SystemStats["cpu"];
    memory: SystemStats["memory"];
    gpu?: SystemStats["gpu"];
    storage: StorageStats;
    network: NetworkStats;
    runningApps: AppUsage[];
  };
  timestamp: number;
}

export interface AppsUpdateMessage {
  type: "apps-update";
  data: {
    installedApps: InstalledApp[];
  };
  timestamp: number;
}

type ExtendedGraphicsControllerData =
  Systeminformation.GraphicsControllerData & {
    utilization?: number;
  };

function getAppIdFromContainerName(name: string): string {
  if (!CONTAINER_PREFIX) return name;
  return name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "");
}

async function resolveHostPort(containerName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{json .NetworkSettings.Ports}}' ${containerName}`,
    );
    const ports = JSON.parse(stdout || "{}") as Record<
      string,
      { HostIp: string; HostPort: string }[] | null
    >;
    const firstMapping = Object.values(ports).find(
      (mappings) => Array.isArray(mappings) && mappings.length > 0,
    );
    return firstMapping?.[0]?.HostPort ?? null;
  } catch (error) {
    console.error("[SystemStatus WS] Failed to resolve host port:", error);
    return null;
  }
}

// Track network stats for delta calculation
let lastNetworkSample: { rx: number; tx: number; timestamp: number } | null =
  null;

// WebSocket server instance
let wss: WebSocketServer | null = null;

// Intervals for data collection
let systemInterval: NodeJS.Timeout | null = null;
let appsInterval: NodeJS.Timeout | null = null;

/**
 * Broadcast a message to all connected WebSocket clients
 */
function broadcast(message: SystemUpdateMessage | AppsUpdateMessage): void {
  if (!wss) return;

  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Collect system metrics (CPU, memory, storage, network)
 */
async function collectSystemMetrics(): Promise<SystemUpdateMessage["data"]> {
  try {
    const [load, mem, temperature, disks, networkStatsData, graphicsInfo] =
      await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.fsSize(),
        si.networkStats(),
        si.graphics(),
      ]);

    // CPU stats
    const cpuUsage = Math.round(load.currentLoad);
    const tempValue = Number.isFinite(temperature.main)
      ? Math.round(temperature.main)
      : 38;
    const powerWatts = parseFloat(((cpuUsage / 100) * 15).toFixed(1));

    // Memory stats
    const memoryUsage = Math.round((mem.active / mem.total) * 100);
    const usedMemory = mem.total - mem.available;

    // Storage stats
    const primary = disks.find((d) => d.mount === "/") ?? disks[0];
    let storage: StorageStats = {
      total: 0,
      used: 0,
      usagePercent: 0,
      health: "Unknown",
    };

    if (primary) {
      const totalGB = primary.size / 1024 / 1024 / 1024;
      const usedGB = primary.used / 1024 / 1024 / 1024;
      const usagePercent = Math.round((primary.used / primary.size) * 100);
      storage = {
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
    }

    // Network stats (delta-based calculation)
    const now = Date.now();
    const filtered = networkStatsData.filter((s) => s.iface !== "lo");
    const rx = filtered.reduce((sum, s) => sum + (s.rx_bytes || 0), 0);
    const tx = filtered.reduce((sum, s) => sum + (s.tx_bytes || 0), 0);

    let network: NetworkStats = { uploadMbps: 0, downloadMbps: 0 };

    if (lastNetworkSample) {
      const deltaSeconds = (now - lastNetworkSample.timestamp) / 1000;
      if (deltaSeconds > 0) {
        const deltaRx = rx - lastNetworkSample.rx;
        const deltaTx = tx - lastNetworkSample.tx;
        network = {
          uploadMbps: Math.max(
            0,
            parseFloat(((deltaTx * 8) / 1_000_000 / deltaSeconds).toFixed(2)),
          ),
          downloadMbps: Math.max(
            0,
            parseFloat(((deltaRx * 8) / 1_000_000 / deltaSeconds).toFixed(2)),
          ),
        };
      }
    }
    lastNetworkSample = { rx, tx, timestamp: now };

    // Running apps CPU usage
    const runningApps = await collectRunningAppUsage();
    const firstGpu: ExtendedGraphicsControllerData | undefined =
      graphicsInfo.controllers?.[0];
    const gpuUsageRaw = firstGpu?.utilizationGpu ?? firstGpu?.utilization ?? 0;
    const gpuUsage = Math.round(gpuUsageRaw);

    return {
      cpu: { usage: cpuUsage, temperature: tempValue, power: powerWatts },
      memory: {
        usage: memoryUsage,
        total: mem.total,
        used: usedMemory,
        free: mem.available,
      },
      gpu: firstGpu
        ? {
            usage: gpuUsage,
            name: firstGpu.model || firstGpu.name || "GPU",
          }
        : undefined,
      storage,
      network,
      runningApps,
    };
  } catch (error) {
    console.error("[SystemStatus WS] Error collecting metrics:", error);

    // Fallback using Node.js os module
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      cpu: { usage: 0, temperature: 0, power: 0 },
      memory: {
        usage: Math.round((usedMemory / totalMemory) * 100),
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
      },
      gpu: undefined,
      storage: { total: 0, used: 0, usagePercent: 0, health: "Unknown" },
      network: { uploadMbps: 0, downloadMbps: 0 },
      runningApps: [],
    };
  }
}

/**
 * Parse memory string from docker stats (e.g., "1.5GiB", "256MiB", "100KiB")
 */
function parseMemoryString(memStr: string): number {
  const cleaned = memStr.replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || "0");
  if (!Number.isFinite(value)) return 0;

  const unit = (match[2] || "b").toLowerCase();

  if (unit.startsWith("t")) return value * 1024 ** 4;
  if (unit.startsWith("g")) return value * 1024 ** 3;
  if (unit.startsWith("m")) return value * 1024 ** 2;
  if (unit.startsWith("k")) return value * 1024;
  return value;
}

function parseNetString(netStr: string): number {
  const cleaned = netStr.replace(/,/g, "").trim();
  const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (!match) return 0;

  const value = parseFloat(match[1] || "0");
  if (!Number.isFinite(value)) return 0;

  const unit = (match[2] || "b").toLowerCase();

  if (unit.startsWith("t")) return value * 1024 ** 4;
  if (unit.startsWith("g")) return value * 1024 ** 3;
  if (unit.startsWith("m")) return value * 1024 ** 2;
  if (unit.startsWith("k")) return value * 1024;
  return value;
}

/**
 * Collect running Docker containers and their CPU/memory usage
 */
async function collectRunningAppUsage(): Promise<AppUsage[]> {
  try {
    const { stdout } = await execAsync(
      'docker stats --no-stream --format "{{ json . }}"',
    );

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split("\n");
    return lines
      .flatMap((line) => {
        try {
          const parsed = JSON.parse(line) as {
            Name?: string;
            CPUPerc?: string;
            MemUsage?: string;
            MemPerc?: string;
            NetIO?: string;
          };
          const name = parsed.Name ?? "";
          if (!name) return [];

          const cpuUsage = parseFloat(parsed.CPUPerc?.replace("%", "") || "0");
          const memPercent = parseFloat(
            parsed.MemPerc?.replace("%", "") || "0",
          );
          const memParts = parsed.MemUsage?.split(" / ") || [];
          const netParts = parsed.NetIO?.split(" / ") || [];
          const memoryUsage = parseMemoryString(memParts[0]?.trim() || "0");
          const memoryLimit = parseMemoryString(memParts[1]?.trim() || "0");
          const netRx = parseNetString(netParts[0]?.trim() || "0");
          const netTx = parseNetString(netParts[1]?.trim() || "0");

          return [
            {
              id: name,
              name: name
                .replace(/-/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              icon: DEFAULT_APP_ICON,
              cpuUsage: Number.isFinite(cpuUsage) ? cpuUsage : 0,
              memoryUsage: Number.isFinite(memoryUsage) ? memoryUsage : 0,
              memoryLimit: Number.isFinite(memoryLimit) ? memoryLimit : 0,
              memoryPercent: Number.isFinite(memPercent) ? memPercent : 0,
              netRx: Number.isFinite(netRx) ? netRx : 0,
              netTx: Number.isFinite(netTx) ? netTx : 0,
            },
          ];
        } catch {
          return [];
        }
      })
      .sort((a, b) => b.cpuUsage - a.cpuUsage);
  } catch {
    return [];
  }
}

/**
 * Collect installed Docker containers
 */
async function collectInstalledApps(): Promise<InstalledApp[]> {
  try {
    const [knownApps, storeApps] = await Promise.all([
      prisma.installedApp.findMany(),
      prisma.app.findMany(),
    ]);
    const metaByContainer = new Map(
      knownApps.map((app) => [app.containerName, app]),
    );
    const storeMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Labels}}"',
    );

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split("\n");
    const apps = await Promise.all(
      lines.map(async (line) => {
        const [containerName, status, , labelsRaw] = line.split("\t");

        const labels: Record<string, string> = {};
        if (labelsRaw) {
          labelsRaw.split(",").forEach((pair) => {
            const [key, value] = pair.split("=");
            if (key) labels[key.trim()] = (value || "").trim();
          });
        }

        if (labels["liveos.helper"] === "true") {
          return null;
        }

        let appStatus: "running" | "stopped" | "error" = "error";
        if (status.toLowerCase().startsWith("up")) {
          appStatus = "running";
        } else if (status.toLowerCase().includes("exited")) {
          appStatus = "stopped";
        }

        const meta = metaByContainer.get(containerName);
        const appId =
          labels["liveos.appId"] ||
          meta?.appId ||
          getAppIdFromContainerName(containerName);
        const storeMeta = appId ? storeMetaById.get(appId) : undefined;
        const hostPort = await resolveHostPort(containerName);

        return {
          id: containerName,
          appId,
          name:
            meta?.name ||
            storeMeta?.title ||
            storeMeta?.name ||
            containerName
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: meta?.icon || storeMeta?.icon || DEFAULT_APP_ICON,
          status: appStatus,
          containerName,
          installedAt: meta?.createdAt?.getTime?.() || Date.now(),
          webUIPort: hostPort ? parseInt(hostPort, 10) : undefined,
          source: (meta as any)?.source || undefined,
        };
      }),
    );
    return apps.filter(Boolean) as InstalledApp[];
  } catch {
    return [];
  }
}

/**
 * Start collecting and broadcasting system metrics
 */
function startBroadcasting(): void {
  // System metrics every 2 seconds
  const broadcastSystemMetrics = async () => {
    const data = await collectSystemMetrics();
    broadcast({
      type: "system-update",
      data,
      timestamp: Date.now(),
    });
  };

  // Installed apps every 10 seconds
  const broadcastInstalledApps = async () => {
    const installedApps = await collectInstalledApps();
    broadcast({
      type: "apps-update",
      data: { installedApps },
      timestamp: Date.now(),
    });
  };

  // Initial broadcast
  broadcastSystemMetrics();
  broadcastInstalledApps();

  // Set up intervals
  systemInterval = setInterval(broadcastSystemMetrics, 2000);
  appsInterval = setInterval(broadcastInstalledApps, 10000);
}

/**
 * Stop broadcasting (cleanup)
 */
function stopBroadcasting(): void {
  if (systemInterval) {
    clearInterval(systemInterval);
    systemInterval = null;
  }
  if (appsInterval) {
    clearInterval(appsInterval);
    appsInterval = null;
  }
}

/**
 * Initialize the system status WebSocket server
 */
export function initializeSystemStatusWebSocket(server: Server): void {
  wss = new WebSocketServer({ noServer: true });

  // Handle WebSocket connections
  wss.on("connection", (ws) => {
    console.log("[SystemStatus WS] Client connected");

    // Send initial data immediately to new client
    collectSystemMetrics().then((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "system-update",
            data,
            timestamp: Date.now(),
          }),
        );
      }
    });

    collectInstalledApps().then((installedApps) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "apps-update",
            data: { installedApps },
            timestamp: Date.now(),
          }),
        );
      }
    });

    ws.on("close", () => {
      console.log("[SystemStatus WS] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("[SystemStatus WS] Client error:", error);
    });
  });

  // Handle HTTP upgrade requests
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(
      request.url || "",
      `http://${request.headers.host}`,
    ).pathname;

    if (pathname === "/api/system-status") {
      wss!.handleUpgrade(request, socket, head, (ws) => {
        wss!.emit("connection", ws, request);
      });
    }
    // Note: Don't destroy socket here - let terminal WebSocket handler check too
  });

  // Start broadcasting when first client connects
  wss.on("connection", () => {
    if (wss && wss.clients.size === 1) {
      startBroadcasting();
    }
  });

  // Stop broadcasting when no clients connected
  wss.on("close", () => {
    if (wss && wss.clients.size === 0) {
      stopBroadcasting();
    }
  });

  console.log("✓ System status WebSocket server initialized");
}

/**
 * Trigger an immediate apps update (for use after install/uninstall)
 */
export async function triggerAppsUpdate(): Promise<void> {
  const installedApps = await collectInstalledApps();
  broadcast({
    type: "apps-update",
    data: { installedApps },
    timestamp: Date.now(),
  });
}
