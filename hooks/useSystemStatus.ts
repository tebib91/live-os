"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  InstallProgress,
  SSEMessage,
  SharedState,
  Subscriber,
  UseSystemStatusReturn,
} from "./system-status-types";

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
const TERMINAL_PROGRESS_TTL_MS = 2500;
const installRemovalTimers = new Map<string, ReturnType<typeof setTimeout>>();

function normalizeId(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function notifySubscribers() {
  subscribers.forEach(({ callback }) => callback(sharedState));
}

function updateSharedState(update: Partial<SharedState>) {
  const nextState: SharedState = { ...sharedState, ...update };
  const changed = (Object.keys(nextState) as (keyof SharedState)[]).some(
    (key) => sharedState[key] !== nextState[key],
  );

  if (!changed) return;

  sharedState = nextState;
  notifySubscribers();
}

function scheduleInstallRemoval(appId: string) {
  const existing = installRemovalTimers.get(appId);
  if (existing) {
    clearTimeout(existing);
  }
  const timer = setTimeout(() => {
    installRemovalTimers.delete(appId);
    updateSharedState({
      installProgress: sharedState.installProgress.filter((p) => p.appId !== appId),
    });
  }, TERMINAL_PROGRESS_TTL_MS);
  installRemovalTimers.set(appId, timer);
}

function updateInstallProgress(
  prev: InstallProgress[],
  update: InstallProgress,
): InstallProgress[] {
  const existingTimer = installRemovalTimers.get(update.appId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    installRemovalTimers.delete(update.appId);
  }
  const filtered = prev.filter((p) => p.appId !== update.appId);

  if (update.status === "completed" || update.status === "error") {
    scheduleInstallRemoval(update.appId);
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
    updateSharedState({ error: "Connection lost. Please refresh the page." });
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
    const es = new EventSource(`/api/system/stream${wantFast ? "?fast=1" : ""}`);
    eventSource = es;
    currentFastMode = wantFast;

    es.onopen = () => {
      reconnectAttempts = 0;
      updateSharedState({ connected: true, error: null });
    };

    es.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);

        if (data.type === "metrics") {
          const nextInstalled = data.installedApps ?? sharedState.installedApps;
          const rawRunning = data.runningApps ?? sharedState.runningApps;
          const runningWithIcons = rawRunning.map((app) => {
            const appIdNorm = normalizeId(app.id);
            const match = nextInstalled.find((inst) => {
              if (inst.containerName === app.id || inst.appId === app.id) {
                return true;
              }

              const containerNorm = normalizeId(inst.containerName);
              const appNorm = normalizeId(inst.appId);

              if (!appIdNorm || (!containerNorm && !appNorm)) {
                return false;
              }

              return (
                containerNorm === appIdNorm ||
                appNorm === appIdNorm ||
                containerNorm.includes(appIdNorm) ||
                appIdNorm.includes(containerNorm) ||
                appNorm.includes(appIdNorm) ||
                appIdNorm.includes(appNorm)
              );
            });
            return match ? { ...app, icon: match.icon, name: match.name } : app;
          });

          updateSharedState({
            systemStats: data.systemStatus ?? sharedState.systemStats,
            storageStats: data.storageInfo ?? sharedState.storageStats,
            networkStats: data.networkStats ?? sharedState.networkStats,
            installedApps: nextInstalled,
            runningApps: runningWithIcons,
            error: null,
          });
        } else if (data.type === "install-progress") {
          updateSharedState({
            installProgress: updateInstallProgress(sharedState.installProgress, data),
          });
        } else if (data.type === "error") {
          console.error("[SystemStatus] Server error:", data.message);
          updateSharedState({ error: data.message || "Unknown error" });
        }
      } catch (parseError) {
        console.error("[SystemStatus] Failed to parse SSE message:", parseError);
      }
    };

    es.onerror = () => {
      console.log("[SystemStatus] SSE error/disconnected");
      updateSharedState({ connected: false });
      stopEventSource();
      scheduleReconnect();
    };
  } catch (err) {
    console.error("[SystemStatus] Failed to create EventSource:", err);
    updateSharedState({
      error: "Failed to connect to system metrics stream",
      connected: false,
    });
  }
}

function syncEventSource() {
  if (subscribers.size === 0) {
    stopEventSource();
    return;
  }
  connectEventSource(shouldUseFast());
}

function subscribeToSystemStatus(
  callback: (state: SharedState) => void,
  fast: boolean,
) {
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

export function useSystemStatus(
  options: { fast?: boolean; enabled?: boolean } = {},
): UseSystemStatusReturn {
  const [state, setState] = useState<SharedState>(sharedState);
  const fast = options.fast ?? false;
  const enabled = options.enabled ?? true;

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return subscribeToSystemStatus(setState, fast);
  }, [enabled, fast]);

  const pushInstallProgress = useCallback(
    (update: InstallProgress) => {
      updateSharedState({
        installProgress: updateInstallProgress(sharedState.installProgress, update),
      });
    },
    [],
  );

  return {
    systemStats: state.systemStats,
    storageStats: state.storageStats,
    networkStats: state.networkStats,
    runningApps: state.runningApps,
    installedApps: state.installedApps,
    installProgress: state.installProgress,
    connected: state.connected,
    error: state.error,
    pushInstallProgress,
  };
}
