import type {
  App,
  EnvConfig,
  PortConfig,
  VolumeConfig,
} from "@/components/app-store/types";
import {
  fileExists,
  listFiles,
  resolveAsset,
} from "./utils";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

export const UMBREL_GALLERY_BASE =
  "https://raw.githubusercontent.com/getumbrel/umbrel-apps-gallery/refs/heads/master";

export async function parseUmbrelStore(
  storeDir: string,
  storeId: string,
): Promise<App[]> {
  const files = await listFiles(storeDir);
  const manifestFiles = files.filter(
    (file) => path.basename(file).toLowerCase() === "umbrel-app.yml",
  );

  const apps: App[] = [];

  for (const manifestPath of manifestFiles) {
    try {
      const content = await fs.readFile(manifestPath, "utf-8");
      const manifest = YAML.parse(content) as UmbrelManifest;

      if (!manifest.id || !manifest.name) {
        console.warn(`Skipping manifest at ${manifestPath}: missing id or name`);
        continue;
      }

      const appDir = path.dirname(manifestPath);
      const appId = manifest.id;

      const icon = await resolveUmbrelIcon(
        manifest.icon,
        storeId,
        appDir,
        appId,
      );

      const screenshots = Array.isArray(manifest.gallery)
        ? await Promise.all(
            manifest.gallery.map((item: string) =>
              resolveUmbrelGalleryAsset(item, storeId, appDir, appId),
            ),
          )
        : [];

      const category = manifest.category ? [manifest.category] : [];

      const composeFile = files.find(
        (f) =>
          path.dirname(f) === appDir &&
          ["docker-compose.yml", "docker-compose.yaml"].includes(
            path.basename(f).toLowerCase(),
          ),
      );

      // Parse container metadata from docker-compose
      const container = composeFile
        ? await buildContainerMetadata(composeFile, appId)
        : undefined;

      apps.push({
        id: appId,
        title: manifest.name,
        name: appId,
        icon: icon ?? "https://getumbrel.com/umbrel-logo-rounded.svg",
        tagline: manifest.tagline ?? "",
        overview: manifest.description ?? manifest.tagline ?? "",
        category: category.filter(Boolean),
        developer: manifest.developer ?? "Unknown",
        screenshots: screenshots.filter(Boolean) as string[],
        version: manifest.version,
        port: manifest.port,
        path: manifest.path,
        website: manifest.website,
        repo: manifest.repo,
        composePath: composeFile ?? "",
        container: container ?? undefined,
      });
    } catch (error) {
      console.warn(`Failed to parse Umbrel manifest at ${manifestPath}:`, error);
    }
  }

  return apps;
}

export function isLikelyUmbrelStore(files: string[]): boolean {
  return files.some(
    (file) => path.basename(file).toLowerCase() === "umbrel-app.yml",
  );
}

export function getUmbrelCommunityStores(): { id: string; name: string; description: string; sourceUrls: string[]; repoUrl?: string }[] {
  return [
    {
      id: "umbrel-community",
      name: "Umbrel Community Store",
      description: "Community-maintained apps for Umbrel",
      sourceUrls: [
        "https://github.com/getumbrel/umbrel-community-app-store/archive/refs/heads/main.zip",
      ],
      repoUrl: "https://github.com/getumbrel/umbrel-community-app-store",
    },
  ];
}

interface UmbrelManifest {
  manifestVersion: number;
  id: string;
  name: string;
  tagline?: string;
  icon?: string;
  category?: string;
  version?: string;
  port?: number;
  description?: string;
  developer?: string;
  website?: string;
  repo?: string;
  support?: string;
  gallery?: string[];
  dependencies?: string[];
  path?: string;
  defaultUsername?: string;
  defaultPassword?: string;
  releaseNotes?: string;
  submitter?: string;
  submission?: string;
}

// ============================================================================
// Container metadata from docker-compose
// ============================================================================

async function buildContainerMetadata(
  composePath: string,
  appId: string,
): Promise<{
  image: string;
  ports: PortConfig[];
  volumes: VolumeConfig[];
  environment: EnvConfig[];
} | null> {
  try {
    const content = await fs.readFile(composePath, "utf-8");
    const doc = YAML.parse(content) as ComposeDocument;
    const services = doc?.services;
    if (!services || typeof services !== "object") return null;

    // Prefer a service matching the app id, otherwise use the first service
    const mainKey =
      Object.keys(services).find((k) => k === appId) ??
      Object.keys(services)[0];
    if (!mainKey) return null;

    const service = services[mainKey];
    if (!service) return null;

    return {
      image: service.image || "",
      ports: normalizePorts(service.ports),
      volumes: normalizeVolumes(service.volumes),
      environment: normalizeEnv(service.environment),
    };
  } catch {
    return null;
  }
}

