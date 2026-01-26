import type {
  App,
  AppTips,
  EnvConfig,
  PortConfig,
  VolumeConfig,
} from "@/components/app-store/types";
import type { CommunityStore } from "./types";
import { DEFAULT_APP_ICON, listFiles, resolveAsset } from "./utils";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

export const CASAOS_OFFICIAL_ZIP =
  "https://github.com/IceWhaleTech/CasaOS-AppStore/archive/refs/heads/main.zip";

/**
 * Parse a CasaOS app store directory into App objects
 */
export async function parseCasaOSStore(
  storeDir: string,
  storeId: string,
): Promise<App[]> {
  const files = await listFiles(storeDir);
  const composeFiles = files.filter((file) =>
    /docker-compose\.ya?ml$/i.test(file),
  );

  const apps: App[] = [];

  for (const composePath of composeFiles) {
    if (!composePath.toLowerCase().includes(`${path.sep}apps${path.sep}`)) {
      continue;
    }

    try {
      const content = await fs.readFile(composePath, "utf-8");
      const manifest = YAML.parse(content) as CasaManifest;
      const xCasa: CasaMeta =
        (manifest["x-casaos"] as CasaMeta | undefined) ??
        (manifest.x_casaos as CasaMeta | undefined) ??
        {};

      const appDir = path.dirname(composePath);
      const rawId = manifest?.name || path.basename(appDir);
      const appId = String(rawId).toLowerCase();

      // Basic metadata
      const title =
        getLocalizedValue(xCasa.title) ??
        getLocalizedValue(xCasa.name) ??
        String(rawId);
      const tagline =
        getLocalizedValue(xCasa.tagline) ??
        getLocalizedValue(xCasa.description) ??
        "";
      const overview =
        getLocalizedValue(xCasa.description) ??
        getLocalizedValue(xCasa.tagline) ??
        tagline;

      const category = normalizeCategory(xCasa.category);
      const developer = xCasa.developer ?? xCasa.author ?? "Unknown";
      const icon =
        resolveAsset(xCasa.icon, storeId, appDir) ?? DEFAULT_APP_ICON;

      // Screenshots (support both screenshot_link and screenshots)
      const screenshots = await resolveScreenshots(xCasa, storeId, appDir);
      const version =
        typeof xCasa.version === "string" ? xCasa.version : undefined;
      const port = parsePortMap(xCasa.port_map ?? xCasa.port);
      const pathSuffix =
        typeof xCasa.index === "string" ? xCasa.index : undefined;
      const website = xCasa.homepage ?? xCasa.website ?? undefined;
      const repo = xCasa.repo ?? xCasa.project_url ?? undefined;

      // CasaOS-specific fields
      const architectures = normalizeArchitectures(xCasa.architectures);
      const tips = parseTips(xCasa.tips);
      const thumbnail = resolveAsset(xCasa.thumbnail, storeId, appDir);

      // Container metadata with service-level x-casaos descriptions
      const container = buildContainerMetadata(manifest, xCasa);

      apps.push({
        id: appId,
        title,
        name: appId,
        icon,
        tagline: tagline || overview || "",
        overview: overview || tagline || "",
        category,
        developer,
        screenshots,
        version,
        port,
        path: pathSuffix,
        website,
        repo,
        composePath: path.relative(process.cwd(), composePath),
        architectures,
        tips,
        thumbnail,
        container: container ?? undefined,
      });
    } catch (error) {
      console.warn(
        `[appstore] parseCasaOSStore: failed for ${composePath}:`,
        error,
      );
    }
  }

  return apps;
}

export function getCasaCommunityStores(): CommunityStore[] {
  return [
    {
      id: "casaos-official",
      name: "CasaOS Official Store",
      description: "Verified apps maintained by the CasaOS team.",
      sourceUrls: [CASAOS_OFFICIAL_ZIP],
      repoUrl: "https://github.com/IceWhaleTech/CasaOS-AppStore",
    },
    {
      id: "big-bear",
      name: "BigBear CasaOS Store",
      description: "Popular self-hosted apps curated by BigBearTechWorld.",
      sourceUrls: [
        "https://github.com/bigbeartechworld/big-bear-casaos/archive/refs/heads/main.zip",
      ],
      repoUrl: "https://github.com/bigbeartechworld/big-bear-casaos",
    },
  ];
}

export function isLikelyCasaStore(files: string[]): boolean {
  return files.some(
    (file) =>
      /docker-compose\.ya?ml$/i.test(file) &&
      file.toLowerCase().includes(`${path.sep}apps${path.sep}`),
  );
}

// ============================================================================
// Helper functions
// ============================================================================

function getLocalizedValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as Record<string, string>;
    return (
      record.en_US ||
      record.en_us ||
      record.en ||
      record["en-US"] ||
      record.en_GB ||
      Object.values(record)[0]
    );
  }
  return undefined;
}

