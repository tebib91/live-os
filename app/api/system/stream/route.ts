import {
  getNetworkStats,
  getStorageInfo,
  getSystemStatus,
} from "@/app/actions/system-status";
import prisma from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";

type MetricsPayload = {
  type: "metrics";
  systemStatus: unknown;
  storageInfo: unknown;
  networkStats: unknown;
  installedApps: unknown;
  runningApps: unknown;
};

export type InstallProgressPayload = {
  type: "install-progress";
  containerName: string;
  name: string;
  icon: string;
  progress: number; // 0-1
  status: "starting" | "running" | "completed" | "error";
  message?: string;
};

type Client = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  fast: boolean;
};

export const dynamic = "force-dynamic";

const encoder = new TextEncoder();
const clients = new Set<Client>();
const SLOW_POLL_INTERVAL_MS = 2000;
const FAST_POLL_INTERVAL_MS = 1000;

let pollInterval: ReturnType<typeof setInterval> | null = null;
let currentIntervalMs = SLOW_POLL_INTERVAL_MS;
let isPolling = false;

let latestPayload: MetricsPayload | null = null;

function broadcast(data: object) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const payload = encoder.encode(message);

  clients.forEach((client) => {
    try {
      client.controller.enqueue(payload);
    } catch {
      clients.delete(client);
    }
  });

  if (clients.size === 0) {
    stopPoller();
  }
}

export function sendInstallProgress(update: InstallProgressPayload) {
  broadcast(update);
}

async function getInstalledApps() {
  try {
    const [knownApps, storeApps] = await Promise.all([
      prisma.installedApp.findMany(),
      prisma.app.findMany(),
    ]);
    const metaByContainer = new Map(
      knownApps.map((app) => [app.containerName, app]),
    );
    const storeMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    // Get containers with compose labels for grouping
    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Label \\"com.docker.compose.project\\"}}\t{{.Label \\"com.docker.compose.service\\"}}"',
    );

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split("\n");

    // Parse containers
    const containers = lines.map((line) => {
      const [name, status, image, composeProject, composeService] =
        line.split("\t");
      return {
        name: name || "",
        status: status || "",
        image: image || "",
        composeProject: composeProject || "",
        composeService: composeService || "",
      };
    }).filter((c) => c.name);

    // Group by compose project
    const groups = new Map<string, typeof containers>();
    for (const container of containers) {
      const key = container.composeProject || container.name;
      const group = groups.get(key) || [];
      group.push(container);
      groups.set(key, group);
    }

    const results = [];

    for (const [projectKey, groupContainers] of groups) {
      const primaryContainer =
        groupContainers.find((c) => metaByContainer.has(c.name)) ||
        groupContainers[0];

      const containerNames = groupContainers.map((c) => c.name);

      const meta = metaByContainer.get(primaryContainer.name);
      const anyMeta =
        meta ||
        groupContainers
          .map((c) => metaByContainer.get(c.name))
          .find(Boolean);

      const resolvedAppId =
        anyMeta?.appId ||
        getAppIdFromContainerName(primaryContainer.name);

      const storeMeta = storeMetaById.get(resolvedAppId);

      // Aggregate status
      const statuses = groupContainers.map((c) => {
        const s = c.status.toLowerCase();
        if (s.startsWith("up")) return "running";
        if (s.includes("exited")) return "stopped";
        return "error";
      });
      let appStatus: "running" | "stopped" | "error" = "error";
      if (statuses.every((s) => s === "running")) appStatus = "running";
      else if (statuses.every((s) => s === "stopped")) appStatus = "stopped";
      else if (statuses.some((s) => s === "running")) appStatus = "running";

      const hostPort = await resolveHostPort(primaryContainer.name);

      const fallbackName = primaryContainer.name
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const dbContainers = (anyMeta?.installConfig as Record<string, unknown>)
        ?.containers as string[] | undefined;

      results.push({
        id: primaryContainer.name,
        appId: resolvedAppId || primaryContainer.name,
        name:
          anyMeta?.name ||
          storeMeta?.title ||
          storeMeta?.name ||
          fallbackName,
        icon:
          anyMeta?.icon ||
          storeMeta?.icon ||
          "/default-application-icon.png",
        status: appStatus,
        webUIPort: hostPort ? Number(hostPort) : undefined,
        containerName: primaryContainer.name,
        containers:
          containerNames.length > 1
            ? containerNames
            : dbContainers || containerNames,
        installedAt: anyMeta?.createdAt?.getTime?.() || Date.now(),
      });
    }

    return results;
  } catch (error) {
    console.error("[SSE] Failed to collect installed apps:", error);
    return [];
  }
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
    console.error(`[SSE] resolveHostPort: failed for ${containerName}:`, error);
    return null;
  }
}

function getAppIdFromContainerName(name: string): string {
  return CONTAINER_PREFIX
    ? name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "")
    : name;
}

function hasFastClients() {
  for (const client of clients) {
    if (client.fast) return true;
  }
  return false;
}

export async function pollAndBroadcast() {
  if (isPolling || clients.size === 0) return;
  isPolling = true;
  try {
    const [
      systemStatus,
      storageInfo,
      networkStats,
      installedApps,
      runningApps,
    ] = await Promise.all([
      getSystemStatus(),
      getStorageInfo(),
      getNetworkStats(),
      getInstalledApps(),
      getRunningApps(),
    ]);
    latestPayload = {
      type: "metrics",
      systemStatus,
      storageInfo,
      networkStats,
      installedApps,
      runningApps,
    };
    broadcast(latestPayload);
  } catch (error) {
    console.error("[SSE] Metrics fetch error:", error);
    broadcast({ type: "error", message: "Failed to fetch metrics" });
  } finally {
    isPolling = false;
  }
}

/**
 * Collect live Docker container resource usage (CPU%, mem usage/limit)
 */
async function getRunningApps() {
  try {
    const { stdout } = await execAsync(
      'docker stats --no-stream --format "{{ json . }}"',
    );

    if (!stdout.trim()) return [];

    const parseMemoryString = (memStr: string): number => {
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
    };
    const parseNetString = (netStr: string): number => {
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
    };

    return stdout
      .trim()
      .split("\n")
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
                .replace(/\\b\\w/g, (c) => c.toUpperCase()),
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
  } catch (error) {
    console.error("[SSE] Failed to collect running apps:", error);
    return [];
  }
}

function ensurePoller() {
  if (clients.size === 0) {
    stopPoller();
    return;
  }

  const desiredInterval = hasFastClients()
    ? FAST_POLL_INTERVAL_MS
    : SLOW_POLL_INTERVAL_MS;

  if (pollInterval && currentIntervalMs === desiredInterval) return;

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  currentIntervalMs = desiredInterval;
  pollAndBroadcast();
  pollInterval = setInterval(pollAndBroadcast, desiredInterval);
}

function stopPoller() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export async function GET(request: Request) {
  const wantsFast = new URL(request.url).searchParams.get("fast") === "1";
  let clientRef: Client | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      clientRef = { controller, fast: wantsFast };
      clients.add(clientRef);

      if (latestPayload) {
        try {
          const message = `data: ${JSON.stringify(latestPayload)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          if (clientRef) {
            clients.delete(clientRef);
          }
          return;
        }
      } else {
        void pollAndBroadcast();
      }

      ensurePoller();
    },
    cancel() {
      if (clientRef) {
        clients.delete(clientRef);
      }
      ensurePoller();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