function normalizePorts(
  rawPorts?: Array<string | ComposePortObject>,
): PortConfig[] {
  if (!rawPorts) return [];
  const results: PortConfig[] = [];

  for (const port of rawPorts) {
    if (typeof port === "string") {
      const [hostPart, containerPartRaw] = port.split(":");
      const [containerPart, protocolPart] = (
        containerPartRaw || hostPart
      ).split("/");
      const container = containerPart?.toString() || "";
      if (container) {
        results.push({
          container,
          published: hostPart?.toString() || container,
          protocol: (protocolPart || "tcp").toString(),
        });
      }
    } else if (typeof port === "object" && port !== null) {
      const container = (
        port.target ?? port.container ?? ""
      ).toString();
      const published = (
        port.published ?? port.host ?? container
      ).toString();
      const protocol = (port.protocol ?? "tcp").toString();
      if (container) {
        results.push({ container, published, protocol });
      }
    }
  }

  return results;
}

function normalizeVolumes(
  rawVolumes?: Array<string | ComposeVolumeObject>,
): VolumeConfig[] {
  if (!rawVolumes) return [];
  const results: VolumeConfig[] = [];

  for (const vol of rawVolumes) {
    if (typeof vol === "string") {
      const parts = vol.split(":");
      const source = parts[0] || "";
      const container = parts[1] || source;
      if (container) {
        results.push({ container, source });
      }
    } else if (typeof vol === "object" && vol !== null) {
      const container = (vol.target ?? vol.container ?? "").toString();
      const source = (vol.source ?? vol.from ?? "").toString();
      if (container) {
        results.push({ container, source });
      }
    }
  }

  return results;
}

function normalizeEnv(
  rawEnv?: Array<string> | Record<string, string | number>,
): EnvConfig[] {
  if (!rawEnv) return [];
  const results: EnvConfig[] = [];

  if (Array.isArray(rawEnv)) {
    for (const item of rawEnv) {
      if (typeof item === "string" && item.includes("=")) {
        const [key, ...rest] = item.split("=");
        results.push({ key, value: rest.join("=") });
      }
    }
  } else if (typeof rawEnv === "object") {
    for (const [key, value] of Object.entries(rawEnv)) {
      results.push({ key, value: String(value ?? "") });
    }
  }

  return results;
}

// ============================================================================
// Compose type definitions
// ============================================================================

type ComposePortObject = {
  target?: string | number;
  container?: string | number;
  published?: string | number;
  host?: string | number;
  protocol?: string;
};

type ComposeVolumeObject = {
  target?: string;
  container?: string;
  source?: string;
  from?: string;
};

type ComposeService = {
  image?: string;
  ports?: Array<string | ComposePortObject>;
  volumes?: Array<string | ComposeVolumeObject>;
  environment?: Array<string> | Record<string, string | number>;
};

type ComposeDocument = {
  services?: Record<string, ComposeService>;
};

// ============================================================================
// Icon & gallery resolution
// ============================================================================

async function resolveUmbrelIcon(
  manifestIcon: string | undefined,
  storeId: string,
  appDir: string,
  appId: string,
): Promise<string> {
  if (
    manifestIcon?.startsWith("http://") ||
    manifestIcon?.startsWith("https://")
  ) {
    return manifestIcon;
  }

  if (manifestIcon) {
    const iconPath = path.isAbsolute(manifestIcon)
      ? manifestIcon
      : path.join(appDir, manifestIcon);
    if (await fileExists(iconPath)) {
      const resolved = resolveAsset(manifestIcon, storeId, appDir);
      if (resolved) return resolved;
    }
  }

  return `${UMBREL_GALLERY_BASE}/${appId}/icon.svg`;
}

async function resolveUmbrelGalleryAsset(
  asset: string,
  storeId: string,
  appDir: string,
  appId: string,
): Promise<string | undefined> {
  if (!asset) return undefined;

  if (asset.startsWith("http://") || asset.startsWith("https://")) return asset;

  const assetPath = path.isAbsolute(asset) ? asset : path.join(appDir, asset);
  if (await fileExists(assetPath)) {
    return resolveAsset(asset, storeId, appDir);
  }

  return `${UMBREL_GALLERY_BASE}/${appId}/${asset}`;
}
