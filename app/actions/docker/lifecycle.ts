"use server";

import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import fs from "fs/promises";
import path from "path";
import { logAction } from "../logger";
import { removeInstalledAppRecord } from "./db";
import {
  execAsync,
  findComposeForApp,
  getContainerName,
  sanitizeComposeFile,
  validateAppId,
} from "./utils";

/**
 * Stop an app
 */
export async function stopApp(appId: string): Promise<boolean> {
  console.log(`[Docker] stopApp: Stopping app "${appId}"...`);

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] stopApp: Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(`[Docker] stopApp: Container name: ${containerName}`);
    console.log(`[Docker] stopApp: Executing: docker stop ${containerName}`);

    await execAsync(`docker stop ${containerName}`);
    console.log(`[Docker] stopApp: Successfully stopped "${appId}"`);
    return true;
  } catch (error) {
    console.error(`[Docker] stopApp: Error stopping "${appId}":`, error);
    return false;
  }
}

/**
 * Start an app
 */
export async function startApp(appId: string): Promise<boolean> {
  console.log(`[Docker] startApp: Starting app "${appId}"...`);

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] startApp: Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(`[Docker] startApp: Container name: ${containerName}`);
    console.log(`[Docker] startApp: Executing: docker start ${containerName}`);

    await execAsync(`docker start ${containerName}`);
    console.log(`[Docker] startApp: Successfully started "${appId}"`);
    return true;
  } catch (error) {
    console.error(`[Docker] startApp: Error starting "${appId}":`, error);
    return false;
  }
}

/**
 * Restart an app
 */
export async function restartApp(appId: string): Promise<boolean> {
  console.log(`[Docker] restartApp: Restarting app "${appId}"...`);

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] restartApp: Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(`[Docker] restartApp: Container name: ${containerName}`);
    console.log(
      `[Docker] restartApp: Executing: docker restart ${containerName}`
    );

    await execAsync(`docker restart ${containerName}`);
    console.log(`[Docker] restartApp: Successfully restarted "${appId}"`);
    return true;
  } catch (error) {
    console.error(
      `[Docker] restartApp: Error restarting "${appId}":`,
      error
    );
    return false;
  }
}

/**
 * Update an app by pulling new images and recreating containers
 */
export async function updateApp(appId: string): Promise<boolean> {
  if (!validateAppId(appId)) return false;
  const resolved = await findComposeForApp(appId);
  if (!resolved) {
    console.warn(`[Docker] updateApp: compose not found for ${appId}`);
    return false;
  }

  try {
    const sanitized = await sanitizeComposeFile(resolved.composePath);
    const containerName = getContainerName(appId);
    const envVars: NodeJS.ProcessEnv = {
      ...process.env,
      CONTAINER_NAME: containerName,
    };
    await execAsync(
      `cd "${resolved.appDir}" && docker compose -f "${sanitized}" pull`,
      { env: envVars },
    );
    await execAsync(
      `cd "${resolved.appDir}" && docker compose -f "${sanitized}" up -d`,
      { env: envVars },
    );
    await triggerAppsUpdate();
    await logAction("update:success", { appId, containerName });
    return true;
  } catch (error) {
    console.error(`[Docker] updateApp: failed for ${appId}:`, error);
    await logAction("update:error", {
      appId,
      error: (error as Error)?.message ?? "unknown",
    });
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

    const containerName = getContainerName(appId);
    console.log(
      `[Docker] uninstallApp: Removing container "${containerName}"...`
    );
    await execAsync(`docker rm -f ${containerName}`);

    const appDataPath = path.join("/DATA/AppData", appId);
    try {
      await fs.rm(appDataPath, { recursive: true, force: true });
      console.log(`[Docker] uninstallApp: Removed data dir ${appDataPath}`);
    } catch (cleanupError) {
      console.warn(
        `[Docker] uninstallApp: Failed to remove data dir ${appDataPath}:`,
        cleanupError
      );
    }

    await removeInstalledAppRecord(containerName);
    await triggerAppsUpdate();

    console.log(
      `[Docker] uninstallApp: Successfully uninstalled "${appId}"`
    );
    return true;
  } catch (error) {
    console.error(
      `[Docker] uninstallApp: Error uninstalling "${appId}":`,
      error
    );
    return false;
  }
}
