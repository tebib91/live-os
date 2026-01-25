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
import { logAction } from "./logger";

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

export type DiscoveredHost = {
  name: string;
  host: string;
  ip?: string;
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

function buildMountPath(
  devicesDir: string,
  host: string,
  share: string,
  existing?: StoredShare,
  others?: StoredShare[],
): string {
  if (existing?.mountPath) return existing.mountPath;

  const baseSlug = `${slugify(host)}-${slugify(share)}` || "share";
  let candidate = path.join(devicesDir, baseSlug);

  const taken = new Set(
    (others || [])
      .filter((s) => s.mountPath)
      .map((s) => path.resolve(s.mountPath)),
  );

  if (!taken.has(path.resolve(candidate))) {
    return candidate;
  }

  // Deterministic short hash to avoid randomness but keep uniqueness
  const suffix = crypto
    .createHash("md5")
    .update(`${host}/${share}`)
    .digest("hex")
    .slice(0, 6);
  candidate = path.join(devicesDir, `${baseSlug}-${suffix}`);

  return candidate;
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
    await logAction("network-storage:resolve-failed", {
      host: share.host,
      share: share.share,
    });
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
    const stderr = error?.stderr?.toString?.().trim?.();
    let message = stderr || error?.message || "Failed to mount share";
    if (message.toLowerCase().includes("no such file or directory")) {
      message =
        "Share not found on server (check the share name/path). Original: " +
        message;
    }
    await logAction("network-storage:mount-failed", {
      host: share.host,
      share: share.share,
      error: message,
    });
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
  } catch (err: any) {
    const stderr = err?.stderr?.toString?.() || err?.message || "";

    // Busy? try lazy unmount
    if (/busy/i.test(stderr)) {
      try {
        await execFileAsync("umount", ["-l", share.mountPath], {
          timeout: 10000,
        });
        return { success: true as const };
      } catch {
        // fall through to fusermount
      }
    }

    // Try fusermount as a fallback
    try {
      await execFileAsync("fusermount", ["-u", share.mountPath], {
        timeout: 10000,
      });
      return { success: true as const };
    } catch (error: any) {
      let message =
        error?.stderr?.toString?.().trim?.() ||
        error?.message ||
        "Failed to unmount share";

      if (/permission denied|operation not permitted/i.test(message)) {
        message = `${message} (try running "sudo umount ${share.mountPath}")`;
      }

      console.error("[network-storage] unmount failed:", message);
      return { success: false as const, error: message };
    }
  }
}

async function unmountAndCleanup(share: StoredShare) {
  const result = await unmountShare(share);
  if (result.success) {
    await removeMountDirIfSafe(share.mountPath);
  }
  return result;
}

function replaceShare(
  shares: StoredShare[],
  updated: StoredShare,
): StoredShare[] {
  return shares.map((s) => (s.id === updated.id ? updated : s));
}

