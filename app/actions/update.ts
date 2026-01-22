"use server";

import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import { logAction } from "./logger";

const execAsync = promisify(exec);

export type UpdateStatus = {
  currentVersion: string;
  remoteVersion?: string;
  hasUpdate: boolean;
  message?: string;
};

/**
 * Check for a newer package.json version on the configured git remote (origin/main).
 * Falls back to local version only if git fetch fails.
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkgRaw = await fs.readFile(pkgPath, "utf-8");
  const currentVersion = JSON.parse(pkgRaw).version as string;

  await logAction("update:check:start", { currentVersion });

  try {
    await execAsync("git fetch --quiet origin");
    const { stdout } = await execAsync(
      "git show origin/main:package.json | jq -r .version",
    );
    const remoteVersion = stdout.trim();
    const hasUpdate =
      Boolean(remoteVersion) &&
      remoteVersion !== "null" &&
      remoteVersion !== "" &&
      remoteVersion !== currentVersion;
    await logAction("update:check", {
      currentVersion,
      remoteVersion,
      hasUpdate,
    });
    return {
      currentVersion,
      remoteVersion,
      hasUpdate,
      message: hasUpdate
        ? `New version available: ${remoteVersion}`
        : "You are on the latest LiveOS.",
    };
  } catch (error) {
    await logAction("update:check:error", {
      error: (error as Error)?.message || "unknown",
    });
    return {
      currentVersion,
      hasUpdate: false,
      message:
        "Could not reach remote repository. You appear to be on the latest local build.",
    };
  }
}
