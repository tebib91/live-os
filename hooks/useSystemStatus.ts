'use client';

import type { HardwareInfo } from '@/components/settings/hardware-utils';
import { useCallback, useEffect, useState } from 'react';

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

export interface InstallProgress {
  appId: string;
  name: string;
  icon: string;
  progress: number; // 0-1
  status: 'starting' | 'running' | 'completed' | 'error';
  message?: string;
}

export interface UseSystemStatusReturn {
  // System metrics
  systemStats: SystemStats | null;
  storageStats: StorageStats | null;
  networkStats: NetworkStats | null;
  runningApps: AppUsage[];

  // Installed apps
  installedApps: InstalledApp[];
  installProgress: InstallProgress[];

  // Connection state
  connected: boolean;
  error: string | null;

  // Manual refresh trigger
  refreshApps: () => void;
}

interface MetricsMessage {
  type: 'metrics';
  systemStatus?: SystemStats;
  storageInfo?: StorageStats;
  networkStats?: NetworkStats;
  installedApps?: InstalledApp[];
  runningApps?: AppUsage[];
}

interface ErrorMessage {
  type: 'error';
  message?: string;
}

type SSEMessage =
  | MetricsMessage
  | ErrorMessage
  | (InstallProgress & { type: 'install-progress' });

type SharedState = {
  systemStats: SystemStats | null;
  storageStats: StorageStats | null;
  networkStats: NetworkStats | null;
  runningApps: AppUsage[];
  installedApps: InstalledApp[];
  installProgress: InstallProgress[];
  connected: boolean;
  error: string | null;
};

type Subscriber = {
  callback: (state: SharedState) => void;
  fast: boolean;
};

const subscribers = new Set<Subscriber>();
let sharedState: SharedState = {
  systemStats: null,
  storageStats: null,
  networkStats: null,
  runningApps: [],
  installedApps: [],
  installProgress: [],
  connected: false,
  error: null,
};

let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let currentFastMode = false;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;

function notifySubscribers() {
  subscribers.forEach(({ callback }) => callback(sharedState));
}

function updateSharedState(update: Partial<SharedState>) {
  const nextState: SharedState = { ...sharedState, ...update };
  const changed = (Object.keys(nextState) as (keyof SharedState)[]).some(
    (key) => sharedState[key] !== nextState[key]
  );

  if (!changed) return;

  sharedState = nextState;
  notifySubscribers();
}

function updateInstallProgress(
  prev: InstallProgress[],
  update: InstallProgress
): InstallProgress[] {
  const filtered = prev.filter((p) => p.appId !== update.appId);

  if (update.status === 'completed' || update.status === 'error') {
    return filtered;
  }

  return [...filtered, update];
}

function stopEventSource() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }

  currentFastMode = false;
}

function scheduleReconnect() {
  if (subscribers.size === 0) return;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    updateSharedState({ error: 'Connection lost. Please refresh the page.' });
    return;
  }

  reconnectAttempts++;
  reconnectTimeout = setTimeout(() => syncEventSource(), RECONNECT_DELAY);
}

function shouldUseFast() {
  for (const subscriber of subscribers) {
    if (subscriber.fast) return true;
  }
  return false;
}

function connectEventSource(wantFast: boolean) {
  if (subscribers.size === 0) return;
  if (eventSource && currentFastMode === wantFast) return;

  if (eventSource) {
    stopEventSource();
  }

  try {
    const es = new EventSource(`/api/system/stream${wantFast ? '?fast=1' : ''}`);
    eventSource = es;
    currentFastMode = wantFast;

    es.onopen = () => {
      reconnectAttempts = 0;
      updateSharedState({ connected: true, error: null });
    };

    es.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);

        if (data.type === 'metrics') {
          const nextInstalled = data.installedApps ?? sharedState.installedApps;
          const rawRunning = data.runningApps ?? sharedState.runningApps;
          const runningWithIcons = rawRunning.map((app) => {
            const match =
              nextInstalled.find((inst) => inst.containerName === app.id) ||
              nextInstalled.find((inst) => inst.appId === app.id);
            return match ? { ...app, icon: match.icon } : app;
          });

          updateSharedState({
            systemStats: data.systemStatus ?? sharedState.systemStats,
            storageStats: data.storageInfo ?? sharedState.storageStats,
            networkStats: data.networkStats ?? sharedState.networkStats,
            installedApps: nextInstalled,
            runningApps: runningWithIcons,
            error: null,
          });
        } else if (data.type === 'install-progress') {
          updateSharedState({
            installProgress: updateInstallProgress(sharedState.installProgress, data),
          });
        } else if (data.type === 'error') {
          console.error('[SystemStatus] Server error:', data.message);
          updateSharedState({ error: data.message || 'Unknown error' });
        }
      } catch (parseError) {
        console.error('[SystemStatus] Failed to parse SSE message:', parseError);
      }
    };

    es.onerror = () => {
      console.log('[SystemStatus] SSE error/disconnected');
      updateSharedState({ connected: false });
      stopEventSource();
      scheduleReconnect();
    };
  } catch (err) {
    console.error('[SystemStatus] Failed to create EventSource:', err);
    updateSharedState({ error: 'Failed to connect to system metrics stream', connected: false });
  }
}

function syncEventSource() {
  if (subscribers.size === 0) {
    stopEventSource();
    return;
  }
  connectEventSource(shouldUseFast());
}

function subscribeToSystemStatus(callback: (state: SharedState) => void, fast: boolean) {
  const subscriber: Subscriber = { callback, fast };
  subscribers.add(subscriber);
  callback(sharedState);

  syncEventSource();

  return () => {
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      reconnectAttempts = 0;
      stopEventSource();
      return;
    }
    syncEventSource();
  };
}

/**
 * Hook for real-time system status via Server-Sent Events (SSE)
 * Uses a singleton EventSource connection shared across all consumers
 */
export function useSystemStatus(options: { fast?: boolean } = {}): UseSystemStatusReturn {
  const [state, setState] = useState<SharedState>(sharedState);
  const fast = options.fast ?? false;

  useEffect(() => subscribeToSystemStatus(setState, fast), [fast]);

  // Manual refresh trigger - dispatches event for backwards compatibility
  const refreshApps = useCallback(() => {
    window.dispatchEvent(new CustomEvent('refreshInstalledApps'));
  }, []);

  return {
    systemStats: state.systemStats,
    storageStats: state.storageStats,
    networkStats: state.networkStats,
    runningApps: state.runningApps,
    installedApps: state.installedApps,
    installProgress: state.installProgress,
    connected: state.connected,
    error: state.error,
    refreshApps,
  };
}
