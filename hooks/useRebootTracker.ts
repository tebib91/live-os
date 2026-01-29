"use client";

import { useCallback, useEffect, useState } from "react";

type RebootPhase = "idle" | "initiating" | "waiting" | "online" | "failed";

type HealthSnapshot = {
  bootTimeMs: number;
  uptimeSeconds: number;
  timestamp: number;
};

type PersistedReboot = {
  bootTimeMs: number | null;
  startedAt: number;
};

type RebootSharedState = {
  phase: RebootPhase;
  startedAt?: number;
  bootBefore?: number | null;
  lastHealth?: HealthSnapshot | null;
  error?: string | null;
};

type Subscriber = {
  callback: (state: RebootSharedState) => void;
};

const STORAGE_KEY = "liveos:pending-reboot";
const POLL_INTERVAL_MS = 2000;
const STALE_AFTER_MS = 5 * 60 * 1000;

const subscribers = new Set<Subscriber>();
let sharedState: RebootSharedState = { phase: "idle" };
let pollTimer: ReturnType<typeof setTimeout> | null = null;

function notify() {
  subscribers.forEach(({ callback }) => callback(sharedState));
}

function updateShared(partial: Partial<RebootSharedState>) {
  const next = { ...sharedState, ...partial };
  const changed = (Object.keys(next) as (keyof RebootSharedState)[]).some(
    (key) => sharedState[key] !== next[key],
  );
  if (!changed) return;
  sharedState = next;
  notify();
}

function readPersisted(): PersistedReboot | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedReboot;
    if (
      typeof parsed.startedAt === "number" &&
      (typeof parsed.bootTimeMs === "number" || parsed.bootTimeMs === null)
    ) {
      return parsed;
    }
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return null;
}

function persist(record: PersistedReboot) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

function clearPersisted() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

async function fetchHealth(): Promise<HealthSnapshot | null> {
  try {
    const res = await fetch("/api/system/health", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as HealthSnapshot & { status?: string };
    if (typeof data.bootTimeMs !== "number") return null;
    return {
      bootTimeMs: data.bootTimeMs,
      uptimeSeconds: data.uptimeSeconds,
      timestamp: data.timestamp ?? Date.now(),
    };
  } catch {
    return null;
  }
}

function stopPolling() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

async function pollOnce() {
  const record = readPersisted();
  if (!record) {
    stopPolling();
    updateShared({
      phase: "idle",
      startedAt: undefined,
      bootBefore: undefined,
    });
    return;
  }

  const now = Date.now();
  if (now - record.startedAt > STALE_AFTER_MS) {
    clearPersisted();
    stopPolling();
    updateShared({
      phase: "failed",
      error: "Restart timed out. Please try again.",
      startedAt: record.startedAt,
      bootBefore: record.bootTimeMs,
    });
    return;
  }

  const health = await fetchHealth();

  if (
    health &&
    record.bootTimeMs !== null &&
    health.bootTimeMs > record.bootTimeMs
  ) {
    clearPersisted();
    stopPolling();
    updateShared({
      phase: "online",
      lastHealth: health,
      startedAt: record.startedAt,
      bootBefore: record.bootTimeMs,
      error: null,
    });
    setTimeout(() => {
      updateShared({
        phase: "idle",
        startedAt: undefined,
        bootBefore: undefined,
        lastHealth: undefined,
        error: null,
      });
    }, 1500);
    return;
  }

  updateShared({
    phase: "waiting",
    lastHealth: health ?? null,
    startedAt: record.startedAt,
    bootBefore: record.bootTimeMs,
    error: null,
  });

  pollTimer = setTimeout(pollOnce, POLL_INTERVAL_MS);
}

function ensurePolling(immediate = false) {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  pollTimer = setTimeout(pollOnce, immediate ? 0 : POLL_INTERVAL_MS);
}

async function initiateRestart(): Promise<{ ok: boolean; error?: string }> {
  // Capture current boot time before triggering restart
  const health = await fetchHealth();
  const bootTimeMs = health?.bootTimeMs ?? null;
  const startedAt = Date.now();

  persist({ bootTimeMs, startedAt });
  updateShared({
    phase: "initiating",
    startedAt,
    bootBefore: bootTimeMs,
    lastHealth: health ?? null,
    error: null,
  });

  ensurePolling(true);

  try {
    const res = await fetch("/api/system/restart", { method: "POST" });
    if (!res.ok) {
      throw new Error("Restart endpoint failed");
    }
    updateShared({
      phase: "waiting",
      startedAt,
      bootBefore: bootTimeMs,
      lastHealth: health ?? null,
      error: null,
    });
    return { ok: true };
  } catch (error) {
    clearPersisted();
    stopPolling();
    const message =
      error instanceof Error
        ? error.message
        : "Restart failed. Please try again.";
    updateShared({ phase: "failed", error: message, startedAt });
    return { ok: false, error: message };
  }
}

function subscribe(callback: (state: RebootSharedState) => void) {
  const sub: Subscriber = { callback };
  subscribers.add(sub);
  callback(sharedState);

  const record = readPersisted();
  if (record) {
    updateShared({
      phase: "waiting",
      startedAt: record.startedAt,
      bootBefore: record.bootTimeMs,
    });
    ensurePolling(true);
  }

  return () => {
    subscribers.delete(sub);
  };
}

export function useRebootTracker() {
  const [state, setState] = useState<RebootSharedState>(sharedState);
  const [nowTs, setNowTs] = useState(0);

  useEffect(() => subscribe(setState), []);

  useEffect(() => {
    if (
      !state.startedAt ||
      (state.phase !== "waiting" && state.phase !== "initiating")
    ) {
      return;
    }

    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.phase, state.startedAt]);

  const requestReboot = useCallback(async () => initiateRestart(), []);

  const dismissFailure = useCallback(() => {
    clearPersisted();
    stopPolling();
    updateShared({ phase: "idle", error: null, startedAt: undefined });
  }, []);

  const elapsedSeconds =
    state.startedAt &&
    nowTs > 0 &&
    (state.phase === "waiting" || state.phase === "initiating")
      ? Math.max(0, Math.round((nowTs - state.startedAt) / 1000))
      : 0;

  return {
    ...state,
    requestReboot,
    dismissFailure,
    elapsedSeconds,
  };
}
