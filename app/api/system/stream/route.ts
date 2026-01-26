import { getNetworkStats, getStorageInfo, getSystemStatus } from '@/app/actions/system-status';
import prisma from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || '';

type MetricsPayload = {
  type: 'metrics';
  systemStatus: unknown;
  storageInfo: unknown;
  networkStats: unknown;
  installedApps: unknown;
  runningApps: unknown;
};

export type InstallProgressPayload = {
  type: 'install-progress';
  appId: string;
  name: string;
  icon: string;
  progress: number; // 0-1
  status: 'starting' | 'running' | 'completed' | 'error';
  message?: string;
};

type Client = {
  controller: ReadableStreamDefaultController<Uint8Array>;
  fast: boolean;
};

export const dynamic = 'force-dynamic';

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
      knownApps.map((app) => [app.containerName, app])
    );
    const metaByAppId = new Map(knownApps.map((app) => [app.appId, app]));
    const storeMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}\\t{{.Status}}\\t{{.Image}}"'
    );

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split('\n');
    const normalize = (value: string | undefined) =>
      (value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

    const fuzzyFindAppId = (containerName: string) => {
      const normalized = normalize(containerName);
      if (!normalized) return null;
      const candidates = Array.from(
        new Set([
          ...metaByAppId.keys(),
          ...storeMetaById.keys(),
        ])
      );
      for (const candidate of candidates) {
        if (normalized.includes(normalize(candidate))) {
          return candidate;
        }
      }
      return null;
    };

    return await Promise.all(
      lines.map(async (line) => {
        const [containerName, status, image] = line.split('\t');

        let appStatus: 'running' | 'stopped' | 'error' = 'error';
        if (status.toLowerCase().startsWith('up')) {
          appStatus = 'running';
        } else if (status.toLowerCase().includes('exited')) {
          appStatus = 'stopped';
        }

        const meta = metaByContainer.get(containerName);

        const appId =
          meta?.appId ||
          getAppIdFromContainerName(containerName) ||
          (image ? image.split('/').pop()?.split(':')[0] : null) ||
          fuzzyFindAppId(containerName) ||
          null;

        // If fuzzy matched, prefer DB meta over store meta
        const dbMeta =
          meta ||
          (appId ? metaByAppId.get(appId) : undefined);
        const storeMeta = appId ? storeMetaById.get(appId) : undefined;
        const hostPort = await resolveHostPort(containerName);

        const fallbackName = containerName
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        return {
          id: containerName,
          appId: appId || containerName,
          name:
            dbMeta?.name ||
            storeMeta?.title ||
            storeMeta?.name ||
            fallbackName,
          icon: dbMeta?.icon || storeMeta?.icon || '/default-application-icon.png',
          status: appStatus,
          webUIPort: hostPort ? Number(hostPort) : undefined,
          containerName,
          installedAt: dbMeta?.createdAt?.getTime?.() || Date.now(),
        };
      })
    );
  } catch (error) {
    console.error('[SSE] Failed to collect installed apps:', error);
    return [];
  }
}

async function resolveHostPort(containerName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{json .NetworkSettings.Ports}}' ${containerName}`
    );

    const ports = JSON.parse(stdout || "{}") as Record<
      string,
      { HostIp: string; HostPort: string }[] | null
    >;

    const firstMapping = Object.values(ports).find(
      (mappings) => Array.isArray(mappings) && mappings.length > 0
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

async function pollAndBroadcast() {
  if (isPolling || clients.size === 0) return;
  isPolling = true;
  try {
    const [systemStatus, storageInfo, networkStats, installedApps, runningApps] = await Promise.all([
      getSystemStatus(),
      getStorageInfo(),
      getNetworkStats(),
      getInstalledApps(),
      getRunningApps(),
    ]);
    latestPayload = { type: 'metrics', systemStatus, storageInfo, networkStats, installedApps, runningApps };
    broadcast(latestPayload);
  } catch (error) {
    console.error('[SSE] Metrics fetch error:', error);
    broadcast({ type: 'error', message: 'Failed to fetch metrics' });
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
      'docker stats --no-stream --format "{{ json . }}"'
    );

    if (!stdout.trim()) return [];

    const parseMemoryString = (memStr: string): number => {
      const cleaned = memStr.replace(/,/g, '').trim();
      const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
      if (!match) return 0;

      const value = parseFloat(match[1] || '0');
      if (!Number.isFinite(value)) return 0;

      const unit = (match[2] || 'b').toLowerCase();

      if (unit.startsWith('t')) return value * 1024 ** 4;
      if (unit.startsWith('g')) return value * 1024 ** 3;
      if (unit.startsWith('m')) return value * 1024 ** 2;
      if (unit.startsWith('k')) return value * 1024;
      return value;
    };
    const parseNetString = (netStr: string): number => {
      const cleaned = netStr.replace(/,/g, '').trim();
      const match = cleaned.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
      if (!match) return 0;

      const value = parseFloat(match[1] || '0');
      if (!Number.isFinite(value)) return 0;

      const unit = (match[2] || 'b').toLowerCase();

      if (unit.startsWith('t')) return value * 1024 ** 4;
      if (unit.startsWith('g')) return value * 1024 ** 3;
      if (unit.startsWith('m')) return value * 1024 ** 2;
      if (unit.startsWith('k')) return value * 1024;
      return value;
    };

    return stdout
      .trim()
      .split('\n')
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

          const cpuUsage = parseFloat(parsed.CPUPerc?.replace('%', '') || '0');
          const memPercent = parseFloat(parsed.MemPerc?.replace('%', '') || '0');
          const memParts = parsed.MemUsage?.split(' / ') || [];
          const netParts = parsed.NetIO?.split(' / ') || [];
          const memoryUsage = parseMemoryString(memParts[0]?.trim() || '0');
          const memoryLimit = parseMemoryString(memParts[1]?.trim() || '0');
          const netRx = parseNetString(netParts[0]?.trim() || '0');
          const netTx = parseNetString(netParts[1]?.trim() || '0');

          return [
            {
              id: name,
              name: name.replace(/-/g, ' ').replace(/\\b\\w/g, (c) =>
                c.toUpperCase(),
              ),
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
    console.error('[SSE] Failed to collect running apps:', error);
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
  const wantsFast = new URL(request.url).searchParams.get('fast') === '1';
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
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
