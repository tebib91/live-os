"use server";

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export type FirewallStatus = {
  enabled: boolean;
  defaultIncoming: "allow" | "deny" | "reject" | "unknown";
  defaultOutgoing: "allow" | "deny" | "reject" | "unknown";
};

export type FirewallRule = {
  id: string;
  to: string;
  action: "ALLOW" | "DENY" | "REJECT" | "LIMIT";
  from: string;
  port?: string;
  protocol?: string;
  direction?: "IN" | "OUT";
  v6?: boolean;
};

export type FirewallStatusResult = {
  status: FirewallStatus;
  rules: FirewallRule[];
  error?: string;
};

/**
 * Get the current firewall status and rules using ufw.
 */
export async function getFirewallStatus(): Promise<FirewallStatusResult> {
  try {
    // Check if ufw is installed
    try {
      await execAsync("command -v ufw");
    } catch {
      return {
        status: {
          enabled: false,
          defaultIncoming: "unknown",
          defaultOutgoing: "unknown",
        },
        rules: [],
        error: "UFW is not installed. Install it with: sudo apt install ufw",
      };
    }

    // Get ufw status verbose
    const { stdout } = await execAsync("sudo ufw status verbose");
    const lines = stdout.split("\n").map((l) => l.trim()).filter(Boolean);

    // Parse status
    const statusLine = lines.find((l) => l.startsWith("Status:"));
    const enabled = statusLine?.includes("active") ?? false;

    // Parse defaults
    let defaultIncoming: FirewallStatus["defaultIncoming"] = "unknown";
    let defaultOutgoing: FirewallStatus["defaultOutgoing"] = "unknown";

    const defaultLine = lines.find((l) => l.startsWith("Default:"));
    if (defaultLine) {
      const match = defaultLine.match(/Default:\s*(\w+)\s*\(incoming\),\s*(\w+)\s*\(outgoing\)/i);
      if (match) {
        defaultIncoming = match[1].toLowerCase() as FirewallStatus["defaultIncoming"];
        defaultOutgoing = match[2].toLowerCase() as FirewallStatus["defaultOutgoing"];
      }
    }

    // Parse rules - find the line that starts with "To"
    const rules: FirewallRule[] = [];
    const headerIndex = lines.findIndex((l) => l.startsWith("To"));

    if (headerIndex !== -1 && enabled) {
      // Skip header and separator
      const ruleLines = lines.slice(headerIndex + 2);

      for (let i = 0; i < ruleLines.length; i++) {
        const line = ruleLines[i];
        if (!line || line.startsWith("--")) continue;

        const rule = parseRuleLine(line, i);
        if (rule) {
          rules.push(rule);
        }
      }
    }

    return {
      status: {
        enabled,
        defaultIncoming,
        defaultOutgoing,
      },
      rules,
    };
  } catch (error) {
    console.error("[firewall] getFirewallStatus failed:", error);
    const err = error as Error;

    // Check for permission error
    if (err.message?.includes("permission denied") || err.message?.includes("sudo")) {
      return {
        status: {
          enabled: false,
          defaultIncoming: "unknown",
          defaultOutgoing: "unknown",
        },
        rules: [],
        error: "Permission denied. LiveOS needs sudo access to manage the firewall.",
      };
    }

    return {
      status: {
        enabled: false,
        defaultIncoming: "unknown",
        defaultOutgoing: "unknown",
      },
      rules: [],
      error: err.message || "Failed to get firewall status",
    };
  }
}

/**
 * Parse a single rule line from ufw status verbose output.
 */
