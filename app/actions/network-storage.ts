/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { execFile } from "child_process";
import crypto from "crypto";
import dns from "dns/promises";
import fs from "fs/promises";
import net from "net";
import path from "path";
import { promisify } from "util";

import { getHomeRoot } from "./filesystem";

const execFileAsync = promisify(execFile);
const STORE_FILENAME = ".network-shares.json";

// Stored locally under the Devices directory; passwords are kept in plain text to allow reconnects.
type StoredShare = {
  id: string;
  host: string;
  share: string;
  username?: string;
  password?: string;
  mountPath: string;
  lastError?: string | null;
  createdAt: number;
};

export type NetworkShare = Omit<StoredShare, "password"> & {
  status: "connected" | "disconnected";
};

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "share"
  );
}

async function getStorePath(): Promise<string> {
  const homeRoot = await getHomeRoot();
  const devicesDir = path.join(homeRoot, "Devices");
  await fs.mkdir(devicesDir, { recursive: true });
  return path.join(devicesDir, STORE_FILENAME);
}

async function loadShares(): Promise<StoredShare[]> {
  try {
    const raw = await fs.readFile(await getStorePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.mountPath === "string",
    );
  } catch (error: any) {
    if (error?.code === "ENOENT") return [];
    console.error("[network-storage] Failed to read store:", error);
    return [];
  }
}

async function saveShares(shares: StoredShare[]) {
  const storePath = await getStorePath();
  const payload = JSON.stringify(shares, null, 2);
  await fs.writeFile(storePath, payload, { mode: 0o600 });
}

async function isMounted(mountPath: string): Promise<boolean> {
  try {
    await execFileAsync("findmnt", ["-n", mountPath]);
    return true;
  } catch {
    try {
      await execFileAsync("mountpoint", ["-q", mountPath]);
      return true;
    } catch {
      return false;
    }
  }
}

function buildMountOptions(username?: string, password?: string) {
  const opts = ["rw", "iocharset=utf8", "vers=3.0"];
  const uid =
    typeof process.getuid === "function" ? process.getuid() : undefined;
  const gid =
    typeof process.getgid === "function" ? process.getgid() : undefined;

  if (uid !== undefined) opts.push(`uid=${uid}`);
  if (gid !== undefined) opts.push(`gid=${gid}`);

  if (username && username.trim()) {
    opts.push(`username=${username.trim()}`);
  } else {
    opts.push("guest");
  }

  if (password !== undefined) {
    opts.push(`password=${password}`);
  }

  // Avoid interactive password prompts in case the server requires it
  opts.push("nounix");

  return opts.join(",");
}

async function mountShare(share: StoredShare, passwordOverride?: string) {
  const resolved = await resolveHost(share.host);
  if (!resolved) {
    return {
      success: false as const,
      error: `Could not resolve host "${share.host}"`,
    };
  }

  const source = `//${resolved}/${share.share}`;
  const password = passwordOverride ?? share.password;

  try {
    await fs.mkdir(share.mountPath, { recursive: true });
  } catch {
    // best-effort
  }

  if (await isMounted(share.mountPath)) {
    return { success: true as const };
  }

  try {
    await execFileAsync(
      "mount",
      [
        "-t",
        "cifs",
        source,
        share.mountPath,
        "-o",
        buildMountOptions(share.username, password),
      ],
      {
        timeout: 15000,
      },
    );
    return { success: true as const };
  } catch (error: any) {
    const message =
      error?.stderr?.toString?.().trim?.() ||
      error?.message ||
      "Failed to mount share";
    console.error("[network-storage] mount failed:", message);
    return { success: false as const, error: message };
  }
}

async function unmountShare(share: StoredShare) {
  if (!(await isMounted(share.mountPath))) {
    return { success: true as const };
  }

  try {
    await execFileAsync("umount", [share.mountPath], { timeout: 10000 });
    return { success: true as const };
  } catch {
    // Try fusermount as a fallback
    try {
      await execFileAsync("fusermount", ["-u", share.mountPath], {
        timeout: 10000,
      });
      return { success: true as const };
    } catch (error: any) {
      const message =
        error?.stderr?.toString?.().trim?.() ||
        error?.message ||
        "Failed to unmount share";
      console.error("[network-storage] unmount failed:", message);
      return { success: false as const, error: message };
    }
  }
}

async function withStatus(share: StoredShare): Promise<NetworkShare> {
  const connected = await isMounted(share.mountPath);
  return {
    id: share.id,
    host: share.host,
    share: share.share,
    username: share.username,
    mountPath: share.mountPath,
    lastError: share.lastError,
    createdAt: share.createdAt,
    status: connected ? "connected" : "disconnected",
  };
}

