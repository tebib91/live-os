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
    const storeMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    const { stdout } = await execAsync(
      'docker ps -a --format "{{.Names}}\\t{{.Status}}\\t{{.Image}}"'
    );

    if (!stdout.trim()) return [];

    const lines = stdout.trim().split('\n');
    return await Promise.all(
      lines.map(async (line) => {
        const [containerName, status] = line.split('\t');

        let appStatus: 'running' | 'stopped' | 'error' = 'error';
        if (status.toLowerCase().startsWith('up')) {
          appStatus = 'running';
        } else if (status.toLowerCase().includes('exited')) {
          appStatus = 'stopped';
        }

        const meta = metaByContainer.get(containerName);
        const appId = meta?.appId || getAppIdFromContainerName(containerName);
        const storeMeta = appId ? storeMetaById.get(appId) : undefined;
        const hostPort = await resolveHostPort(containerName);

        return {
          id: containerName,
          appId,
          name:
            meta?.name ||
            storeMeta?.title ||
            storeMeta?.name ||
            containerName.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: meta?.icon || storeMeta?.icon || '/default-application-icon.png',
          status: appStatus,
          webUIPort: hostPort ? Number(hostPort) : undefined,
          containerName,
          installedAt: meta?.createdAt?.getTime?.() || Date.now(),
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
    const [systemStatus, storageInfo, networkStats, installedApps] = await Promise.all([
      getSystemStatus(),
      getStorageInfo(),
      getNetworkStats(),
      getInstalledApps(),
    ]);
    latestPayload = { type: 'metrics', systemStatus, storageInfo, networkStats, installedApps };
    broadcast(latestPayload);
  } catch (error) {
    console.error('[SSE] Metrics fetch error:', error);
    broadcast({ type: 'error', message: 'Failed to fetch metrics' });
  } finally {
    isPolling = false;
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
