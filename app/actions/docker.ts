/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import type { InstallConfig, InstalledApp } from "@/components/app-store/types";
import prisma from "@/lib/prisma";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import {
  sendInstallProgress,
  type InstallProgressPayload,
} from "@/app/api/system/stream/route";
import { logAction } from "./logger";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { env } from "process";
import { promisify } from "util";
import YAML from "yaml";

const execAsync = promisify(exec);

const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";
const DEFAULT_APP_ICON = "/icons/default-application-icon.png";
const STORES_ROOT = path.join(process.cwd(), "external-apps");
const INTERNAL_APPS_ROOT = path.join(process.cwd(), "internal-apps");
const CUSTOM_APPS_ROOT = path.join(process.cwd(), "custom-apps");
const FALLBACK_APP_NAME = "Application";

async function detectComposeContainerName(
  appDir: string,
  composePath: string,
): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `cd "${appDir}" && docker compose -f "${composePath}" ps --format "{{.Names}}"`,
    );
    const names = stdout
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
    return names[0] || null;
  } catch (error) {
    console.warn(
      "[Docker] detectComposeContainerName failed:",
      (error as Error)?.message || error,
    );
    return null;
  }
}
async function resolveHostPort(containerName: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker inspect -f '{{json .NetworkSettings.Ports}}' ${containerName}`
    );

    const ports = JSON.parse(stdout || "{}") as Record<
      string,
      { HostIp: string; HostPort: string }[] | null
    >;

    const firstMapping = Object.values(ports).find(
      (mappings) => Array.isArray(mappings) && mappings.length > 0
    );

    return firstMapping?.[0]?.HostPort ?? null;
  } catch (error) {
    console.error(`[Docker] resolveHostPort: failed for ${containerName}:`, error);
    return null;
  }
}
async function recordInstalledApp(
  appId: string,
  containerName: string,
  override?: { name?: string; icon?: string }
): Promise<void> {
  const meta = await getAppMeta(appId, override);

  await prisma.installedApp.upsert({
    where: { containerName },
    update: { appId, name: meta.name, icon: meta.icon },
    create: { appId, name: meta.name, icon: meta.icon, containerName },
  });
}

async function getAppMeta(appId: string, override?: { name?: string; icon?: string }) {
    const appMeta = await prisma.app.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
    });

  return {
    name:
      override?.name ||
      appMeta?.title ||
      appMeta?.name ||
      appId ||
      FALLBACK_APP_NAME,
    icon: override?.icon || appMeta?.icon || DEFAULT_APP_ICON,
  };
}

/**
 * Validate appId to prevent path traversal
 */
function validateAppId(appId: string): boolean {
  if (!appId || appId.includes("..") || appId.includes("/")) {
    return false;
  }
  return true;
}

/**
 * Validate port number
 */
function validatePort(port: string | number): boolean {
  const portNum = typeof port === "string" ? parseInt(port, 10) : port;
  return portNum >= 1024 && portNum <= 65535;
}

/**
 * Validate path to prevent path traversal
 */
function validatePath(pathStr: string): boolean {
  if (!pathStr || pathStr.includes("..")) {
    return false;
  }
  // Only allow paths under /DATA or relative paths
  if (pathStr.startsWith("/") && !pathStr.startsWith("/DATA")) {
    return false;
  }
  return true;
}

/**
 * Get container name for an app
 */
function getContainerName(appId: string): string {
  return `${CONTAINER_PREFIX}${appId.toLowerCase()}`;
}

async function getRecordedContainerName(appId: string): Promise<string | null> {
  try {
    const record = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
      select: { containerName: true },
    });
    return record?.containerName || null;
  } catch {
    return null;
  }
}

/**
 * Install an app with docker-compose
 */
export async function installApp(
  appId: string,
  config: InstallConfig,
  metaOverride?: { name?: string; icon?: string }
): Promise<{ success: boolean; error?: string }> {
  await logAction("install:start", { appId });
  console.log(`[Docker] installApp: Starting installation for app "${appId}"`);
  console.log(
    `[Docker] installApp: Config - Ports: ${config.ports.length}, Volumes: ${config.volumes.length}, Env vars: ${config.environment.length}`
  );

  let meta = { name: appId, icon: DEFAULT_APP_ICON };

  try {
    meta = await getAppMeta(appId, metaOverride);
    const emitProgress = (
      progress: number,
      message: string,
      status: InstallProgressPayload["status"] = "running"
    ) =>
      sendInstallProgress({
        type: "install-progress",
        appId,
        name: meta.name,
        icon: meta.icon,
        progress,
        status,
        message,
      });

    emitProgress(0.05, "Preparing install", "starting");
    // Validate inputs
    console.log("[Docker] installApp: Validating app ID...");
    if (!validateAppId(appId)) {
      console.warn(`[Docker] installApp: ❌ Invalid app ID: "${appId}"`);
      emitProgress(1, "Invalid app ID", "error");
      return { success: false, error: "Invalid app ID" };
    }

    // Validate ports
    console.log("[Docker] installApp: Validating ports...");
    for (const port of config.ports) {
      if (!validatePort(port.published)) {
        console.warn(`[Docker] installApp: ❌ Invalid port: ${port.published}`);
        emitProgress(1, `Invalid port: ${port.published}`, "error");
        return { success: false, error: `Invalid port: ${port.published}` };
      }
    }
    console.log(
      `[Docker] installApp: ✅ All ${config.ports.length} ports validated`
    );

    // Validate paths
    console.log("[Docker] installApp: Validating volume paths...");
    for (const volume of config.volumes) {
      if (!validatePath(volume.source)) {
        console.warn(`[Docker] installApp: ❌ Invalid path: ${volume.source}`);
        emitProgress(1, `Invalid path: ${volume.source}`, "error");
        return { success: false, error: `Invalid path: ${volume.source}` };
      }
    }
    console.log(
      `[Docker] installApp: ✅ All ${config.volumes.length} volume paths validated`
    );

  const resolvedCompose = await findComposeForApp(appId);
  if (!resolvedCompose) {
    console.warn(
      `[Docker] installApp: ❌ Compose file not found for "${appId}" in available app roots`
    );
      emitProgress(1, "Compose file not found", "error");
      return {
        success: false,
        error: "App not found. Ensure it is imported or bundled internally.",
      };
    }

    const { appDir, composePath } = resolvedCompose;
    const sanitizedComposePath = await sanitizeComposeFile(composePath);
    console.log(`[Docker] installApp: Using compose at ${sanitizedComposePath}`);
    emitProgress(0.2, "Configuring install");

    // Build environment variables
    console.log("[Docker] installApp: Building environment variables...");
    const envVars: NodeJS.ProcessEnv = { ...env };
    if (!envVars.APP_DATA_DIR) {
      envVars.APP_DATA_DIR = path.join("/DATA/AppData", appId);
    }
    if (!envVars.UMBREL_ROOT) {
      envVars.UMBREL_ROOT = "/DATA";
    }

    // Add port overrides
    config.ports.forEach((port) => {
      envVars[`PORT_${port.container}`] = port.published;
      console.log(
        `[Docker] installApp: Set PORT_${port.container}=${port.published}`
      );
    });

    // Add volume overrides
    config.volumes.forEach((volume) => {
      const key = `VOLUME_${volume.container
        .replace(/\//g, "_")
        .toUpperCase()}`;
      envVars[key] = volume.source;
      console.log(`[Docker] installApp: Set ${key}=${volume.source}`);
    });

    // Add environment variables
    config.environment.forEach((envVar) => {
      envVars[envVar.key] = envVar.value;
      console.log(`[Docker] installApp: Set ${envVar.key}=${envVar.value}`);
    });

    // Set container name
    const containerName = getContainerName(appId);
    envVars.CONTAINER_NAME = containerName;
    console.log(`[Docker] installApp: Container name: ${containerName}`);

    // Execute docker compose up (using Compose V2 syntax)
    const command = `cd "${appDir}" && docker compose -f "${sanitizedComposePath}" up -d`;
    console.log(`[Docker] installApp: Executing: ${command}`);
    emitProgress(0.35, "Pulling images");
    const { stdout, stderr } = await execAsync(command, { env: envVars });

    if (stdout)
      console.log(
        `[Docker] installApp: stdout: ${stdout.substring(0, 200)}...`
      );
    if (
      stderr &&
      !stderr.includes("Creating") &&
      !stderr.includes("Starting")
    ) {
      console.error("[Docker] installApp: stderr:", stderr);
    }
    emitProgress(0.9, "Finalizing install");

    const detectedContainer =
      (await detectComposeContainerName(appDir, sanitizedComposePath)) ||
      containerName;

    await recordInstalledApp(appId, detectedContainer, metaOverride);
    await triggerAppsUpdate();
    await logAction("install:success", {
      appId,
      containerName: detectedContainer,
    });
    emitProgress(1, "Installation complete", "completed");
    console.log(`[Docker] installApp: ✅ Successfully installed "${appId}"`);
    return { success: true };
  } catch (error: any) {
    console.error(
      `[Docker] installApp: ❌ Error installing "${appId}":`,
      error
    );
    await logAction(
      "install:error",
      { appId, error: error?.message ?? String(error) },
      "error"
    );
    sendInstallProgress({
      type: "install-progress",
      appId,
      name: meta.name,
      icon: meta.icon,
      progress: 1,
      status: "error",
      message: "Installation failed",
    });
    return {
      success: false,
      error: error.message || "Failed to install app",
    };
  }
}

/**
 * Get running app CPU usage from Docker stats
 */
// getRunningAppUsage removed (streamlined API)

/**
 * Get list of installed LiveOS apps
 */
/**
 * Get list of installed LiveOS apps
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  console.log("[Docker] getInstalledApps: Fetching installed apps...");

  try {
    const [knownApps, storeApps] = await Promise.all([
      prisma.installedApp.findMany(),
      prisma.app.findMany(),
    ]);
    const metaByContainer = new Map(
      knownApps.map((app) => [app.containerName, app])
    );
    const appMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    // Optional prefix for container filtering
    const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";
    console.log(
      `[Docker] getInstalledApps: Container prefix: "${
        CONTAINER_PREFIX || "none"
      }"`
    );

    // Build filter argument only if prefix is set
    const filterArg = CONTAINER_PREFIX
      ? `--filter "name=${CONTAINER_PREFIX}"`
      : "";

    // Use --format for clean parsing
    const command = `docker ps -a ${filterArg} --format "{{.Names}}\t{{.Status}}\t{{.Image}}"`;
    console.log(`[Docker] getInstalledApps: Executing: ${command}`);
    const { stdout } = await execAsync(command);

    console.log(
      `[Docker] getInstalledApps: Raw stdout: ${stdout.substring(0, 200)}...`
    );

    if (!stdout.trim()) {
      console.log("[Docker] getInstalledApps: No installed apps found");
      return [];
    }

    const lines = stdout.trim().split("\n");
    console.log(
      `[Docker] getInstalledApps: Processing ${lines.length} containers...`
    );
    const apps: InstalledApp[] = [];

    for (const line of lines) {
      const [name, statusRaw, image] = line.split("\t");

      // Clean appId (remove prefix if any)
      const rawId = CONTAINER_PREFIX
        ? name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "")
        : name;

      // Determine status
      let status: "running" | "stopped" | "error" = "stopped";
      if (statusRaw.includes("Up")) status = "running";
      else if (statusRaw.includes("Exited")) status = "error";

      const record = metaByContainer.get(name);
      const resolvedAppId = record?.appId || rawId;
      const storeMeta = appMetaById.get(resolvedAppId);

      console.log(
        `[Docker] getInstalledApps: Container "${name}" (appId: ${resolvedAppId}) - Status: ${status}, Image: ${image}`
      );

      // Get first exposed port if available
      const hostPort = await resolveHostPort(name);
      const webUIPort = hostPort ? parseInt(hostPort, 10) : undefined;

      apps.push({
        id: name,
        appId: resolvedAppId,
        name:
          record?.name || storeMeta?.title || storeMeta?.name || rawId,
        icon: record?.icon || storeMeta?.icon || DEFAULT_APP_ICON,
        status,
        webUIPort,
        containerName: name,
        installedAt: record?.createdAt?.getTime?.() || Date.now(),
      });
    }

    console.log(
      `[Docker] getInstalledApps: ✅ Found ${apps.length} installed apps`
    );
    return apps;
  } catch (error) {
    console.error("[Docker] getInstalledApps: ❌ Error:", error);
    return [];
  }
}