export async function listNetworkShares(): Promise<{ shares: NetworkShare[] }> {
  const shares = await loadShares();
  const withStatuses = await Promise.all(shares.map(withStatus));

  // Sort alphabetically for stable display
  withStatuses.sort(
    (a, b) => a.host.localeCompare(b.host) || a.share.localeCompare(b.share),
  );

  return { shares: withStatuses };
}

async function resolveHost(host: string): Promise<string | null> {
  try {
    const res = await dns.lookup(host);
    return res.address || null;
  } catch {
    return null;
  }
}

async function checkReachable(
  host: string,
  timeoutMs = 3000,
): Promise<{ ok: boolean; error?: string }> {
  const address = await resolveHost(host);
  if (!address) {
    return { ok: false, error: `Could not resolve host "${host}"` };
  }

  return new Promise((resolve) => {
    const socket = net.createConnection(
      { host: address, port: 445, timeout: timeoutMs },
      () => {
        socket.destroy();
        resolve({ ok: true });
      },
    );

    socket.on("error", (err) => {
      socket.destroy();
      resolve({ ok: false, error: err?.message || "Connection failed" });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "Connection timed out" });
    });
  });
}

export async function addNetworkShare(input: {
  host: string;
  share: string;
  username?: string;
  password?: string;
}): Promise<{ success: boolean; share?: NetworkShare; error?: string }> {
  const host = input.host.trim();
  const share = input.share.replace(/^[\\/]+/, "").trim();

  if (!host || !share) {
    return { success: false, error: "Host and share are required" };
  }

  const shares = await loadShares();
  const devicesDir = path.join(await getHomeRoot(), "Devices");
  const existing = shares.find((s) => s.host === host && s.share === share);

  const mountPath =
    existing?.mountPath ||
    path.join(
      devicesDir,
      `${slugify(host)}-${slugify(share)}-${crypto.randomUUID().slice(0, 6)}`,
    );

  const record: StoredShare = {
    id: existing?.id || crypto.randomUUID(),
    host,
    share,
    username: input.username?.trim() || existing?.username,
    password: input.password ?? existing?.password,
    mountPath,
    lastError: null,
    createdAt: existing?.createdAt || Date.now(),
  };

  // Quick reachability check
  const reach = await checkReachable(host);
  if (!reach.ok) {
    record.lastError = reach.error;
    const nextShares = existing
      ? shares.map((s) => (s.id === record.id ? record : s))
      : [...shares, record];
    await saveShares(nextShares);
    return { success: false, error: reach.error, share: await withStatus(record) };
  }

  // Attempt mount immediately
  const mountResult = await mountShare(record);
  if (!mountResult.success) {
    record.lastError = mountResult.error;
  } else {
    record.lastError = null;
  }

  const nextShares = existing
    ? shares.map((s) => (s.id === record.id ? record : s))
    : [...shares, record];
  await saveShares(nextShares);

  return {
    success: mountResult.success,
    share: await withStatus(record),
    error: mountResult.success ? undefined : mountResult.error,
  };
}

export async function connectNetworkShare(
  id: string,
  password?: string,
): Promise<{ success: boolean; share?: NetworkShare; error?: string }> {
  const shares = await loadShares();
  const record = shares.find((s) => s.id === id);

  if (!record) {
    return { success: false, error: "Share not found" };
  }

  const reach = await checkReachable(record.host);
  if (!reach.ok) {
    record.lastError = reach.error;
    await saveShares(shares.map((s) => (s.id === record.id ? record : s)));
    return { success: false, error: reach.error, share: await withStatus(record) };
  }

  const mountResult = await mountShare(record, password);
  if (!mountResult.success) {
    record.lastError = mountResult.error;
  } else {
    record.lastError = null;
  }

  await saveShares(shares.map((s) => (s.id === record.id ? record : s)));

  return {
    success: mountResult.success,
    share: await withStatus(record),
    error: mountResult.success ? undefined : mountResult.error,
  };
}

export async function disconnectNetworkShare(
  id: string,
): Promise<{ success: boolean; share?: NetworkShare; error?: string }> {
  const shares = await loadShares();
  const record = shares.find((s) => s.id === id);

  if (!record) {
    return { success: false, error: "Share not found" };
  }

  const result = await unmountShare(record);
  if (!result.success) {
    record.lastError = result.error;
  } else {
    record.lastError = null;
  }

  await saveShares(shares.map((s) => (s.id === record.id ? record : s)));

  return {
    success: result.success,
    share: await withStatus(record),
    error: result.success ? undefined : result.error,
  };
}

export async function removeNetworkShare(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const shares = await loadShares();
  const record = shares.find((s) => s.id === id);

  if (!record) {
    return { success: false, error: "Share not found" };
  }

  // Best-effort unmount; ignore failure so the entry can still be removed
  await unmountShare(record);

  const remaining = shares.filter((s) => s.id !== id);
  await saveShares(remaining);

  return { success: true };
}
