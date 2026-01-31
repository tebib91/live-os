"use server";

import {
  sendInstallProgress,
  type InstallProgressPayload,
} from "@/app/api/system/stream/route";
import type { InstallConfig } from "@/components/app-store/types";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import { spawn } from "child_process";
import path from "path";
import { env } from "process";
import prisma from "@/lib/prisma";
import { logAction } from "../logger";
import { getAppMeta, recordInstalledApp } from "./db";
import { checkDependencies } from "./dependencies";
import {
  DEFAULT_APP_ICON,
  detectAllComposeContainerNames,
  detectComposeContainerName,
  execAsync,
  findComposeForApp,
  getContainerName,
  getContainerNameFromCompose,
  guessComposeContainerName,
  getSystemDefaults,
  sanitizeComposeFile,
  validateAppId,
  validatePort,
} from "./utils";

/**
 * Install an app with docker-compose
 */
export async function installApp(
  appId: string,
  config: InstallConfig,
  metaOverride?: { name?: string; icon?: string },
): Promise<{ success: boolean; error?: string }> {
  await logAction("install:start", { appId });
  console.log(`[Docker] installApp: Starting installation for app "${appId}"`);
  console.log(
    `[Docker] installApp: Config - Ports: ${config.ports.length}, Volumes: ${config.volumes.length}, Env vars: ${config.environment.length}`,
  );

  let meta = { name: appId, icon: DEFAULT_APP_ICON };

  try {
    meta = await getAppMeta(appId, metaOverride);
    const emitProgress = (
      progress: number,
      message: string,
      status: InstallProgressPayload["status"] = "running",
    ) =>
      sendInstallProgress({
        type: "install-progress",
        containerName: appId,
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
      console.warn(`[Docker] installApp: Invalid app ID: "${appId}"`);
      emitProgress(1, "Invalid app ID", "error");
      return { success: false, error: "Invalid app ID" };
    }

    // Validate ports
    console.log("[Docker] installApp: Validating ports...");
    for (const port of config.ports) {
      if (!validatePort(port.published)) {
        console.warn(`[Docker] installApp: Invalid port: ${port.published}`);
        emitProgress(1, `Invalid port: ${port.published}`, "error");
        return { success: false, error: `Invalid port: ${port.published}` };
      }
    }
    console.log(
      `[Docker] installApp: All ${config.ports.length} ports validated`,
    );

    // Check dependencies
    const depCheck = await checkDependencies(appId);
    if (!depCheck.satisfied) {
      const missingList = depCheck.missing.join(", ");
      console.warn(`[Docker] installApp: Missing dependencies: ${missingList}`);
      emitProgress(1, `Missing dependencies: ${missingList}`, "error");
      return { success: false, error: `Missing dependencies: ${missingList}` };
    }

    // Validate paths
    console.log("[Docker] installApp: Validating volume paths...");
    // for (const volume of config.volumes) {
    //   if (!validatePath(volume.source)) {
    //     console.warn(`[Docker] installApp: Invalid path: ${volume.source}`);
    //     emitProgress(1, `Invalid path: ${volume.source}`, "error");
    //     return { success: false, error: `Invalid path: ${volume.source}` };
    //   }
    // }
    console.log(
      `[Docker] installApp: All ${config.volumes.length} volume paths validated`,
    );

    const resolvedCompose = await findComposeForApp(appId);
    if (!resolvedCompose) {
      console.warn(
        `[Docker] installApp: Compose file not found for "${appId}" in available app roots`,
      );
      emitProgress(1, "Compose file not found", "error");
      return {
        success: false,
        error: "App not found. Ensure it is imported or bundled internally.",
      };
    }

    const { appDir, composePath } = resolvedCompose;
    const sanitizedComposePath = await sanitizeComposeFile(composePath);
    console.log(
      `[Docker] installApp: Using compose at ${sanitizedComposePath}`,
    );
    emitProgress(0.2, "Configuring install");

    // Build environment variables with CasaOS system defaults
    console.log("[Docker] installApp: Building environment variables...");
    const systemDefaults = getSystemDefaults();
    const envVars: NodeJS.ProcessEnv = { ...env };

    // Set CasaOS reserved variables
    envVars.PUID = envVars.PUID || systemDefaults.PUID;
    envVars.PGID = envVars.PGID || systemDefaults.PGID;
    envVars.TZ = envVars.TZ || systemDefaults.TZ;
    envVars.AppID = envVars.AppID || appId;
    envVars.APP_ID = envVars.APP_ID || appId;
    envVars.APP_DATA_DIR =
      envVars.APP_DATA_DIR || path.join("/DATA/AppData", appId);
    envVars.UMBREL_ROOT = envVars.UMBREL_ROOT || "/DATA";

    console.log(
      `[Docker] installApp: System defaults - PUID=${envVars.PUID}, PGID=${envVars.PGID}, TZ=${envVars.TZ}`,
    );

    // Add port overrides
    config.ports.forEach((port) => {
      envVars[`PORT_${port.container}`] = port.published;
      console.log(
        `[Docker] installApp: Set PORT_${port.container}=${port.published}`,
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

    // Add environment variables from config
    config.environment.forEach((envVar) => {
      envVars[envVar.key] = envVar.value;
      console.log(`[Docker] installApp: Set ${envVar.key}=${envVar.value}`);
    });

    // Resolve container name (prefer compose container_name if set)
    const composeContainerName = await getContainerNameFromCompose(composePath);
    const containerName = composeContainerName || getContainerName(appId);
    envVars.CONTAINER_NAME = containerName;
    console.log(
      `[Docker] installApp: Container name: ${containerName}` +
        (composeContainerName ? " (from compose file)" : " (generated)"),
    );

    // Execute docker compose up (using Compose V2 syntax)
    const command = `cd "${appDir}" && docker compose -f "${sanitizedComposePath}" up -d`;
    console.log(`[Docker] installApp: Executing pull then up: ${command}`);
    emitProgress(0.35, "Pulling images");
    await streamComposePull(appDir, sanitizedComposePath, envVars, (progress, message) =>
      emitProgress(progress, message ?? "Pulling images"),
    );

    emitProgress(0.85, "Starting services");
    const { stdout, stderr } = await execAsync(command, { env: envVars });

    if (stdout)
      console.log(
        `[Docker] installApp: stdout: ${stdout.substring(0, 200)}...`,
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
      guessComposeContainerName(sanitizedComposePath) ||
      containerName;

    // Detect all containers in this compose project
    const allContainers = await detectAllComposeContainerNames(appDir);

    // Look up store metadata for source tracking
    const appRecord = await prisma.app.findFirst({
      where: { appId },
      include: { store: true },
      orderBy: { createdAt: "desc" },
    });
    const storeSlug = appRecord?.store?.slug;
    const containerJson = (appRecord?.container as Record<string, unknown>) ?? undefined;

    const persistedConfig: Record<string, unknown> = {
      ports: config.ports,
      volumes: config.volumes,
      environment: config.environment,
      composePath: sanitizedComposePath,
      deployMethod: "compose",
      containers: allContainers.length > 0 ? allContainers : [detectedContainer],
    };
    await recordInstalledApp(
      appId,
      detectedContainer,
      metaOverride,
      persistedConfig,
      storeSlug,
      containerJson,
    );
    await triggerAppsUpdate();
    await logAction("install:success", {
      appId,
      containerName: detectedContainer,
    });
    emitProgress(1, "Installation complete", "completed");
    console.log(`[Docker] installApp: Successfully installed "${appId}"`);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Docker] installApp: Error installing "${appId}":`, error);
    await logAction("install:error", { appId, error: errorMessage }, "error");
    sendInstallProgress({
      type: "install-progress",
      containerName: appId,
      name: meta.name,
      icon: meta.icon,
      progress: 1,
      status: "error",
      message: "Installation failed",
    });
    return {
      success: false,
      error: errorMessage || "Failed to install app",
    };
  }
}

async function streamComposePull(
  appDir: string,
  composePath: string,
  envVars: NodeJS.ProcessEnv,
  onProgress: (progress: number, message?: string) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pull = spawn("docker", ["compose", "-f", composePath, "pull"], {
      cwd: appDir,
      env: envVars,
    });

    let events = 0;
    let lastEmit = Date.now();
    const maxProgress = 0.85;
    const minProgress = 0.35;

    const advance = (incMessage?: string) => {
      events += 1;
      const pct = Math.min(
        maxProgress,
        minProgress + (events / 40) * (maxProgress - minProgress),
      );
      const now = Date.now();
      // throttle to avoid spamming
      if (now - lastEmit > 200) {
        onProgress(pct, incMessage);
        lastEmit = now;
      }
    };

    pull.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (
          /download/i.test(trimmed) ||
          /extract/i.test(trimmed) ||
          /pulling/i.test(trimmed) ||
          /pull complete/i.test(trimmed)
        ) {
          advance(trimmed);
        }
      });
    });

    pull.stderr.on("data", (data) => {
      const lines = data.toString().split("\n");
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        advance(trimmed);
      });
    });

    pull.on("error", (err) => reject(err));
    pull.on("close", (code) => {
      if (code === 0) {
        onProgress(0.85, "Images pulled");
        resolve();
      } else {
        reject(new Error(`docker compose pull exited with code ${code}`));
      }
    });
  });
}