function normalizeCategory(category: unknown): string[] {
  if (!category) return [];
  if (Array.isArray(category)) {
    return category
      .map((c) => (typeof c === "string" ? c : String(c)))
      .filter(Boolean);
  }
  if (typeof category === "string") return [category];
  return [];
}

function normalizeArchitectures(archs: unknown): string[] | undefined {
  if (!archs) return undefined;
  if (Array.isArray(archs)) {
    const normalized = archs
      .map((a) => (typeof a === "string" ? a.toLowerCase() : String(a).toLowerCase()))
      .filter(Boolean);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof archs === "string") return [archs.toLowerCase()];
  return undefined;
}

/**
 * Parse tips from x-casaos.tips
 */
function parseTips(tips: unknown): AppTips | undefined {
  if (!tips || typeof tips !== "object") return undefined;

  const tipsObj = tips as CasaTips;
  const beforeInstall = getLocalizedValue(tipsObj.before_install);

  if (!beforeInstall) return undefined;

  return { beforeInstall };
}

/**
 * Resolve screenshots from multiple possible fields:
 * - screenshot_link (CasaOS official format)
 * - screenshot
 * - screenshots
 * - gallery
 */
async function resolveScreenshots(
  xCasa: CasaMeta,
  storeId: string,
  appDir: string,
): Promise<string[]> {
  // CasaOS uses screenshot_link as the primary field
  const rawScreens =
    xCasa.screenshot_link ??
    xCasa.screenshot ??
    xCasa.screenshots ??
    xCasa.gallery ??
    [];
  const list = Array.isArray(rawScreens)
    ? rawScreens
    : [rawScreens].filter(Boolean);
  const resolved = await Promise.all(
    list.map(async (item: string) => resolveAsset(item, storeId, appDir)),
  );
  return resolved.filter(Boolean) as string[];
}

function parsePortMap(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const numeric = parseInt(value.replace(/[^\d]/g, ""), 10);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}

/**
 * Build container metadata with service-level x-casaos descriptions
 */
function buildContainerMetadata(
  manifest: CasaManifest,
  xCasa: CasaMeta,
): {
  image: string;
  ports: PortConfig[];
  volumes: VolumeConfig[];
  environment: EnvConfig[];
} | null {
  const services = manifest?.services ?? {};
  const mainServiceName = xCasa?.main || Object.keys(services)[0] || undefined;
  if (!mainServiceName) return null;

  const service = services[mainServiceName];
  if (!service) return null;

  // Get service-level x-casaos for descriptions
  const serviceXCasa = service["x-casaos"] as ServiceXCasaos | undefined;

  const ports = normalizePortsWithDescriptions(
    service.ports || [],
    serviceXCasa?.ports,
  );
  const volumes = normalizeVolumesWithDescriptions(
    service.volumes || [],
    serviceXCasa?.volumes,
  );
  const environment = normalizeEnvWithDescriptions(
    service.environment || [],
    serviceXCasa?.envs,
  );

  return {
    image: service.image || "",
    ports,
    volumes,
    environment,
  };
}

/**
 * Normalize ports with descriptions from service-level x-casaos
 */
function normalizePortsWithDescriptions(
  rawPorts: Array<string | PortObject>,
  descriptions?: PortDescription[],
): PortConfig[] {
  const descMap = new Map<string, string>();
  if (descriptions) {
    for (const desc of descriptions) {
      const container = desc.container?.toString() || "";
      const text = getLocalizedValue(desc.description);
      if (container && text) {
        descMap.set(container, text);
      }
    }
  }

  const results: PortConfig[] = [];

  for (const port of rawPorts || []) {
    if (typeof port === "string") {
      const [hostPart, containerPartRaw] = port.split(":");
      const [containerPart, protocolPart] = (containerPartRaw || hostPart).split("/");
      const container = containerPart?.toString() || "";
      if (container) {
        const desc = descMap.get(container);
        results.push({
          container,
          published: hostPart?.toString() || container,
          protocol: (protocolPart || "tcp").toString(),
          ...(desc && { description: desc }),
        });
      }
    } else if (typeof port === "object" && port !== null) {
      const container = (port.target ?? port.container ?? port.port ?? "").toString();
      const published = (port.published ?? port.host ?? port.host_port ?? container).toString();
      const protocol = (port.protocol ?? "tcp").toString();
      if (container) {
        const desc = descMap.get(container);
        results.push({
          container,
          published,
          protocol,
          ...(desc && { description: desc }),
        });
      }
    }
  }

  return results;
}

/**
 * Normalize volumes with descriptions from service-level x-casaos
 */
