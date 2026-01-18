import { getStorageInfo, getSystemStatus } from '@/app/actions/system-status';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let isClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        if (isClosed) return;
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // Controller may be closed
          cleanup();
        }
      };

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      // Send initial data immediately
      try {
        const [systemStatus, storageInfo] = await Promise.all([
          getSystemStatus(),
          getStorageInfo(),
        ]);
        sendEvent({ type: 'metrics', systemStatus, storageInfo });
      } catch (error) {
        console.error('[SSE] Initial fetch error:', error);
        sendEvent({ type: 'error', message: 'Failed to fetch initial metrics' });
      }

      // Set up interval for continuous updates
      intervalId = setInterval(async () => {
        if (isClosed) {
          cleanup();
          return;
        }
        try {
          const [systemStatus, storageInfo] = await Promise.all([
            getSystemStatus(),
            getStorageInfo(),
          ]);
          sendEvent({ type: 'metrics', systemStatus, storageInfo });
        } catch (error) {
          console.error('[SSE] Metrics fetch error:', error);
          sendEvent({ type: 'error', message: 'Failed to fetch metrics' });
        }
      }, 2000);
    },
    cancel() {
      console.log('[SSE] Client disconnected');
      isClosed = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
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
