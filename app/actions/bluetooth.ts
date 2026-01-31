"use server";

import { execFile } from "child_process";
import { promisify } from "util";
import { logAction } from "./logger";

const execFileAsync = promisify(execFile);
const EXEC_TIMEOUT_MS = 6000;

export type BluetoothStatus = {
  available: boolean;
  powered: boolean;
  blocked: boolean;
  adapter?: string | null;
  error?: string | null;
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

async function runCommand(cmd: string, args: string[]): Promise<CommandResult> {
  const result = await execFileAsync(cmd, args, { timeout: EXEC_TIMEOUT_MS });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function detectAdapter(): Promise<string | null> {
  try {
    const { stdout } = await runCommand("bluetoothctl", ["list"]);
    const line = stdout
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("Controller"));

    const match = line?.match(/Controller\s+([0-9A-F:]{2}(:[0-9A-F]{2}){5})/i);
    return match?.[1] ?? null;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    return null;
  }
}

async function readRfkillBlocked(): Promise<boolean | null> {
  try {
    const { stdout } = await runCommand("rfkill", ["list", "bluetooth"]);
    const soft = stdout.match(/Soft blocked:\s*(yes|no)/i);
    const hard = stdout.match(/Hard blocked:\s*(yes|no)/i);

    const softBlocked = soft?.[1]?.toLowerCase() === "yes";
    const hardBlocked = hard?.[1]?.toLowerCase() === "yes";
    return Boolean(softBlocked || hardBlocked);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    return null;
  }
}

async function readBluetoothctlState(
  adapter?: string | null,
): Promise<BluetoothStatus> {
  try {
    const args = adapter ? ["show", adapter] : ["show"];
    const { stdout } = await runCommand("bluetoothctl", args);

    if (/No default controller available/i.test(stdout)) {
      return {
        available: false,
        powered: false,
        blocked: false,
        adapter: adapter ?? null,
        error: "No Bluetooth controller available",
      };
    }

    const powered = /Powered:\s*(yes|on)/i.test(stdout);
    const blocked = /Blocked:\s*yes/i.test(stdout);
    const adapterMatch =
      adapter ??
      stdout.match(/Controller\s+([0-9A-F:]{2}(:[0-9A-F]{2}){5})/i)?.[1] ??
      null;

    return {
      available: true,
      powered,
      blocked,
      adapter: adapterMatch,
      error: null,
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return {
        available: false,
        powered: false,
        blocked: false,
        adapter: adapter ?? null,
        error: "bluetoothctl not found. Install bluez utilities.",
      };
    }

    return {
      available: false,
      powered: false,
      blocked: false,
      adapter: adapter ?? null,
      error: err.message || "Failed to read Bluetooth status",
    };
  }
}

export async function getBluetoothStatus(): Promise<BluetoothStatus> {
  const adapter = await detectAdapter();
  const baseState = await readBluetoothctlState(adapter);
  const rfkill = await readRfkillBlocked();

  return {
    ...baseState,
    blocked: baseState.blocked || rfkill === true,
  };
}

export async function setBluetoothPower(
  enabled: boolean,
): Promise<{ success: boolean; status: BluetoothStatus; error?: string }> {
  const adapter = await detectAdapter();
  const unavailableStatus: BluetoothStatus = {
    available: false,
    powered: false,
    blocked: false,
    adapter,
    error: adapter
      ? "Bluetooth adapter detected but bluetoothctl not available"
      : "No Bluetooth adapter detected",
  };

  if (!adapter) {
    return { success: false, status: unavailableStatus, error: unavailableStatus.error ?? undefined };
  }

  await logAction("bluetooth:power:set", { target: enabled, adapter });

  let commandError: string | undefined;

  try {
    // Ensure the intended adapter is the default target
    await runCommand("bluetoothctl", ["select", adapter]).catch(() => undefined);
    await runCommand("bluetoothctl", ["power", enabled ? "on" : "off"]);

    if (!enabled) {
      // rfkill block provides a more definitive "off" on Linux
      await runCommand("rfkill", ["block", "bluetooth"]).catch(() => undefined);
    }
  } catch (error) {
    commandError = (error as Error)?.message || "Failed to set Bluetooth power";

    try {
      if (enabled) {
        await runCommand("rfkill", ["unblock", "bluetooth"]);
      } else {
        await runCommand("rfkill", ["block", "bluetooth"]);
      }
    } catch {
      // Ignore fallback failures; status check below will reveal outcome.
    }
  }

  const status = await getBluetoothStatus();
  const success = status.powered === enabled;

  return {
    success,
    status,
    error: success ? undefined : commandError ?? status.error ?? "Bluetooth state did not change",
  };
}