/**
 * Get a single installed app by id.
 */
export async function getAppById(
  appId: string,
): Promise<InstalledApp | null> {
  if (!validateAppId(appId)) return null;
  const apps = await getInstalledApps();
  const match = apps.find(
    (a) =>
      a.appId.toLowerCase() === appId.toLowerCase() ||
      a.containerName === getContainerName(appId),
  );
  return match ?? null;
}

/**
 * Get status of a specific app
 */
export async function getAppStatus(
  appId: string
): Promise<"running" | "stopped" | "error"> {
  try {
    if (!validateAppId(appId)) {
      return "error";
    }

    const containerName = getContainerName(appId);
    const { stdout } = await execAsync(
      `docker inspect -f '{{.State.Status}}' ${containerName}`
    );

    const status = stdout.trim();
    if (status === "running") return "running";
    if (status === "exited") return "error";
    return "stopped";
  } catch {
    return "error";
  }
}

/**
 * Get web UI URL for an app
 */
export async function getAppWebUI(appId: string): Promise<string | null> {
  try {
    if (!validateAppId(appId)) {
      return null;
    }

    const recordedContainer = await getRecordedContainerName(appId);
    const containerCandidates = [
      recordedContainer,
      getContainerName(appId),
    ].filter(Boolean) as string[];
    const host =
      process.env.LIVEOS_DOMAIN ||
      process.env.LIVEOS_HOST ||
      process.env.LIVEOS_HTTP_HOST ||
      process.env.HOSTNAME ||
      "localhost";
    const protocol = process.env.LIVEOS_HTTPS === "true" ? "https" : "http";

    // 1) Prefer published host port from Docker (works for bridge mode)
    let hostPort: string | null = null;
    for (const name of containerCandidates) {
      hostPort = await resolveHostPort(name);
      if (hostPort) break;
    }
    // 2) Pull app metadata for fallback port/path
    const appMeta = await prisma.app.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
      select: { port: true, path: true },
    });
    const pathSuffix =
      appMeta?.path && appMeta.path.length > 0
        ? appMeta.path.startsWith("/")
          ? appMeta.path
          : `/${appMeta.path}`
        : "";

    if (hostPort) {
      return `${protocol}://${host}:${hostPort}${pathSuffix}`;
    }

    // 3) Fallback to metadata port (host network or compose without publish)
    if (appMeta?.port && validatePort(appMeta.port)) {
      return `${protocol}://${host}:${appMeta.port}${pathSuffix}`;
    }

    // 4) Last resort: if we at least have a path, try it on default port 80/443
    if (pathSuffix) {
      return `${protocol}://${host}${pathSuffix}`;
    }

    return null;
  } catch (error) {
    console.error(`[Docker] getAppWebUI: failed to resolve URL for ${appId}:`, error);
    return null;
  }
}

