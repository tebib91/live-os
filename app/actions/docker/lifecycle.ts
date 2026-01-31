"use server";

import {
  pollAndBroadcast,
  sendInstallProgress,
  type InstallProgressPayload,
} from "@/app/api/system/stream/route";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import fs from "fs/promises";
import path from "path";
import { logAction } from "../logger";
import { backupComposeFile, cleanupBackup, restoreComposeFile } from "./backup";
import {
  getAppMeta,
  getRecordedContainerName,
  removeInstalledAppRecord,
} from "./db";
import { waitForContainerRunning } from "./health";
import {
  DEFAULT_APP_ICON,
  execAsync,
  findComposeForApp,
  getContainerName,
  sanitizeComposeFile,
  validateAppId,
} from "./utils";

const TRASH_ROOT = "/DATA/AppTrash";

/**
 * Run a compose lifecycle command (start/stop/restart) if a compose file exists.
 * Falls back to plain docker command for legacy containers.
 */
async function composeLifecycle(
  appId: string,
  action: "start" | "stop" | "restart",
): Promise<boolean> {
  const resolved = await findComposeForApp(appId);
  if (resolved) {
    const sanitized = await sanitizeComposeFile(resolved.composePath);
    console.log(
      `[Docker] ${action}App: Using compose for "${appId}" at ${sanitized}`,
    );
    await execAsync(
      `cd "${resolved.appDir}" && docker compose -f "${sanitized}" ${action}`,
    );
    return true;
  }
  return false;
}

/**
 * Stop an app
 */
export async function stopApp(containerName: string): Promise<boolean> {
  console.log(`[Docker] stopApp: Stopping app "${containerName}"...`);

  try {
    if (!validateAppId(containerName)) {
      console.warn(`[Docker] stopApp: Invalid app ID: "${containerName}"`);
      return false;
    }

    const usedCompose = await composeLifecycle(containerName, "stop");
    if (!usedCompose) {
      await execAsync(`docker stop ${containerName}`);
    }

    console.log(`[Docker] stopApp: Successfully stopped "${containerName}"`);
    void pollAndBroadcast();
    return true;
  } catch (error) {
    console.error(
      `[Docker] stopApp: Error stopping "${containerName}":`,
      error,
    );
    return false;
  }
}

/**
 * Start an app
 */
export async function startApp(containerName: string): Promise<boolean> {
  console.log(`[Docker] startApp: Starting app "${containerName}"...`);

  try {
    if (!validateAppId(containerName)) {
      console.warn(`[Docker] startApp: Invalid app ID: "${containerName}"`);
      return false;
    }

    const usedCompose = await composeLifecycle(containerName, "start");
    if (!usedCompose) {
      await execAsync(`docker start ${containerName}`);
    }

    const healthy = await waitForContainerRunning(containerName, 5, 2000);
    if (!healthy) {
      console.warn(
        `[Docker] startApp: Container "${containerName}" not running after start`,
      );
      return false;
    }
    console.log(`[Docker] startApp: Successfully started "${containerName}"`);
    void pollAndBroadcast();
    return true;
  } catch (error) {
    console.error(
      `[Docker] startApp: Error starting "${containerName}":`,
      error,
    );
    return false;
  }
}

/**
 * Restart an app
 */
export async function restartApp(containerName: string): Promise<boolean> {
  console.log(`[Docker] restartApp: Restarting app "${containerName}"...`);

  try {
    if (!validateAppId(containerName)) {
      console.warn(`[Docker] restartApp: Invalid app ID: "${containerName}"`);
      return false;
    }

    const usedCompose = await composeLifecycle(containerName, "restart");
    if (!usedCompose) {
      await execAsync(`docker restart ${containerName}`);
    }

    const healthy = await waitForContainerRunning(containerName, 5, 2000);
    if (!healthy) {
      console.warn(
        `[Docker] restartApp: Container "${containerName}" not running after restart`,
      );
      return false;
    }
    console.log(
      `[Docker] restartApp: Successfully restarted "${containerName}"`,
    );
    void pollAndBroadcast();
    return true;
  } catch (error) {
    console.error(
      `[Docker] restartApp: Error restarting "${containerName}":`,
      error,
    );
    return false;
  }
}

