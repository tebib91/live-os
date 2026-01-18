'use client';

import type { HardwareInfo } from '@/components/settings/hardware-utils';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SystemStats {
  cpu: { usage: number; temperature: number; power: number };
  memory: { usage: number; total: number; used: number; free: number };
  hardware?: HardwareInfo;
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
  memoryUsage: number;
  memoryLimit: number;
  memoryPercent: number;
}

export interface InstalledApp {
  id: string;
  appId: string;
  name: string;
  icon: string;
  status: 'running' | 'stopped' | 'error';
  webUIPort?: number;
  containerName: string;
  installedAt: number;
}

export interface UseSystemStatusReturn {
  // System metrics
  systemStats: SystemStats | null;
  storageStats: StorageStats | null;
  networkStats: NetworkStats | null;
  runningApps: AppUsage[];

  // Installed apps
  installedApps: InstalledApp[];

  // Connection state
  connected: boolean;
  error: string | null;

  // Manual refresh trigger
  refreshApps: () => void;
}

interface SSEMessage {
  type: 'metrics' | 'error';
  systemStatus?: SystemStats;
  storageInfo?: StorageStats;
  message?: string;
}

/**
 * Hook for real-time system status via Server-Sent Events (SSE)
 * Uses a singleton EventSource connection shared across all consumers
 */
export function useSystemStatus(): UseSystemStatusReturn {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [runningApps, setRunningApps] = useState<AppUsage[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (eventSourceRef.current?.readyState === EventSource.OPEN ||
        eventSourceRef.current?.readyState === EventSource.CONNECTING) {
      return;
    }

    try {
      const es = new EventSource('/api/system/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('[SystemStatus] SSE connected');
        setConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      es.onmessage = (event) => {
        try {
          const data: SSEMessage = JSON.parse(event.data);

          if (data.type === 'metrics') {
            if (data.systemStatus) {
              setSystemStats(data.systemStatus);
            }
            if (data.storageInfo) {
              setStorageStats(data.storageInfo);
            }
          } else if (data.type === 'error') {
            console.error('[SystemStatus] Server error:', data.message);
            setError(data.message || 'Unknown error');
          }
        } catch (parseError) {
          console.error('[SystemStatus] Failed to parse SSE message:', parseError);
        }
      };

      es.onerror = () => {
        console.log('[SystemStatus] SSE error/disconnected');
        setConnected(false);
        es.close();
        eventSourceRef.current = null;

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`[SystemStatus] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_DELAY);
        } else {
          setError('Connection lost. Please refresh the page.');
        }
      };
    } catch (err) {
      console.error('[SystemStatus] Failed to create EventSource:', err);
      setError('Failed to connect to system metrics stream');
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // Manual refresh trigger - dispatches event for backwards compatibility
  const refreshApps = useCallback(() => {
    window.dispatchEvent(new CustomEvent('refreshInstalledApps'));
  }, []);

  return {
    systemStats,
    storageStats,
    networkStats,
    runningApps,
    installedApps,
    connected,
    error,
    refreshApps,
  };
}