function normalizeVolumesWithDescriptions(
  rawVolumes: Array<string | VolumeObject>,
  descriptions?: VolumeDescription[],
): VolumeConfig[] {
  const descMap = new Map<string, string>();
  if (descriptions) {
    for (const desc of descriptions) {
      const container = desc.container?.toString() || "";
      const text = getLocalizedValue(desc.description);
      if (container && text) {
        descMap.set(container, text);
      }
    }
  }

  const results: VolumeConfig[] = [];

  for (const vol of rawVolumes || []) {
    if (typeof vol === "string") {
      const parts = vol.split(":");
      const source = parts[0] || "";
      const container = parts[1] || source;
      if (container) {
        const desc = descMap.get(container);
        results.push({
          container,
          source,
          ...(desc && { description: desc }),
        });
      }
    } else if (typeof vol === "object" && vol !== null) {
      const container = (vol.target ?? vol.container ?? "").toString();
      const source = (
        vol.source ??
        vol.from ??
        (vol.type === "volume" ? vol.name : undefined) ??
        ""
      ).toString();
      if (container) {
        const desc = descMap.get(container);
        results.push({
          container,
          source,
          ...(desc && { description: desc }),
        });
      }
    }
  }

  return results;
}

/**
 * Normalize environment variables with descriptions from service-level x-casaos
 */
function normalizeEnvWithDescriptions(
  rawEnv: Array<string | EnvObject> | Record<string, string | number> | undefined,
  descriptions?: EnvDescription[],
): EnvConfig[] {
  const descMap = new Map<string, string>();
  if (descriptions) {
    for (const desc of descriptions) {
      const key = desc.container?.toString() || "";
      const text = getLocalizedValue(desc.description);
      if (key && text) {
        descMap.set(key, text);
      }
    }
  }

  const envArray: EnvConfig[] = [];

  if (Array.isArray(rawEnv)) {
    for (const item of rawEnv) {
      if (typeof item === "string" && item.includes("=")) {
        const [key, ...rest] = item.split("=");
        const desc = descMap.get(key);
        envArray.push({
          key,
          value: rest.join("="),
          ...(desc && { description: desc }),
        });
      } else if (typeof item === "object" && item) {
        const key = (item.key ?? item.name ?? "").toString();
        if (key) {
          const desc = descMap.get(key);
          envArray.push({
            key,
            value: String(item.value ?? ""),
            ...(desc && { description: desc }),
          });
        }
      }
    }
  } else if (rawEnv && typeof rawEnv === "object") {
    for (const [key, value] of Object.entries(rawEnv)) {
      const desc = descMap.get(key);
      envArray.push({
        key,
        value: String(value ?? ""),
        ...(desc && { description: desc }),
      });
    }
  }

  return envArray;
}

// ============================================================================
// Type definitions
// ============================================================================

type LocalizedString = string | Record<string, string>;

type CasaTips = {
  before_install?: LocalizedString;
};

type CasaMeta = {
  title?: LocalizedString;
  name?: LocalizedString;
  tagline?: LocalizedString;
  description?: LocalizedString;
  category?: string | string[];
  developer?: string;
  author?: string;
  icon?: string;
  version?: string;
  port_map?: number | string;
  port?: number | string;
  index?: string;
  homepage?: string;
  website?: string;
  repo?: string;
  project_url?: string;
  main?: string;
  // Screenshots - multiple possible field names
  screenshot?: string | string[];
  screenshots?: string | string[];
  screenshot_link?: string | string[]; // CasaOS official format
  gallery?: string | string[];
  // CasaOS-specific fields
  architectures?: string[];
  tips?: CasaTips;
  thumbnail?: string;
};

type PortDescription = {
  container?: string | number;
  description?: LocalizedString;
};

type VolumeDescription = {
  container?: string;
  description?: LocalizedString;
};

type EnvDescription = {
  container?: string; // CasaOS uses 'container' for env key
  description?: LocalizedString;
};

type ServiceXCasaos = {
  envs?: EnvDescription[];
  ports?: PortDescription[];
  volumes?: VolumeDescription[];
};

type CasaService = {
  image?: string;
  ports?: Array<string | PortObject>;
  volumes?: Array<string | VolumeObject>;
  environment?: Array<string | EnvObject> | Record<string, string | number>;
  "x-casaos"?: ServiceXCasaos;
};

type PortObject = {
  target?: string | number;
  container?: string | number;
  port?: string | number;
  published?: string | number;
  host?: string | number;
  host_port?: string | number;
  protocol?: string;
};

type VolumeObject = {
  target?: string;
  container?: string;
  source?: string;
  from?: string;
  type?: string;
  name?: string;
};

type EnvObject = {
  key?: string;
  name?: string;
  value?: string | number;
};

type CasaManifest = {
  name?: string;
  services?: Record<string, CasaService>;
  "x-casaos"?: CasaMeta;
  x_casaos?: CasaMeta;
};
