import { getNetworkStats, getStorageInfo, getSystemStatus } from '@/app/actions/system-status';

type MetricsPayload = {
  type: 'metrics';
  systemStatus: unknown;
  storageInfo: unknown;
  networkStats: unknown;
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
    const [systemStatus, storageInfo, networkStats] = await Promise.all([
      getSystemStatus(),
      getStorageInfo(),
      getNetworkStats(),
    ]);
    latestPayload = { type: 'metrics', systemStatus, storageInfo, networkStats };
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
