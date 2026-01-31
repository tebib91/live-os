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
  aheadOfRemote?: boolean;
};

/**
 * Check for a newer version using git tags (preferred) and origin/main package.json (fallback).
 * Compares semantic versions and only reports an update when remote > current.
 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  const pkgPath = path.join(process.cwd(), "package.json");
  const pkgRaw = await fs.readFile(pkgPath, "utf-8");
  const currentVersion = JSON.parse(pkgRaw).version as string;

  await logAction("update:check:start", { currentVersion });

  const stripV = (value: string) => value.replace(/^v/i, "");
  const parseVersion = (value: string) =>
    stripV(value)
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);

  const compareSemver = (a: string, b: string) => {
    const aa = parseVersion(a);
    const bb = parseVersion(b);
    const len = Math.max(aa.length, bb.length);
    for (let i = 0; i < len; i += 1) {
      const diff = (aa[i] ?? 0) - (bb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  };

  const getLatestTagVersion = async () => {
    try {
      await execAsync("git fetch --tags --quiet origin");
      const { stdout } = await execAsync(
        "git ls-remote --tags --refs origin | awk '{print $2}'",
      );
      const tags = stdout
        .split("\n")
        .map((ref) => ref.trim())
        .filter(Boolean)
        .map((ref) => ref.replace(/^refs\/tags\//, ""))
        // Drop lightweight tag deref suffix
        .map((ref) => ref.replace(/\^\{\}$/, ""))
        .filter((tag) => /^v?\d+\.\d+\.\d+/.test(tag));

      if (tags.length === 0) return null;

      const latest = tags.reduce((best, tag) => {
        if (!best) return tag;
        return compareSemver(tag, best) > 0 ? tag : best;
      }, "");

      return latest || null;
    } catch (error) {
      await logAction("update:check:tags:error", {
        error: (error as Error)?.message || "unknown",
      });
      return null;
    }
  };

  const getMainPackageVersion = async () => {
    try {
      await execAsync("git fetch --quiet origin");
      const { stdout } = await execAsync(
        "git show origin/main:package.json",
      );
      const remotePkg = JSON.parse(stdout);
      return remotePkg.version as string | undefined;
    } catch (error) {
      await logAction("update:check:main:error", {
        error: (error as Error)?.message || "unknown",
      });
      return undefined;
    }
  };

  try {
    const tagVersion = await getLatestTagVersion();
    const fallbackVersion = await getMainPackageVersion();
    const remoteVersion = tagVersion || fallbackVersion;

    if (!remoteVersion) {
      return {
        currentVersion,
        hasUpdate: false,
        message:
          "Could not determine remote version. You appear to be on the latest local build.",
      };
    }

    const cmp = compareSemver(remoteVersion, currentVersion);
    const hasUpdate = cmp > 0;
    const aheadOfRemote = cmp < 0;

    await logAction("update:check", {
      currentVersion,
      remoteVersion,
      hasUpdate,
      aheadOfRemote,
      source: tagVersion ? "tag" : "main-package",
    });

    return {
      currentVersion,
      remoteVersion,
      hasUpdate,
      aheadOfRemote,
      message: hasUpdate
        ? `Update available: ${remoteVersion} (installed ${currentVersion})`
        : aheadOfRemote
        ? `You are ahead of the latest release (${currentVersion} > ${remoteVersion}).`
        : `You are on the latest LiveOS (${currentVersion}).`,
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