function parseRuleLine(line: string, index: number): FirewallRule | null {
  // Format: "22/tcp                     ALLOW IN    Anywhere"
  // Or:     "80                         ALLOW       192.168.1.0/24"
  // Or:     "Anywhere                   ALLOW       192.168.1.100"

  const parts = line.split(/\s{2,}/);
  if (parts.length < 3) return null;

  const [to, actionDir, from] = parts;

  // Parse action and direction
  const actionMatch = actionDir.match(/^(ALLOW|DENY|REJECT|LIMIT)(?:\s+(IN|OUT))?$/i);
  if (!actionMatch) return null;

  const action = actionMatch[1].toUpperCase() as FirewallRule["action"];
  const direction = actionMatch[2]?.toUpperCase() as FirewallRule["direction"] | undefined;

  // Parse port and protocol from "to" field
  let port: string | undefined;
  let protocol: string | undefined;
  const v6 = to.includes("(v6)") || from.includes("(v6)");

  const portMatch = to.match(/^(\d+(?::\d+)?)(\/(\w+))?/);
  if (portMatch) {
    port = portMatch[1];
    protocol = portMatch[3];
  }

  return {
    id: `rule-${index}`,
    to: to.replace(/\s*\(v6\)/, ""),
    action,
    from: from.replace(/\s*\(v6\)/, ""),
    port,
    protocol,
    direction,
    v6,
  };
}

/**
 * Enable the firewall.
 */
export async function enableFirewall(): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync("sudo ufw --force enable");
    return { success: true };
  } catch (error) {
    console.error("[firewall] enableFirewall failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to enable firewall",
    };
  }
}

/**
 * Disable the firewall.
 */
export async function disableFirewall(): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync("sudo ufw disable");
    return { success: true };
  } catch (error) {
    console.error("[firewall] disableFirewall failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to disable firewall",
    };
  }
}

/**
 * Add a firewall rule.
 */
export async function addFirewallRule(params: {
  port: string;
  protocol?: "tcp" | "udp" | "any";
  action?: "allow" | "deny" | "reject" | "limit";
  from?: string;
  to?: string;
  direction?: "in" | "out";
}): Promise<{ success: boolean; error?: string }> {
  const { port, protocol = "any", action = "allow", from, direction = "in" } = params;

  // Validate port
  if (!port || !/^(\d+)(:\d+)?$/.test(port)) {
    return { success: false, error: "Invalid port format. Use a number or range (e.g., 80 or 8000:8080)" };
  }

  const portNum = parseInt(port.split(":")[0], 10);
  if (portNum < 1 || portNum > 65535) {
    return { success: false, error: "Port must be between 1 and 65535" };
  }

  try {
    // Build the ufw command
    let cmd = `sudo ufw ${action}`;

    if (direction === "out") {
      cmd += " out";
    }

    if (from && from !== "any") {
      cmd += ` from ${from}`;
    }

    cmd += ` to any port ${port}`;

    if (protocol !== "any") {
      cmd += ` proto ${protocol}`;
    }

    await execAsync(cmd);
    return { success: true };
  } catch (error) {
    console.error("[firewall] addFirewallRule failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to add firewall rule",
    };
  }
}

/**
 * Delete a firewall rule by number.
 */
export async function deleteFirewallRule(ruleNumber: number): Promise<{ success: boolean; error?: string }> {
  if (ruleNumber < 1) {
    return { success: false, error: "Invalid rule number" };
  }

  try {
    await execAsync(`sudo ufw --force delete ${ruleNumber}`);
    return { success: true };
  } catch (error) {
    console.error("[firewall] deleteFirewallRule failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to delete firewall rule",
    };
  }
}

/**
 * Set the default policy for incoming or outgoing traffic.
 */
export async function setDefaultPolicy(
  direction: "incoming" | "outgoing",
  policy: "allow" | "deny" | "reject"
): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync(`sudo ufw default ${policy} ${direction}`);
    return { success: true };
  } catch (error) {
    console.error("[firewall] setDefaultPolicy failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to set default policy",
    };
  }
}

/**
 * Reset the firewall to default state.
 */
export async function resetFirewall(): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync("sudo ufw --force reset");
    return { success: true };
  } catch (error) {
    console.error("[firewall] resetFirewall failed:", error);
    return {
      success: false,
      error: (error as Error)?.message || "Failed to reset firewall",
    };
  }
}
