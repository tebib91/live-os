import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import YAML from "yaml";

export const execAsync = promisify(exec);

export const CONTAINER_PREFIX = process.env.CONTAINER_PREFIX || "";
export const DEFAULT_APP_ICON = "/icons/default-application-icon.png";
export const STORES_ROOT = path.join(process.cwd(), "external-apps");
export const INTERNAL_APPS_ROOT = path.join(process.cwd(), "internal-apps");
export const CUSTOM_APPS_ROOT = path.join(process.cwd(), "custom-apps");
export const FALLBACK_APP_NAME = "Application";

/**
 * Validate appId to prevent path traversal
 */
export function validateAppId(appId: string): boolean {
  if (!appId || appId.includes("..") || appId.includes("/")) {
    return false;
  }
  return true;
}

/**
 * Validate port number (1024-65535 for non-root)
 */
export function validatePort(port: string | number): boolean {
  const portNum = typeof port === "string" ? parseInt(port, 10) : port;
  return portNum >= 1 && portNum <= 65535;
}

/**
 * Validate path to prevent path traversal
 */
export function validatePath(pathStr: string): boolean {
  if (!pathStr || pathStr.includes("..")) {
    return false;
  }
  if (pathStr.startsWith("/") && !pathStr.startsWith("/DATA")) {
    return false;
  }
  return true;
}

/**
 * Get container name for an app
 */
export function getContainerName(appId: string): string {
  return `${CONTAINER_PREFIX}${appId.toLowerCase()}`;
}

/**
 * Detect container name from running compose project
 */
export async function detectComposeContainerName(
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

/**
 * Resolve host port from container inspection
 */
export async function resolveHostPort(containerName: string): Promise<string | null> {
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

/**
 * Find docker-compose.yml for an app across all store roots
 */
export async function findComposeForApp(
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
      "[Docker] findComposeForApp: Error searching compose files: " + error
    );
  }

  console.warn(
    "[Docker] findComposeForApp: Compose file not found for app: " + appId
  );
  return null;
}

/**
 * Sanitize compose file by removing invalid services (e.g., app_proxy without image)
 */
export async function sanitizeComposeFile(composePath: string): Promise<string> {
  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(raw);
    if (doc?.services?.app_proxy) {
      const proxy = doc.services.app_proxy;
      if (!proxy.image && !proxy.build) {
        delete doc.services.app_proxy;
        console.log(
          "[Docker] sanitizeCompose: removed app_proxy service with no image/build",
        );
      }
    }

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "liveos-compose-"));
    const tmpPath = path.join(tmpDir, path.basename(composePath));
    await fs.writeFile(tmpPath, YAML.stringify(doc), "utf-8");
    return tmpPath;
  } catch (error) {
    console.warn(
      "[Docker] sanitizeCompose: failed, using original compose file: ",
      (error as Error)?.message || error,
    );
    return composePath;
  }
}

/**
 * Get system defaults for CasaOS reserved variables
 */
export function getSystemDefaults(): {
  PUID: string;
  PGID: string;
  TZ: string;
} {
  return {
    PUID: process.env.PUID || String(process.getuid?.() ?? 1000),
    PGID: process.env.PGID || String(process.getgid?.() ?? 1000),
    TZ: process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

/**
 * Get host architecture for filtering CasaOS apps
 */
export function getHostArchitecture(): string {
  const arch = os.arch();
  switch (arch) {
    case "x64":
      return "amd64";
    case "arm64":
      return "arm64";
    case "arm":
      return "arm";
    default:
      return arch;
  }
}

/**
 * Read container name from compose file
 * CasaOS compose files often have container_name set explicitly
 */
export async function getContainerNameFromCompose(
  composePath: string,
  mainService?: string,
): Promise<string | null> {
  try {
    const raw = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(raw) as {
      name?: string;
      services?: Record<string, { container_name?: string }>;
      "x-casaos"?: { main?: string };
    };

    if (!doc?.services) return null;

    // Determine main service (from x-casaos.main or first service)
    const xCasa = doc["x-casaos"];
    const serviceName =
      mainService ||
      xCasa?.main ||
      Object.keys(doc.services)[0];

    if (!serviceName) return null;

    const service = doc.services[serviceName];
    if (!service) return null;

    // Return container_name if explicitly set
    if (service.container_name) {
      return service.container_name;
    }

    // Fallback: docker compose generates names as <project>-<service>-<replica>
    // The project name comes from the `name` field or directory name
    const projectName = doc.name?.toLowerCase();
    if (projectName) {
      return projectName;
    }

    return null;
  } catch (error) {
    console.warn(
      "[Docker] getContainerNameFromCompose: failed to read compose file:",
      (error as Error)?.message || error,
    );
    return null;
  }
}

/**
 * Get the best container name for an app
 * Priority: compose container_name > compose project name > generated name
 */
export async function resolveContainerName(
  appId: string,
  composePath?: string,
): Promise<string> {
  if (composePath) {
    const fromCompose = await getContainerNameFromCompose(composePath);
    if (fromCompose) {
      console.log(
        `[Docker] resolveContainerName: Using compose container_name "${fromCompose}" for ${appId}`,
      );
      return fromCompose;
    }
  }

  return getContainerName(appId);
}
