"use server";

import type { InstalledApp } from "@/components/app-store/types";
import prisma from "@/lib/prisma";
import { logAction } from "../logger";
import {
  CONTAINER_PREFIX,
  DEFAULT_APP_ICON,
  aggregateStatus,
  execAsync,
  getContainerName,
  groupContainersByProject,
  listContainersWithLabels,
  resolveHostPort,
  validateAppId,
  validatePort,
} from "./utils";
import {
  getAllAppMeta,
  getInstallConfig,
  getInstalledAppRecords,
  getRecordedContainerName,
} from "./db";

/**
 * Get list of installed LiveOS apps.
 * Groups containers by compose project so multi-service apps show as one entry.
 */
export async function getInstalledApps(): Promise<InstalledApp[]> {
  console.log("[Docker] getInstalledApps: Fetching installed apps...");

  try {
    const [knownApps, storeApps, containers] = await Promise.all([
      getInstalledAppRecords(),
      getAllAppMeta(),
      listContainersWithLabels(),
    ]);

    const metaByContainer = new Map(
      knownApps.map((app) => [app.containerName, app]),
    );
    const metaByAppId = new Map(
      knownApps.map((app) => [app.appId, app]),
    );
    const appMetaById = new Map(storeApps.map((app) => [app.appId, app]));

    // Group containers by compose project
    const groups = groupContainersByProject(containers);

    console.log(
      `[Docker] getInstalledApps: ${containers.length} containers in ${groups.size} groups`,
    );

    const apps: InstalledApp[] = [];

    for (const [projectKey, groupContainers] of groups) {
      // Primary container is the first one (or the one we have a DB record for)
      const primaryContainer =
        groupContainers.find((c) => metaByContainer.has(c.name)) ||
        groupContainers[0];

      const containerNames = groupContainers.map((c) => c.name);

      // Clean appId (remove prefix if any)
      const rawId = CONTAINER_PREFIX
        ? primaryContainer.name.replace(new RegExp(`^${CONTAINER_PREFIX}`), "")
        : primaryContainer.name;

      const record = metaByContainer.get(primaryContainer.name);
      // Also check if any group container matches a DB record
      const anyRecord =
        record ||
        groupContainers
          .map((c) => metaByContainer.get(c.name))
          .find(Boolean);

      const resolvedAppId = anyRecord?.appId || projectKey || rawId;
      const storeMeta = appMetaById.get(resolvedAppId);

      // Aggregate status across all containers in the group
      const status = aggregateStatus(groupContainers);

      // Get first exposed port if available (try primary first)
      const hostPort = await resolveHostPort(primaryContainer.name);
      const webUIPort = hostPort ? parseInt(hostPort, 10) : undefined;

      // Get containers list from DB record if available
      const dbContainers = (anyRecord?.installConfig as Record<string, unknown>)
        ?.containers as string[] | undefined;

      apps.push({
        id: primaryContainer.name,
        appId: resolvedAppId,
        name:
          anyRecord?.name || storeMeta?.title || storeMeta?.name || rawId,
        icon: anyRecord?.icon || storeMeta?.icon || DEFAULT_APP_ICON,
        status,
        webUIPort,
        containerName: primaryContainer.name,
        containers:
          containerNames.length > 1
            ? containerNames
            : dbContainers || containerNames,
        installedAt:
          anyRecord?.createdAt?.getTime?.() || Date.now(),
      });
    }

    console.log(
      `[Docker] getInstalledApps: Found ${apps.length} installed apps`,
    );
    return apps;
  } catch (error) {
    console.error("[Docker] getInstalledApps: Error:", error);
    return [];
  }
}

/**
 * Get a single installed app by id
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
  appId: string,
): Promise<"running" | "stopped" | "error"> {
  try {
    if (!validateAppId(appId)) {
      return "error";
    }

    const containerName = getContainerName(appId);
    const { stdout } = await execAsync(
      `docker inspect -f '{{.State.Status}}' ${containerName}`,
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
      await logAction(
        "app:webui:resolve:error",
        { appId, reason: "invalid-app-id" },
        "warn",
      );
      return null;
    }

    await logAction("app:webui:resolve:start", { appId });

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

    let resolvedUrl: string | null = null;
    let resolutionMethod:
      | "host-port"
      | "metadata-port"
      | "path-only"
      | "unresolved" = "unresolved";

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

    // 2b) Check installConfig.webUIPort for custom-deployed apps
    const installConfig = await getInstallConfig(appId);
    const configWebUIPort = installConfig?.webUIPort as string | undefined;

    if (hostPort) {
      resolvedUrl = `${protocol}://${host}:${hostPort}${pathSuffix}`;
      resolutionMethod = "host-port";
    } else if (configWebUIPort && validatePort(configWebUIPort)) {
      resolvedUrl = `${protocol}://${host}:${configWebUIPort}${pathSuffix}`;
      resolutionMethod = "metadata-port";
    } else if (appMeta?.port && validatePort(appMeta.port)) {
      resolvedUrl = `${protocol}://${host}:${appMeta.port}${pathSuffix}`;
      resolutionMethod = "metadata-port";
    } else if (pathSuffix) {
      resolvedUrl = `${protocol}://${host}${pathSuffix}`;
      resolutionMethod = "path-only";
    }

    if (resolvedUrl) {
      await logAction("app:webui:resolve:success", {
        appId,
        url: resolvedUrl,
        method: resolutionMethod,
      });
      return resolvedUrl;
    }

    await logAction(
      "app:webui:resolve:error",
      { appId, reason: "unresolved" },
      "warn",
    );
    return null;
  } catch (error) {
    await logAction(
      "app:webui:resolve:error",
      {
        appId,
        reason: "exception",
        message: (error as Error)?.message,
      },
      "error",
    );
    console.error(
      `[Docker] getAppWebUI: failed to resolve URL for ${appId}:`,
      error,
    );
    return null;
  }
}

/**
 * Get app logs
 */
export async function getAppLogs(
  appId: string,
  lines: number = 100,
): Promise<string> {
  console.log(
    `[Docker] getAppLogs: Getting logs for app "${appId}" (last ${lines} lines)...`,
  );

  try {
    if (!validateAppId(appId)) {
      console.warn(`[Docker] getAppLogs: Invalid app ID: "${appId}"`);
      return "Error: Invalid app ID";
    }

    const containerName = getContainerName(appId);
    const command = `docker logs --tail ${lines} ${containerName}`;
    console.log(`[Docker] getAppLogs: Executing: ${command}`);

    const { stdout, stderr } = await execAsync(command);
    const logs = stdout || stderr;
    if (!logs) {
      console.log(`[Docker] getAppLogs: No logs available for "${appId}"`);
      return "No logs available";
    }

    console.log(
      `[Docker] getAppLogs: Retrieved ${logs.split("\n").length} lines of logs for "${appId}"`,
    );
    return logs;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(
      `[Docker] getAppLogs: Error getting logs for "${appId}":`,
      error,
    );
    return `Error retrieving logs: ${errorMessage}`;
  }
}
