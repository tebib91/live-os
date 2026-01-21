"use server";

import { execFile } from "child_process";
import si from "systeminformation";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const EXEC_TIMEOUT = 8000;

export type WifiNetwork = {
  ssid: string;
  security: string;
  signal: number;
  connected?: boolean;
};

export type WifiListResult = {
  networks: WifiNetwork[];
  error?: string;
  warning?: string;
};

export type LanDevice = {
  ip: string;
  name?: string;
  mac?: string;
  source: "avahi" | "arp";
};

export type LanDevicesResult = {
  devices: LanDevice[];
  error?: string;
};

function dedupeNetworks(networks: WifiNetwork[]): WifiNetwork[] {
  const strongestBySsid = new Map<string, WifiNetwork>();

  for (const network of networks) {
    const existing = strongestBySsid.get(network.ssid);
    if (!existing || network.signal > existing.signal) {
      strongestBySsid.set(network.ssid, network);
    } else if (existing) {
      // Preserve connected flag if any duplicate reports a connection
      strongestBySsid.set(network.ssid, {
        ...existing,
        connected: existing.connected || network.connected,
      });
    }
  }

  return Array.from(strongestBySsid.values()).sort(
    (a, b) => b.signal - a.signal,
  );
}

function sanitizeSsid(value: string): string {
  return value
    .replace(/^nmcli\s*/i, "")
    .replace(/^"+|"+$/g, "")
    .trim();
}

export async function listWifiNetworks(): Promise<WifiListResult> {
  console.log("[network] listWifiNetworks called");
  const errors: string[] = [];
  const connectedSsids = new Set<string>();

  // Try to detect the currently connected SSID
  try {
    if (typeof si.wifiConnections === "function") {
      const connections = await si.wifiConnections();
      connections?.forEach((conn) => {
        if (conn?.ssid) connectedSsids.add(conn.ssid);
      });
    }
  } catch {
    // Ignore connection detection failures
  }

  // Try systeminformation first with timeout
  try {
    console.log("[network] Trying systeminformation...");
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout after 5s")), 5000),
    );
    const wifiNetworks = await Promise.race([
      si.wifiNetworks(),
      timeoutPromise,
    ]);
    console.log("[network] systeminformation result:", wifiNetworks);
    if (Array.isArray(wifiNetworks) && wifiNetworks.length > 0) {
      return {
        networks: dedupeNetworks(
          wifiNetworks
            .map((network) => ({
              ssid: sanitizeSsid(network.ssid || ""),
              security: Array.isArray(network.security)
                ? network.security.join(", ")
                : network.security || "",
              signal: Number(network.quality ?? network.signalLevel ?? 0) || 0,
              connected: connectedSsids.has(sanitizeSsid(network.ssid || "")),
            }))
            .filter((n) => n.ssid),
        ),
      };
    }
    console.log("[network] systeminformation returned empty, trying nmcli...");
  } catch (error) {
    const msg = (error as Error)?.message || "Unknown error";
    console.error("[network] systeminformation failed:", msg);
    errors.push(`systeminformation: ${msg}`);
  }

  // Fallback to nmcli if systeminformation fails or returns nothing
  try {
    console.log("[network] Trying nmcli...");
    // Force rescan before listing
    try {
      await execFileAsync("nmcli", ["device", "wifi", "rescan"], {
        timeout: EXEC_TIMEOUT,
      });
      // Wait a moment for scan to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      // Rescan might fail if already scanning, continue anyway
    }

    const { stdout, stderr } = await execFileAsync(
      "nmcli",
      ["-t", "-f", "ACTIVE,SSID,SECURITY,SIGNAL", "device", "wifi", "list"],
      {
        timeout: EXEC_TIMEOUT,
      },
    );

    console.log("[network] nmcli stdout:", stdout);
    if (stderr) {
      console.warn("[network] nmcli stderr:", stderr);
    }

    const networks = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [active = "", ssid = "", security = "", signal = "0"] =
          line.split(":");
        const isActive =
          active.toLowerCase() === "yes" || active === "1" || active === "true";
        const cleanSsid = sanitizeSsid(ssid);
        if (isActive && cleanSsid) connectedSsids.add(cleanSsid);
        return {
          ssid: cleanSsid,
          security,
          signal: Number(signal) || 0,
          connected: isActive,
        };
      })
      .filter((n) => n.ssid)
      .sort((a, b) => b.signal - a.signal);

    console.log("[network] Parsed networks:", networks.length);

    if (networks.length === 0) {
      return {
        networks: [],
        warning:
          "No WiFi networks found. This could mean:\n• No WiFi adapter detected\n• WiFi is disabled\n• No networks in range",
      };
    }

    return { networks: dedupeNetworks(networks) };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.error("[network] nmcli failed:", err.message);

    if (err.code === "ENOENT") {
      errors.push("nmcli: command not found (NetworkManager not installed)");
    } else if (err.message?.includes("No Wi-Fi device found")) {
      return {
        networks: [],
        error: "No WiFi adapter found on this system.",
      };
    } else if (err.message?.includes("not running")) {
      errors.push("nmcli: NetworkManager is not running");
    } else {
      errors.push(`nmcli: ${err.message || "Unknown error"}`);
    }
  }

  // Both methods failed
  return {
    networks: [],
    error: `Failed to scan WiFi networks.\n${errors.join("\n")}`,
  };
}