/**
 * Update an app by pulling new images and recreating containers
 */
export async function updateApp(containerName: string): Promise<boolean> {
  if (!validateAppId(containerName)) return false;

  let meta = { name: containerName, icon: DEFAULT_APP_ICON };
  try {
    meta = await getAppMeta(containerName);
  } catch {
    // Use fallback meta
  }

  const emitProgress = (
    progress: number,
    message: string,
    status: InstallProgressPayload["status"] = "running",
  ) =>
    sendInstallProgress({
      type: "install-progress",
      containerName,
      name: meta.name,
      icon: meta.icon,
      progress,
      status,
      message,
    });

  emitProgress(0.05, "Starting update", "starting");

  const resolved = await findComposeForApp(containerName);
  if (!resolved) {
    console.warn(`[Docker] updateApp: compose not found for ${containerName}`);
    emitProgress(1, "Compose file not found", "error");
    return false;
  }

  const backupPath = await backupComposeFile(
    resolved.composePath,
    containerName,
  );

  try {
    const sanitized = await sanitizeComposeFile(resolved.composePath);
    const envVars: NodeJS.ProcessEnv = {
      ...process.env,
      CONTAINER_NAME: containerName,
    };

    emitProgress(0.2, "Pulling latest images");
    await execAsync(
      `cd "${resolved.appDir}" && docker compose -f "${sanitized}" pull`,
      { env: envVars },
    );

    emitProgress(0.6, "Recreating containers");
    await execAsync(
      `cd "${resolved.appDir}" && docker compose -f "${sanitized}" up -d`,
      { env: envVars },
    );

    emitProgress(0.85, "Verifying container health");
    const healthy = await waitForContainerRunning(containerName, 5, 2000);
    if (!healthy) {
      console.warn(
        `[Docker] updateApp: container not healthy after update for ${containerName}`,
      );

      // Attempt rollback
      if (backupPath) {
        emitProgress(0.9, "Rolling back to previous version");
        await restoreComposeFile(backupPath, resolved.composePath);
        const rollbackSanitized = await sanitizeComposeFile(
          resolved.composePath,
        );
        await execAsync(
          `cd "${resolved.appDir}" && docker compose -f "${rollbackSanitized}" up -d`,
          { env: envVars },
        ).catch(() => null);
      }

      await cleanupBackup(containerName);
      emitProgress(1, "Rolled back after failed update", "error");
      await logAction("update:error", {
        containerName,
        error: "Container not healthy, rolled back",
      });
      return false;
    }

    await cleanupBackup(containerName);
    await triggerAppsUpdate();
    await logAction("update:success", { containerName });
    emitProgress(1, "Update complete", "completed");
    return true;
  } catch (error) {
    console.error(`[Docker] updateApp: failed for ${containerName}:`, error);

    // Attempt rollback on exception
    if (backupPath) {
      await restoreComposeFile(backupPath, resolved.composePath).catch(
        () => null,
      );
      const envVars: NodeJS.ProcessEnv = {
        ...process.env,
        CONTAINER_NAME: containerName,
      };
      const rollbackSanitized = await sanitizeComposeFile(
        resolved.composePath,
      ).catch(() => resolved.composePath);
      await execAsync(
        `cd "${resolved.appDir}" && docker compose -f "${rollbackSanitized}" up -d`,
        { env: envVars },
      ).catch(() => null);
    }
    await cleanupBackup(containerName);

    const errorMsg = (error as Error)?.message ?? "unknown";
    await logAction("update:error", { containerName, error: errorMsg });
    emitProgress(1, "Update failed, rolled back", "error");
    return false;
  }
}

/**
 * Uninstall an app (remove container and volumes)
 */
