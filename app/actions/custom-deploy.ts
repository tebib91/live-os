"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { recordInstalledApp } from "@/app/actions/docker/db";
import { triggerAppsUpdate } from "@/lib/system-status/websocket-server";
import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);
const DEFAULT_APP_ICON = "/default-application-icon.png";
const CUSTOM_APPS_ROOT = path.join(process.cwd(), "custom-apps");
const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";

/**
 * Convert a `docker run` command into docker-compose YAML using composerize.
 */
export async function convertDockerRunToCompose(
  command: string,
): Promise<{ success: boolean; yaml?: string; error?: string }> {
  if (!command.trim()) {
    return { success: false, error: "Command is empty" };
  }

  try {
    const composerize = (await import("composerize")).default;
    const yaml = composerize(command.trim());
    return { success: true, yaml };
  } catch (error: any) {
    console.error("[CustomDeploy] composerize error:", error);
    return {
      success: false,
      error: error?.message || "Failed to convert docker run command",
    };
  }
}

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
        await execAsync(`docker rm -f "${getContainerName(appName)}"`).catch(
          () => null,
        );
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

    // Detect all containers from this compose project
    const containers = await detectAllComposeContainerNames(appPath);

    await recordInstalledApp(
      appName,
      containerName,
      undefined,
      { composePath, deployMethod: "compose", containers },
      "custom",
    );
    await triggerAppsUpdate();
    return { success: true };
  } catch (error: any) {
    console.error("[CustomDeploy] deployCustomCompose error:", error);
    return { success: false, error: error?.message || "Deploy failed" };
  }
}

// Helpers
function getContainerName(appId: string) {
  return `${CONTAINER_PREFIX}${appId.toLowerCase()}`;
}

function validateAppId(appId: string): boolean {
  return Boolean(appId) && !appId.includes("..") && !appId.includes("/");
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

/**
 * Detect all container names from a compose project directory.
 */
async function detectAllComposeContainerNames(
  appDir: string,
): Promise<string[]> {
  try {
    const { stdout } = await execAsync(
      `cd "${appDir}" && docker compose ps --format "{{.Names}}"`,
    );
    return stdout
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