async function removeMountDirIfSafe(mountPath: string): Promise<void> {
  try {
    const devicesDir = path.join(await getHomeRoot(), "Devices");
    const resolvedMount = path.resolve(mountPath);
    if (!resolvedMount.startsWith(path.resolve(devicesDir))) return;
    await fs.rm(resolvedMount, { recursive: true, force: true });
  } catch (err) {
    console.warn("[network-storage] removeMountDirIfSafe failed:", err);
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
  await logAction("network-storage:list", {});
  const shares = await loadShares();
  const withStatuses = await Promise.all(shares.map(withStatus));

  // Sort alphabetically for stable display
  withStatuses.sort(
    (a, b) => a.host.localeCompare(b.host) || a.share.localeCompare(b.share),
  );

  await logAction("network-storage:list:done", {
    count: withStatuses.length,
  });
  return { shares: withStatuses };
}

export async function discoverSmbHosts(): Promise<{ hosts: DiscoveredHost[] }> {
  await logAction("network-storage:discover:start");
  const hosts: DiscoveredHost[] = [];
  const seen = new Set<string>();

  console.info("[network-storage] Discovering SMB hosts via avahi-browse...");
  try {
    // avahi-browse -r -p -t _smb._tcp (use -p for parseable lines)
    const { stdout } = await execFileAsync(
      "avahi-browse",
      ["-r", "-p", "_smb._tcp"],
      { timeout: 5000 },
    );

    // Get local hostname to filter it out
    let localHostname = "";
    try {
      const { stdout: hostnameOut } = await execFileAsync("hostname", ["-s"], {
        timeout: 1000,
      });
      localHostname = hostnameOut.trim().toLowerCase();
    } catch {
      // ignore
    }

    const lines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    // First try parseable (-p) lines: =;iface;proto;name;type;domain;hostname;ip;port;txt;
    lines.forEach((line) => {
      const parts = line.split(";");
      if (parts.length >= 8 && parts[0] === "=") {
        const name = parts[3];
        const host = parts[6]?.replace(/\.local\.?$/, "") || name;
        const ip = parts[7];

        if (!name || !host || !ip) return;
        if (host.toLowerCase() === localHostname) return;
        if (seen.has(host.toLowerCase())) return;
        seen.add(host.toLowerCase());
        hosts.push({ name, host, ip });
      }
    });

    // Fallback: resolve multiline human-readable output (no -p)
    if (hosts.length === 0) {
      let current: Partial<DiscoveredHost> = {};
      lines.forEach((line) => {
        if (line.startsWith("=") || line.startsWith("+")) {
          // start of a new record
          if (current.name && current.host && current.ip) {
            const host = (current.host as string).toLowerCase();
            if (!seen.has(host) && host !== localHostname) {
              seen.add(host);
              hosts.push(current as DiscoveredHost);
            }
          }
          const name = line.split(" ").slice(3).join(" ").trim();
          current = { name };
        } else if (line.startsWith("hostname")) {
          const match = line.match(/\[(.+?)\]/);
          current.host = match?.[1]?.replace(/\.local\.?$/, "");
        } else if (line.startsWith("address")) {
          const match = line.match(/\[(.+?)\]/);
          current.ip = match?.[1];
        }
      });
      if (current.name && current.host && current.ip) {
        const host = (current.host as string).toLowerCase();
        if (!seen.has(host) && host !== localHostname) {
          seen.add(host);
          hosts.push(current as DiscoveredHost);
        }
      }
    }
    console.info(
      `[network-storage] Discovery complete: ${hosts.length} host(s) found`,
    );
    await logAction("network-storage:discover:done", { hosts: hosts.length });
  } catch (err) {
    await logAction("network-storage:discover:error", {
      error: (err as Error)?.message || "unknown",
    });
    console.warn(
      "[network-storage] Discovery failed:",
      (err as Error)?.message || err,
    );
  }
  return { hosts };
}

/**
 * Discover available SMB shares on a specific server using smbclient.
 * Returns list of share names (excluding IPC$, print$, etc.)
 */
export async function discoverSharesOnServer(
  host: string,
  credentials?: { username?: string; password?: string },
): Promise<{ success: boolean; shares: string[]; error?: string }> {
  await logAction("network-storage:discover-shares:start", { host });
  console.info("[network-storage] Listing shares on host:", host);

  const resolved = await resolveHost(host);
  if (!resolved) {
    console.warn(
      "[network-storage] discoverSharesOnServer: DNS failed for",
      host,
    );
    return { success: false, shares: [], error: `Could not resolve host "${host}"` };
  }

  try {
    // Build smbclient args
    const args = ["-L", resolved, "-g"]; // -g for parseable grep output

    if (credentials?.username) {
      args.push("-U", `${credentials.username}%${credentials.password || ""}`);
    } else {
      args.push("-N"); // No password (guest)
    }

    const { stdout, stderr } = await execFileAsync("smbclient", args, {
      timeout: 10000,
    });

    const output = stdout + "\n" + stderr;
    const shares: string[] = [];
    const excludePatterns = /^(IPC\$|print\$|ADMIN\$|C\$|D\$)$/i;

    // Parse grep-style output: Disk|ShareName|Comment
    output.split("\n").forEach((line) => {
      const parts = line.split("|");
      if (parts.length >= 2 && parts[0].toLowerCase() === "disk") {
        const shareName = parts[1].trim();
        if (shareName && !excludePatterns.test(shareName)) {
          shares.push(shareName);
        }
      }
    });

    await logAction("network-storage:discover-shares:done", {
      host,
      count: shares.length,
    });
    console.info(
      `[network-storage] Shares on ${host}: ${shares.length} found`,
    );

    return { success: true, shares };
  } catch (err: any) {
    const message = err?.stderr?.toString?.() || err?.message || "Failed to list shares";
    await logAction("network-storage:discover-shares:error", {
      host,
      error: message,
    });
    console.warn(
      "[network-storage] discoverSharesOnServer failed:",
      host,
      message,
    );

    // Check if it's an authentication error
    if (message.includes("NT_STATUS_ACCESS_DENIED") || message.includes("NT_STATUS_LOGON_FAILURE")) {
      return { success: false, shares: [], error: "Authentication required" };
    }

    return { success: false, shares: [], error: message };
  }
}

/**
 * Check if a server is a LiveOS device by probing for the API endpoint.
 */
export async function isLiveOSDevice(
  host: string,
): Promise<{ isLiveOS: boolean; version?: string }> {
  const resolved = await resolveHost(host);
  if (!resolved) {
    return { isLiveOS: false };
  }

  const urls = [
    `http://${resolved}:3000/api/system/info`,
    `http://${host}:3000/api/system/info`,
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        if (data?.hostname || data?.liveos) {
          return { isLiveOS: true, version: data.version };
        }
      }
    } catch {
      // ignore, try next URL
    }
  }

  return { isLiveOS: false };
}

