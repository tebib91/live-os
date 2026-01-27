"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/prisma";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const DEFAULT_APP_ICON = "/icons/default-application-icon.png";
const CUSTOM_APPS_ROOT = path.join(process.cwd(), "custom-apps");
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";

/**
 * Deploy a custom docker-compose.yml (used by Custom Deploy dialog).
 */
export async function deployCustomCompose(
  appName: string,
  dockerCompose: string,
): Promise<{ success: boolean; error?: string }> {
  if (!validateAppId(appName)) {
    return {
      success: false,
      error: "Invalid app name. Use lowercase letters, numbers, or hyphens.",
    };
  }
  if (!dockerCompose.trim()) {
    return { success: false, error: "Compose content is required" };
  }

  try {
    await fs.mkdir(CUSTOM_APPS_ROOT, { recursive: true });
    const appPath = path.join(CUSTOM_APPS_ROOT, appName);

    const isUpdate = await exists(appPath);
    if (isUpdate) {
      // Tear down old containers before redeploying
      try {
        await execAsync(`cd "${appPath}" && docker compose down`);
      } catch {
        // Fallback: force remove the container directly
        await execAsync(`docker rm -f "${getContainerName(appName)}"`).catch(() => null);
      }
    }

    await fs.mkdir(appPath, { recursive: true });
    const composePath = path.join(appPath, "docker-compose.yml");
    await fs.writeFile(composePath, dockerCompose, "utf-8");

    const containerName = getContainerName(appName);
    const { stdout, stderr } = await execAsync(
      `cd "${appPath}" && docker compose up -d`,
      { env: { ...process.env, CONTAINER_NAME: containerName } },
    );
    if (stdout) console.log("[CustomDeploy] compose stdout:", stdout);
    if (stderr && !isNoise(stderr)) {
      console.error("[CustomDeploy] compose stderr:", stderr);
    }

    await recordInstalledApp(appName, containerName, undefined, {
      composePath: composePath,
      deployMethod: "compose",
    });
    await triggerAppsUpdate();
    return { success: true };
  } catch (error: any) {
    console.error("[CustomDeploy] deployCustomCompose error:", error);
    return { success: false, error: error?.message || "Deploy failed" };
  }
}

/**
 * Deploy a single container via docker run (simple mode).
 */
export async function deployCustomRun(
  appName: string,
  imageName: string,
  containerName?: string,
  ports?: string,
  volumes?: string,
  envVars?: string,
  iconUrl?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!validateAppId(appName)) {
    return {
      success: false,
      error: "Invalid app name. Use lowercase letters, numbers, or hyphens.",
    };
  }
  if (!imageName.trim()) {
    return { success: false, error: "Docker image name is required" };
  }

  try {
    const finalContainer = containerName?.trim() || getContainerName(appName);

    // Remove existing container if present (update case)
    await execAsync(`docker rm -f "${finalContainer}"`).catch(() => null);

    let command = `docker run -d --name "${finalContainer}" --restart unless-stopped`;

    // Ports
    for (const mapping of splitCommaList(ports)) {
      const [host, container] = mapping.split(":");
      if (!validatePort(host) || !validatePort(container)) {
        return { success: false, error: `Invalid port mapping: ${mapping}` };
      }
      command += ` -p ${mapping}`;
    }

    // Volumes
    for (const vol of splitLineList(volumes)) {
      if (!vol.includes(":")) {
        return { success: false, error: `Invalid volume mount: ${vol}` };
      }
      command += ` -v "${vol}"`;
    }

    // Env
    for (const envLine of splitLineList(envVars)) {
      if (!envLine.includes("=")) {
        return { success: false, error: `Invalid env var: ${envLine}` };
      }
      command += ` -e "${envLine}"`;
    }

    command += ` ${imageName}`;
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log("[CustomDeploy] run stdout:", stdout);
    if (stderr && !isNoise(stderr)) console.error("[CustomDeploy] run stderr:", stderr);

    await recordInstalledApp(appName, finalContainer, iconUrl, {
      image: imageName,
      ports: ports || "",
      volumes: volumes || "",
      env: envVars || "",
      deployMethod: "run",
    });
    await triggerAppsUpdate();
    return { success: true };
  } catch (error: any) {
    console.error("[CustomDeploy] deployCustomRun error:", error);
    return { success: false, error: error?.message || "Deploy failed" };
  }
}

// Helpers
function getContainerName(appId: string) {
  return `${CONTAINER_PREFIX}${appId.toLowerCase()}`;
}

async function recordInstalledApp(
  appId: string,
  containerName: string,
  iconOverride?: string,
  installConfig?: Record<string, unknown>,
): Promise<void> {
  const appMeta = await prisma.app.findFirst({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });
  const icon = iconOverride?.trim() || appMeta?.icon || DEFAULT_APP_ICON;

  await prisma.installedApp.upsert({
    where: { containerName },
    update: {
      appId,
      name: appMeta?.title || appMeta?.name || appId,
      icon,
      ...(installConfig !== undefined && {
        installConfig: installConfig as Prisma.InputJsonValue,
      }),
    },
    create: {
      appId,
      containerName,
      name: appMeta?.title || appMeta?.name || appId,
      icon,
      ...(installConfig !== undefined && {
        installConfig: installConfig as Prisma.InputJsonValue,
      }),
    },
  });
}

function validateAppId(appId: string): boolean {
  return Boolean(appId) && !appId.includes("..") && !appId.includes("/");
}

function validatePort(port: string | number): boolean {
  const n = typeof port === "string" ? parseInt(port, 10) : port;
  return Number.isFinite(n) && n >= 1 && n <= 65535;
}

function splitCommaList(value?: string) {
  return value
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

function splitLineList(value?: string) {
  return value
    ? value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function isNoise(stderr: string) {
  const lower = stderr.toLowerCase();
  return (
    lower.includes("creating") ||
    lower.includes("starting") ||
    lower.includes("running") ||
    lower.includes("pulling") ||
    lower.includes("downloaded")
  );
}