/**
 * Stop an app
 */
export async function stopApp(appId: string): Promise<boolean> {
  console.log(`[Docker] stopApp: Stopping app "${appId}"...`);

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] stopApp: ❌ Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(`[Docker] stopApp: Container name: ${containerName}`);
    console.log(`[Docker] stopApp: Executing: docker stop ${containerName}`);

    await execAsync(`docker stop ${containerName}`);
    console.log(`[Docker] stopApp: ✅ Successfully stopped "${appId}"`);
    return true;
  } catch (error) {
    console.error(`[Docker] stopApp: ❌ Error stopping "${appId}":`, error);
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
      console.warn(`[Docker] startApp: ❌ Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(`[Docker] startApp: Container name: ${containerName}`);
    console.log(`[Docker] startApp: Executing: docker start ${containerName}`);

    await execAsync(`docker start ${containerName}`);
    console.log(`[Docker] startApp: ✅ Successfully started "${appId}"`);
    return true;
  } catch (error) {
    console.error(`[Docker] startApp: ❌ Error starting "${appId}":`, error);
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
      console.warn(`[Docker] restartApp: ❌ Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(`[Docker] restartApp: Container name: ${containerName}`);
    console.log(
      `[Docker] restartApp: Executing: docker restart ${containerName}`
    );

    await execAsync(`docker restart ${containerName}`);
    console.log(`[Docker] restartApp: ✅ Successfully restarted "${appId}"`);
    return true;
  } catch (error) {
    console.error(
      `[Docker] restartApp: ❌ Error restarting "${appId}":`,
      error
    );
    return false;
  }
}

