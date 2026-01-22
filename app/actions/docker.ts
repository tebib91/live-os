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
import { env } from "process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Container name prefix for LiveOS apps
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";
const DEFAULT_APP_ICON = "/icons/default-application-icon.png";
// Root where imported external app stores live (CasaOS ZIPs, etc.)
const STORES_ROOT = path.join(process.cwd(), "external-apps");
const INTERNAL_APPS_ROOT = path.join(process.cwd(), "internal-apps");
const CUSTOM_APPS_ROOT = path.join(process.cwd(), "custom-apps");
const FALLBACK_APP_NAME = "Application";

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

function getAppIdFromContainerName(name: string): string {
  return CONTAINER_PREFIX
    ? name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "")
    : name;
}

type RunningAppUsage = {
  id: string;
  appId: string;
  name: string;
  icon: string;
  cpuUsage: number;
};

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
    console.log(`[Docker] installApp: Using compose at ${composePath}`);
    emitProgress(0.2, "Configuring install");

    // Build environment variables
    console.log("[Docker] installApp: Building environment variables...");

    // Add port overrides
    config.ports.forEach((port) => {
      env[`PORT_${port.container}`] = port.published;
      console.log(
        `[Docker] installApp: Set PORT_${port.container}=${port.published}`
      );
    });

    // Add volume overrides
    config.volumes.forEach((volume) => {
      const key = `VOLUME_${volume.container
        .replace(/\//g, "_")
        .toUpperCase()}`;
      env[key] = volume.source;
      console.log(`[Docker] installApp: Set ${key}=${volume.source}`);
    });

    // Add environment variables
    config.environment.forEach((envVar) => {
      env[envVar.key] = envVar.value;
      console.log(`[Docker] installApp: Set ${envVar.key}=${envVar.value}`);
    });

    // Set container name
    const containerName = getContainerName(appId);
    env.CONTAINER_NAME = containerName;
    console.log(`[Docker] installApp: Container name: ${containerName}`);

    // Execute docker compose up (using Compose V2 syntax)
    const command = `cd "${appDir}" && docker compose -f "${composePath}" up -d`;
    console.log(`[Docker] installApp: Executing: ${command}`);
    emitProgress(0.35, "Pulling images");
    const { stdout, stderr } = await execAsync(command, { env });

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

    await recordInstalledApp(appId, containerName, metaOverride);
    await triggerAppsUpdate();
    await logAction("install:success", { appId, containerName });
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
export async function getRunningAppUsage(): Promise<RunningAppUsage[]> {
  console.log("[Docker] getRunningAppUsage: Fetching running app CPU usage...");

  try {
    const command =
      'docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}"';
    console.log(`[Docker] getRunningAppUsage: Executing: ${command}`);
    const { stdout } = await execAsync(command);

    if (!stdout.trim()) {
      console.log("[Docker] getRunningAppUsage: No running containers found");
      return [];
    }

    const apps = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [name, cpuPercentRaw] = line.split("\t");
        if (!name || !cpuPercentRaw) return null;

        if (CONTAINER_PREFIX && !name.startsWith(CONTAINER_PREFIX)) {
          return null;
        }

        const cpuUsage = parseFloat(cpuPercentRaw.replace("%", "").trim());
        const appId = getAppIdFromContainerName(name);

        return {
          id: name,
          appId,
          name: appId,
          icon: DEFAULT_APP_ICON,
          cpuUsage: Number.isNaN(cpuUsage) ? 0 : cpuUsage,
        };
      })
      .filter((app): app is RunningAppUsage => Boolean(app))
      .sort((a, b) => b.cpuUsage - a.cpuUsage);

    console.log(
      `[Docker] getRunningAppUsage: ✅ Found ${apps.length} running apps`
    );
    return apps;
  } catch (error) {
    console.error("[Docker] getRunningAppUsage: ❌ Error:", error);
    return [];
  }
}

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
      const appId = CONTAINER_PREFIX
        ? name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "")
        : name;

      // Determine status
      let status: "running" | "stopped" | "error" = "stopped";
      if (statusRaw.includes("Up")) status = "running";
      else if (statusRaw.includes("Exited")) status = "error";

      console.log(
        `[Docker] getInstalledApps: Container "${name}" (appId: ${appId}) - Status: ${status}, Image: ${image}`
      );

      // Get first exposed port if available
      const hostPort = await resolveHostPort(name);
      const webUIPort = hostPort ? parseInt(hostPort, 10) : undefined;

      const record = metaByContainer.get(name);
      const storeMeta = appMetaById.get(appId);

      apps.push({
        id: name,
        appId,
        name: record?.name || storeMeta?.title || storeMeta?.name || appId,
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

    const containerName = getContainerName(appId);
    const host =
      process.env.LIVEOS_DOMAIN ||
      process.env.LIVEOS_HOST ||
      process.env.LIVEOS_HTTP_HOST ||
      process.env.HOSTNAME ||
      "localhost";
    const protocol = process.env.LIVEOS_HTTPS === "true" ? "https" : "http";

    // 1) Prefer published host port from Docker (works for bridge mode)
    const hostPort = await resolveHostPort(containerName);
    if (hostPort) {
      return `${protocol}://${host}:${hostPort}`;
    }

    // 2) Fallback to metadata port (host network or compose without publish)
    const appMeta = await prisma.app.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
      select: { port: true },
    });

    if (appMeta?.port && validatePort(appMeta.port)) {
      return `${protocol}://${host}:${appMeta.port}`;
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

/**
 * Deploy custom Docker Compose configuration
 */
export async function deployCustomCompose(
  appName: string,
  dockerCompose: string
): Promise<{ success: boolean; error?: string }> {
  console.log(
    `[Docker] deployCustomCompose: Deploying custom compose for "${appName}"...`
  );

  try {
    // Validate app name
    console.log("[Docker] deployCustomCompose: Validating app name...");
    if (!validateAppId(appName)) {
      console.warn(
        `[Docker] deployCustomCompose: ❌ Invalid app name: "${appName}"`
      );
      return {
        success: false,
        error:
          "Invalid app name. Use only lowercase letters, numbers, and hyphens.",
      };
    }

    // Create custom apps directory if it doesn't exist
    const customAppsPath = path.join(process.cwd(), "custom-apps");
    console.log(
      `[Docker] deployCustomCompose: Custom apps path: ${customAppsPath}`
    );
    await fs.mkdir(customAppsPath, { recursive: true });

    // Create app directory
    const appPath = path.join(customAppsPath, appName);
    console.log(`[Docker] deployCustomCompose: App path: ${appPath}`);

    try {
      await fs.access(appPath);
      console.warn(
        `[Docker] deployCustomCompose: ❌ App "${appName}" already exists`
      );
      return { success: false, error: "An app with this name already exists" };
    } catch {
      // App doesn't exist, continue
      console.log(
        "[Docker] deployCustomCompose: App does not exist, proceeding..."
      );
    }

    console.log("[Docker] deployCustomCompose: Creating app directory...");
    await fs.mkdir(appPath, { recursive: true });

    // Save docker-compose.yml
    const composePath = path.join(appPath, "docker-compose.yml");
    console.log(
      `[Docker] deployCustomCompose: Writing compose file to: ${composePath}`
    );
    await fs.writeFile(composePath, dockerCompose, "utf-8");
    console.log(
      `[Docker] deployCustomCompose: Compose file written (${dockerCompose.length} bytes)`
    );

    // Set container name prefix
    const containerName = getContainerName(appName);
    const containerEnv = {
      ...process.env,
      CONTAINER_NAME: containerName,
    };
    console.log(
      `[Docker] deployCustomCompose: Container name: ${containerName}`
    );

    // Execute docker compose up
    const command = `cd "${appPath}" && docker compose up -d`;
    console.log(`[Docker] deployCustomCompose: Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command, { env: containerEnv });

    if (stdout) console.log(`[Docker] deployCustomCompose: stdout: ${stdout}`);
    if (
      stderr &&
      !stderr.includes("Creating") &&
      !stderr.includes("Starting") &&
      !stderr.includes("Running")
    ) {
      console.error("[Docker] deployCustomCompose: stderr:", stderr);
      return { success: false, error: stderr };
    }

    console.log(
      `[Docker] deployCustomCompose: ✅ Successfully deployed "${appName}"`
    );
    await recordInstalledApp(appName, containerName);
    await triggerAppsUpdate();
    return { success: true };
  } catch (error: any) {
    console.error(
      `[Docker] deployCustomCompose: ❌ Error deploying "${appName}":`,
      error
    );
    return {
      success: false,
      error: error.message || "Failed to deploy application",
    };
  }
}

/**
 * Deploy custom Docker Run configuration
 */
export async function deployCustomRun(
  appName: string,
  imageName: string,
  containerName?: string,
  ports?: string,
  volumes?: string,
  envVars?: string
): Promise<{ success: boolean; error?: string }> {
  console.log(
    `[Docker] deployCustomRun: Deploying custom container for "${appName}"...`
  );
  console.log(`[Docker] deployCustomRun: Image: ${imageName}`);

  try {
    // Validate app name
    console.log("[Docker] deployCustomRun: Validating app name...");
    if (!validateAppId(appName)) {
      console.warn(
        `[Docker] deployCustomRun: ❌ Invalid app name: "${appName}"`
      );
      return {
        success: false,
        error:
          "Invalid app name. Use only lowercase letters, numbers, and hyphens.",
      };
    }

    if (!imageName.trim()) {
      console.warn("[Docker] deployCustomRun: ❌ Image name is empty");
      return { success: false, error: "Docker image name is required" };
    }

    // Build docker run command
    const finalContainerName =
      containerName?.trim() || getContainerName(appName);
    console.log(
      `[Docker] deployCustomRun: Container name: ${finalContainerName}`
    );

    let command = `docker run -d --name "${finalContainerName}" --restart unless-stopped`;

    // Parse and add port mappings
    if (ports?.trim()) {
      console.log(`[Docker] deployCustomRun: Adding port mappings: ${ports}`);
      const portMappings = ports
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      for (const portMapping of portMappings) {
        if (!portMapping.includes(":")) {
          console.warn(
            `[Docker] deployCustomRun: ❌ Invalid port mapping: ${portMapping}`
          );
          return {
            success: false,
            error: `Invalid port mapping: ${portMapping}. Use format host:container`,
          };
        }
        const [hostPort, containerPort] = portMapping.split(":");
        if (!validatePort(hostPort) || !validatePort(containerPort)) {
          console.warn(
            `[Docker] deployCustomRun: ❌ Invalid port in mapping: ${portMapping}`
          );
          return {
            success: false,
            error: `Invalid port in mapping: ${portMapping}`,
          };
        }
        command += ` -p ${portMapping}`;
      }
      console.log(
        `[Docker] deployCustomRun: Added ${portMappings.length} port mappings`
      );
    }

    // Parse and add volume mounts
    if (volumes?.trim()) {
      const volumeMounts = volumes
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
      console.log(
        `[Docker] deployCustomRun: Adding ${volumeMounts.length} volume mounts`
      );
      for (const volumeMount of volumeMounts) {
        if (!volumeMount.includes(":")) {
          console.warn(
            `[Docker] deployCustomRun: ❌ Invalid volume mount: ${volumeMount}`
          );
          return {
            success: false,
            error: `Invalid volume mount: ${volumeMount}. Use format host:container`,
          };
        }
        command += ` -v "${volumeMount}"`;
      }
    }

    // Parse and add environment variables
    if (envVars?.trim()) {
      const envLines = envVars
        .split("\n")
        .map((e) => e.trim())
        .filter(Boolean);
      console.log(
        `[Docker] deployCustomRun: Adding ${envLines.length} environment variables`
      );
      for (const envLine of envLines) {
        if (!envLine.includes("=")) {
          console.warn(
            `[Docker] deployCustomRun: ❌ Invalid env var: ${envLine}`
          );
          return {
            success: false,
            error: `Invalid environment variable: ${envLine}. Use format KEY=value`,
          };
        }
        const [key, ...valueParts] = envLine.split("=");
        const value = valueParts.join("="); // Handle values with = in them
        command += ` -e "${key}=${value}"`;
      }
    }

    // Add image name
    command += ` ${imageName}`;

    // Execute docker run
    console.log(`[Docker] deployCustomRun: Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);

    if (stdout) console.log(`[Docker] deployCustomRun: stdout: ${stdout}`);
    if (
      stderr &&
      !stderr.toLowerCase().includes("pulling") &&
      !stderr.toLowerCase().includes("downloaded")
    ) {
      console.error("[Docker] deployCustomRun: stderr:", stderr);
    }

    console.log(
      `[Docker] deployCustomRun: ✅ Successfully deployed "${appName}"`
    );
    await recordInstalledApp(appName, finalContainerName);
    await triggerAppsUpdate();
    return { success: true };
  } catch (error: any) {
    console.error(
      `[Docker] deployCustomRun: ❌ Error deploying "${appName}":`,
      error
    );

    // Check if error is about container name already in use
    if (error.message.includes("already in use")) {
      console.warn(`[Docker] deployCustomRun: Container name already in use`);
      return {
        success: false,
        error:
          "A container with this name already exists. Please choose a different name or remove the existing container.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to deploy application",
    };
  }
}

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
            // continue
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
      "[Docker] findComposeForApp: ❌ Error searching app roots:",
      error
    );
  }

  return null;
}
