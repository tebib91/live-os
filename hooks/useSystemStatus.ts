'use client';

import { useCallback, useEffect, useState } from 'react';

// Types matching server-side definitions
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

interface SystemUpdateMessage {
  type: 'system-update';
  data: {
    cpu: SystemStats['cpu'];
    memory: SystemStats['memory'];
    gpu?: SystemStats['gpu'];
    storage: StorageStats;
    network: NetworkStats;
    runningApps: AppUsage[];
  };
  timestamp: number;
}

interface AppsUpdateMessage {
  type: 'apps-update';
  data: {
    installedApps: InstalledApp[];
  };
  timestamp: number;
}

type WebSocketMessage = SystemUpdateMessage | AppsUpdateMessage;

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

  // Manual refresh trigger
  refreshApps: () => void;
}

// Singleton WebSocket connection
let globalWs: WebSocket | null = null;
const globalListeners: Set<(message: WebSocketMessage) => void> = new Set();
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000;

function getWebSocketUrl(): string {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/system-status`;
}

function connectWebSocket(): void {
  if (globalWs?.readyState === WebSocket.OPEN || globalWs?.readyState === WebSocket.CONNECTING) {
    return;
  }

  const url = getWebSocketUrl();
  if (!url) return;

  try {
    globalWs = new WebSocket(url);

    globalWs.onopen = () => {
      console.log('[SystemStatus] WebSocket connected');
      connectionAttempts = 0;
    };

    globalWs.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        globalListeners.forEach((listener) => listener(message));
      } catch (error) {
        console.error('[SystemStatus] Failed to parse message:', error);
      }
    };

    globalWs.onclose = () => {
      console.log('[SystemStatus] WebSocket disconnected');
      globalWs = null;

      // Attempt to reconnect if there are still listeners
      if (globalListeners.size > 0 && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        connectionAttempts++;
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
      }
    };

    globalWs.onerror = (error) => {
      console.error('[SystemStatus] WebSocket error:', error);
    };
  } catch (error) {
    console.error('[SystemStatus] Failed to create WebSocket:', error);
  }
}

function disconnectWebSocket(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (globalWs) {
    globalWs.close();
    globalWs = null;
  }
}

function addListener(listener: (message: WebSocketMessage) => void): void {
  globalListeners.add(listener);

  // Connect if this is the first listener
  if (globalListeners.size === 1) {
    connectWebSocket();
  }
}

function removeListener(listener: (message: WebSocketMessage) => void): void {
  globalListeners.delete(listener);

  // Disconnect if no more listeners
  if (globalListeners.size === 0) {
    disconnectWebSocket();
  }
}

/**
 * Hook for real-time system status via WebSocket
 */
export function useSystemStatus(): UseSystemStatusReturn {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [runningApps, setRunningApps] = useState<AppUsage[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [connected, setConnected] = useState(false);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    if (message.type === 'system-update') {
      setSystemStats({
        cpu: message.data.cpu,
        memory: message.data.memory,
        gpu: message.data.gpu,
      });
      setStorageStats(message.data.storage);
      setNetworkStats(message.data.network);
      setRunningApps(message.data.runningApps);
      setConnected(true);
    } else if (message.type === 'apps-update') {
      setInstalledApps(message.data.installedApps);
    }
  }, []);

  useEffect(() => {
    addListener(handleMessage);

    // Track connection state
    const checkConnection = () => {
      setConnected(globalWs?.readyState === WebSocket.OPEN);
    };

    const interval = setInterval(checkConnection, 1000);

    return () => {
      removeListener(handleMessage);
      clearInterval(interval);
    };
  }, [handleMessage]);

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
    refreshApps,
  };
}