/**
 * Update an app by pulling new images and recreating containers.
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
    console.error(`[Docker] updateApp: ❌ failed for ${appId}:`, error);
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
      console.warn(`[Docker] uninstallApp: ❌ Invalid app ID: "${appId}"`);
      return false;
    }

    const containerName = getContainerName(appId);
    console.log(
      `[Docker] uninstallApp: Removing container "${containerName}"...`
    );
    await execAsync(`docker rm -f ${containerName}`);

    await prisma.installedApp
      .delete({ where: { containerName } })
      .catch(() => null);
    await triggerAppsUpdate();

    console.log(
      `[Docker] uninstallApp: ✅ Successfully uninstalled "${appId}"`
    );
    return true;
  } catch (error) {
    console.error(
      `[Docker] uninstallApp: ❌ Error uninstalling "${appId}":`,
      error
    );
    return false;
  }
}

/**
 * Get app logs
 */
export async function getAppLogs(
  appId: string,
  lines: number = 100
): Promise<string> {
  console.log(
    `[Docker] getAppLogs: Getting logs for app "${appId}" (last ${lines} lines)...`
  );

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] getAppLogs: ❌ Invalid app ID: "${appId}"`);
      return "Error: Invalid app ID";
    }

    const containerName = getContainerName(appId);
    const command = `docker logs --tail ${lines} ${containerName}`;
    console.log(`[Docker] getAppLogs: Executing: ${command}`);

    const { stdout } = await execAsync(command);

    if (!stdout) {
      console.log(`[Docker] getAppLogs: No logs available for "${appId}"`);
      return "No logs available";
    }

    console.log(
      `[Docker] getAppLogs: ✅ Retrieved ${
        stdout.split("\n").length
      } lines of logs for "${appId}"`
    );
    return stdout;
  } catch (error: any) {
    console.error(
      `[Docker] getAppLogs: ❌ Error getting logs for "${appId}":`,
      error
    );
    return `Error retrieving logs: ${error.message}`;
  }
}

// custom deploy moved to app/actions/custom-deploy.ts

async function findComposeForApp(
  appId: string
): Promise<{ appDir: string; composePath: string } | null> {
  const target = appId.toLowerCase();
  const composeNames = ["docker-compose.yml", "docker-compose.yaml"];

  async function searchDir(
    dir: string,
    depth: number
  ): Promise<{ appDir: string; composePath: string } | null> {
    if (depth > 5) return null;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const fullPath = path.join(dir, entry.name);

      if (entry.name.toLowerCase() === target) {
        for (const composeName of composeNames) {
          const candidate = path.join(fullPath, composeName);
          try {
            await fs.access(candidate);
            return { appDir: fullPath, composePath: candidate };
          } catch {
            // try next compose name
          }
        }
      }

      const nested = await searchDir(fullPath, depth + 1);
      if (nested) return nested;
    }
    return null;
  }

  const rootsToSearch = [STORES_ROOT, INTERNAL_APPS_ROOT, CUSTOM_APPS_ROOT];

  try {
    for (const root of rootsToSearch) {
      await fs.mkdir(root, { recursive: true }).catch(() => null);
      const entries = await fs
        .readdir(root, { withFileTypes: true })
        .catch(() => []);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const dir = path.join(root, entry.name);
        const found = await searchDir(dir, 0);
        if (found) return found;
      }
    }
  } catch (error) {
    console.error(
      '[Docker] findComposeForApp: ❌ Error searching compose files: ' + error
    );
  }

  console.warn(
    '[Docker] findComposeForApp: Compose file not found for app: ' + appId
  );
  return null;
}

async function sanitizeComposeFile(
  composePath: string,
): Promise<string> {
  try {
    const raw = await fs.readFile(composePath, 'utf-8');
    const doc = YAML.parse(raw);
    if (doc?.services?.app_proxy) {
      const proxy = doc.services.app_proxy;
      if (!proxy.image && !proxy.build) {
        delete doc.services.app_proxy;
        console.log(
          '[Docker] sanitizeCompose: removed app_proxy service with no image/build',
        );
      }
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'liveos-compose-'));
    const tmpPath = path.join(tmpDir, path.basename(composePath));
    await fs.writeFile(tmpPath, YAML.stringify(doc), 'utf-8');
    return tmpPath;
  } catch (error) {
    console.warn(
      '[Docker] sanitizeCompose: failed, using original compose file: ',
      (error as Error)?.message || error,
    );
    return composePath;
  }
}