async function resolveHost(host: string): Promise<string | null> {
  try {
    const res = await dns.lookup(host);
    return res.address || null;
  } catch {
    // Fallback to avahi-resolve for .local/mDNS
    try {
      const { stdout } = await execFileAsync("avahi-resolve", ["-n", host], {
        timeout: 2000,
      });
      const addr = stdout.trim().split(/\s+/)[1];
      return addr || null;
    } catch {
      // ignore
    }
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
  await logAction("network-storage:add:start", {
    host: input.host,
    share: input.share,
  });
  const host = input.host.trim();
  const share = input.share.replace(/^[\\/]+/, "").trim();

  if (!host || !share) {
    return { success: false, error: "Host and share are required" };
  }

  const shares = await loadShares();
  const devicesDir = path.join(await getHomeRoot(), "Devices");
  const existing = shares.find((s) => s.host === host && s.share === share);

  const mountPath = buildMountPath(devicesDir, host, share, existing, shares);

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
    await logAction("network-storage:add:unreachable", {
      host,
      share,
      error: reach.error,
    });
    return { success: false, error: reach.error, share: await withStatus(record) };
  }

  // Attempt mount immediately
  const mountResult = await mountShare(record);
  if (!mountResult.success) {
    record.lastError = mountResult.error;
    await logAction("network-storage:add:mount-failed", {
      host,
      share,
      error: mountResult.error,
    });
  } else {
    record.lastError = null;
    await logAction("network-storage:add:mounted", { host, share });
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
  credentials?: { username?: string; password?: string },
): Promise<{ success: boolean; share?: NetworkShare; error?: string }> {
  await logAction("network-storage:connect:start", { id });
  const shares = await loadShares();
  const record = shares.find((s) => s.id === id);

  if (!record) {
    return { success: false, error: "Share not found" };
  }

  if (credentials?.username !== undefined) {
    record.username = credentials.username || undefined;
  }
  if (credentials?.password !== undefined) {
    record.password = credentials.password;
  }

  const reach = await checkReachable(record.host);
  if (!reach.ok) {
    record.lastError = reach.error;
    await saveShares(shares.map((s) => (s.id === record.id ? record : s)));
    await logAction("network-storage:connect:unreachable", {
      id,
      host: record.host,
      error: reach.error,
    });
    return { success: false, error: reach.error, share: await withStatus(record) };
  }

  const mountResult = await mountShare(record, credentials?.password);
  if (!mountResult.success) {
    record.lastError = mountResult.error;
    await logAction("network-storage:connect:mount-failed", {
      id,
      host: record.host,
      error: mountResult.error,
    });
  } else {
    record.lastError = null;
    await logAction("network-storage:connect:mounted", {
      id,
      host: record.host,
    });
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
  await logAction("network-storage:disconnect:start", { id });
  const shares = await loadShares();
  const record = shares.find((s) => s.id === id);

  if (!record) {
    return { success: false, error: "Share not found" };
  }

  const result = await unmountAndCleanup(record);
  if (!result.success) {
    record.lastError = result.error;
    await logAction("network-storage:disconnect:failed", {
      id,
      error: result.error,
    });
  } else {
    record.lastError = null;
    await logAction("network-storage:disconnect:done", { id });
  }

  await saveShares(replaceShare(shares, record));

  return {
    success: result.success,
    share: await withStatus(record),
    error: result.success ? undefined : result.error,
  };
}

export async function removeNetworkShare(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  await logAction("network-storage:remove:start", { id });
  const shares = await loadShares();
  const record = shares.find((s) => s.id === id);

  if (!record) {
    return { success: false, error: "Share not found" };
  }

  // Best-effort unmount; ignore failure so the entry can still be removed
  await unmountAndCleanup(record);

  const remaining = shares.filter((s) => s.id !== id);
  await saveShares(remaining);

  await logAction("network-storage:remove:done", { id });
  return { success: true };
}

/**
 * Get detailed information about a discovered server including:
 * - Whether it's a LiveOS device
 * - Available SMB shares
 */
export async function getServerInfo(
  host: string,
  credentials?: { username?: string; password?: string },
): Promise<{
  host: string;
  isLiveOS: boolean;
  liveOSVersion?: string;
  shares: string[];
  requiresAuth: boolean;
  error?: string;
}> {
  await logAction("network-storage:server-info:start", { host });

  // Check if LiveOS device in parallel with share discovery
  const [liveOSCheck, sharesResult] = await Promise.all([
    isLiveOSDevice(host),
    discoverSharesOnServer(host, credentials),
  ]);

  const requiresAuth =
    !sharesResult.success &&
    sharesResult.error?.includes("Authentication") === true;

  await logAction("network-storage:server-info:done", {
    host,
    isLiveOS: liveOSCheck.isLiveOS,
    shares: sharesResult.shares.length,
    requiresAuth,
  });

  return {
    host,
    isLiveOS: liveOSCheck.isLiveOS,
    liveOSVersion: liveOSCheck.version,
    shares: sharesResult.shares,
    requiresAuth,
    error: sharesResult.success ? undefined : sharesResult.error,
  };
}

/**
 * Attempt to reconnect all disconnected shares.
 * Called periodically by the system status websocket or manually.
 */
export async function reconnectDisconnectedShares(): Promise<{
  attempted: number;
  succeeded: number;
  failed: { id: string; host: string; share: string; error: string }[];
}> {
  await logAction("network-storage:reconnect:start");
  const shares = await loadShares();
  const failed: { id: string; host: string; share: string; error: string }[] =
    [];
  let attempted = 0;
  let succeeded = 0;

  for (const share of shares) {
    const mounted = await isMounted(share.mountPath);
    if (mounted) continue;

    attempted++;

    // Quick reachability check first
    const reach = await checkReachable(share.host, 2000);
    if (!reach.ok) {
      share.lastError = reach.error ?? "Host unreachable";
      failed.push({
        id: share.id,
        host: share.host,
        share: share.share,
        error: share.lastError,
      });
      continue;
    }

    const result = await mountShare(share);
    if (result.success) {
      share.lastError = null;
      succeeded++;
    } else {
      const errorMsg = result.error ?? "Mount failed";
      share.lastError = errorMsg;
      failed.push({
        id: share.id,
        host: share.host,
        share: share.share,
        error: errorMsg,
      });
    }
  }

  // Save updated state (lastError fields)
  await saveShares(shares);

  await logAction("network-storage:reconnect:done", {
    attempted,
    succeeded,
    failed: failed.length,
  });

  return { attempted, succeeded, failed };
}
