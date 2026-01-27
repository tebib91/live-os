import { useCallback, useEffect, useRef, useState } from "react";

const MAX_LINES = 500;

/**
 * Hook for streaming Docker container logs via SSE.
 */
export function useLogStream(containerName: string, enabled: boolean) {
  const [lines, setLines] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const clear = useCallback(() => setLines([]), []);

  useEffect(() => {
    if (!enabled || !containerName) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreaming(false);
      return;
    }

    const es = new EventSource(
      `/api/docker/logs?container=${encodeURIComponent(containerName)}`,
    );
    eventSourceRef.current = es;
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { line: string };
        setLines((prev) => [...prev, data.line].slice(-MAX_LINES));
      } catch {
        // Ignore parse errors
      }
    };

    es.onopen = () => {
       
      setStreaming(true);
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
       
      setStreaming(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
       
      setStreaming(false);
    };
  }, [containerName, enabled]);

  return { lines, streaming, clear };
}
