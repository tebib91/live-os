"use server";

import { exec } from "child_process";
import { promisify } from "util";
import si from "systeminformation";
import { withActionLogging } from "./logger";

const execAsync = promisify(exec);

export type StorageInfo = {
  disks: si.Systeminformation.DiskLayoutData[];
  partitions: si.Systeminformation.BlockDevicesData[];
  volumes: si.Systeminformation.FsSizeData[];
  dfOutput: string | null;
  lsblkOutput: string | null;
};

export async function getStorageInfo(): Promise<StorageInfo> {
  return withActionLogging("storage:inspect", async () => {
    const [disks, partitions, volumes, dfOutput, lsblkOutput] = await Promise.all([
      si.diskLayout().catch(() => []),
      si.blockDevices().catch(() => []),
      si.fsSize().catch(() => []),
      runCommandSafe("df -h"),
      runCommandSafe("lsblk -f"),
    ]);

    return {
      disks,
      partitions,
      volumes,
      dfOutput,
      lsblkOutput,
    };
  });
}

async function runCommandSafe(command: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(command, { maxBuffer: 512 * 1024 });
    return stdout.trim();
  } catch (error) {
    console.warn(`[storage] Failed to run command ${command}:`, error);
    return null;
  }
}
