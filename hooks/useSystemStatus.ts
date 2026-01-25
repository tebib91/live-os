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

function updateInstallProgress(
  prev: InstallProgress[],
  update: InstallProgress,
): InstallProgress[] {
  const filtered = prev.filter((p) => p.appId !== update.appId);

  if (update.status === "completed" || update.status === "error") {
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

  const refreshApps = useCallback(() => {
    window.dispatchEvent(new CustomEvent("refreshInstalledApps"));
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