export async function uninstallApp(appId: string): Promise<boolean> {
  console.log(`[Docker] uninstallApp: Uninstalling app "${appId}"...`);

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] uninstallApp: Invalid app ID: "${appId}"`);
      return false;
    }

    const recordedContainer = await getRecordedContainerName(appId);
    const generatedContainer = getContainerName(appId);
    const containerCandidates = Array.from(
      new Set([recordedContainer, generatedContainer].filter(Boolean)),
    ) as string[];

    // Try docker compose down (covers multiple service names)
    const resolved = await findComposeForApp(appId);
    if (resolved) {
      try {
        const sanitizedCompose = await sanitizeComposeFile(
          resolved.composePath,
        );
        console.log(
          `[Docker] uninstallApp: docker compose down for "${appId}" at ${sanitizedCompose}`,
        );
        await execAsync(
          `cd "${resolved.appDir}" && docker compose -f "${sanitizedCompose}" down -v --remove-orphans`,
        );
      } catch (composeErr) {
        console.warn(
          `[Docker] uninstallApp: compose down failed for "${appId}":`,
          composeErr,
        );
      }
    }

    // Explicitly remove any remaining candidate containers
    for (const name of containerCandidates) {
      try {
        console.log(`[Docker] uninstallApp: Removing container "${name}"...`);
        await execAsync(`docker rm -f ${name}`);
      } catch (err) {
        console.warn(
          `[Docker] uninstallApp: Failed to remove container "${name}":`,
          err,
        );
      }
    }

    const appDataPath = path.join("/DATA/AppData", appId);
    try {
      const trashDir = path.join(TRASH_ROOT, `${appId}_${Date.now()}`);
      await fs.mkdir(TRASH_ROOT, { recursive: true });
      await fs.rename(appDataPath, trashDir);
      console.log(`[Docker] uninstallApp: Moved data to trash ${trashDir}`);
    } catch {
      // rename may fail cross-device; fall back to permanent delete
      try {
        await fs.rm(appDataPath, { recursive: true, force: true });
        console.log(`[Docker] uninstallApp: Removed data dir ${appDataPath}`);
      } catch (cleanupError) {
        console.warn(
          `[Docker] uninstallApp: Failed to remove data dir ${appDataPath}:`,
          cleanupError,
        );
      }
    }

    for (const name of containerCandidates) {
      await removeInstalledAppRecord(name);
    }
    await triggerAppsUpdate();
    void pollAndBroadcast();

    console.log(`[Docker] uninstallApp: Successfully uninstalled "${appId}"`);
    return true;
  } catch (error) {
    console.error(
      `[Docker] uninstallApp: Error uninstalling "${appId}":`,
      error,
    );
    return false;
  }
}

/**
 * List apps in the trash directory.
 */
export async function listTrashedApps(): Promise<
  { appId: string; trashedAt: number; path: string }[]
> {
  try {
    const entries = await fs.readdir(TRASH_ROOT, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const parts = e.name.split("_");
        const timestamp = parseInt(parts[parts.length - 1], 10);
        const appId = parts.slice(0, -1).join("_");
        return {
          appId,
          trashedAt: Number.isFinite(timestamp) ? timestamp : 0,
          path: path.join(TRASH_ROOT, e.name),
        };
      });
  } catch {
    return [];
  }
}

/**
 * Permanently delete a specific trashed app or the entire trash.
 */
export async function emptyTrash(appId?: string): Promise<boolean> {
  try {
    if (appId) {
      const entries = await fs.readdir(TRASH_ROOT).catch(() => [] as string[]);
      for (const entry of entries) {
        if (entry.startsWith(`${appId}_`)) {
          await fs.rm(path.join(TRASH_ROOT, entry), {
            recursive: true,
            force: true,
          });
        }
      }
    } else {
      await fs.rm(TRASH_ROOT, { recursive: true, force: true });
    }
    return true;
  } catch {
    return false;
  }
}