export async function connectToWifi(
  ssid: string,
  password?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!ssid.trim()) {
    return { success: false, error: "SSID is required" };
  }

  const args = ["device", "wifi", "connect", ssid];
  if (password && password.trim().length > 0) {
    args.push("password", password.trim());
  }

  try {
    await execFileAsync("nmcli", args, { timeout: EXEC_TIMEOUT });
    return { success: true };
  } catch (error) {
    console.error("[network] connectToWifi failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to connect",
    };
  }
}

/**
 * Discover LAN devices using avahi-browse (mDNS) and arp/arp-scan.
 * Returns a deduped list of devices with best-effort names and IPs.
 */
export async function listLanDevices(): Promise<LanDevicesResult> {
  console.log("[network] listLanDevices: starting discovery");
  const devices = new Map<string, LanDevice>(); // key by IP
  const errors: string[] = [];

  // mDNS via avahi-browse
  try {
    const { stdout } = await execFileAsync("avahi-browse", ["-art"], {
      timeout: EXEC_TIMEOUT,
    });
    stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("="))
      .forEach((line) => {
        const parts = line.split(";");
        // Expected: =;iface;PROTO;NAME;TYPE;DOMAIN;HOST;ADDRESS;PORT;
        if (parts.length >= 8) {
          const name = parts[3];
          const host = parts[6]?.replace(/\.local\.?$/, "") || name;
          const ip = parts[7];
          if (ip) {
            const existing = devices.get(ip);
            if (!existing) {
              devices.set(ip, {
                ip,
                name: host || name,
                source: "avahi",
              });
            } else if (!existing.name && (host || name)) {
              devices.set(ip, { ...existing, name: host || name });
            }
          }
        }
      });
  } catch (error) {
    const message = (error as Error)?.message || "failed";
    errors.push(`avahi-browse: ${message}`);
  }

  // ARP scan (arp-scan or arp -a)
  const addArpEntry = (ip: string, mac?: string) => {
    if (!ip) return;
    const existing = devices.get(ip);
    if (existing) {
      devices.set(ip, { ...existing, mac: existing.mac ?? mac });
    } else {
      devices.set(ip, { ip, mac, source: "arp" });
    }
  };

  try {
    const { stdout } = await execFileAsync(
      "arp-scan",
      ["-l", "--numeric", "--plain"],
      { timeout: EXEC_TIMEOUT },
    );
    stdout
      .split("\n")
      .map((line) => line.trim())
      .forEach((line) => {
        // Format: IP<TAB>MAC<TAB>VENDOR
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && parts[0].match(/^\d{1,3}(\.\d{1,3}){3}$/)) {
          addArpEntry(parts[0], parts[1]);
        }
      });
  } catch {
    // Fallback to arp -a
    try {
      const { stdout } = await execFileAsync("arp", ["-a"], {
        timeout: EXEC_TIMEOUT,
      });
      stdout
        .split("\n")
        .map((line) => line.trim())
        .forEach((line) => {
          // Format: ? (192.168.1.1) at aa:bb:cc:dd:ee:ff [ether] on eth0
          const match = line.match(
            /\((\d{1,3}(?:\.\d{1,3}){3})\).*? at ([0-9a-f:]{11,})/i,
          );
          if (match) {
            addArpEntry(match[1], match[2]);
          }
        });
    } catch (err: unknown) {
      const message = (err as Error)?.message || "failed";
      errors.push(`arp: ${message}`);
    }
  }

  const result = Array.from(devices.values()).sort((a, b) =>
    a.ip.localeCompare(b.ip),
  );

  console.log(`[network] listLanDevices: returning ${result.length} device(s)`);

  return {
    devices: result,
    error: errors.length ? errors.join("; ") : undefined,
  };
}
