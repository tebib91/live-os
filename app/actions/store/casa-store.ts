import type { App } from "@/components/app-store/types";
import type { CommunityStore } from "./types";
import {
  DEFAULT_APP_ICON,
  listFiles,
  resolveAsset,
} from "./utils";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

export const CASAOS_OFFICIAL_ZIP =
  "https://github.com/IceWhaleTech/CasaOS-AppStore/archive/refs/heads/main.zip";

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

      const screenshots = await resolveScreenshots(xCasa, storeId, appDir);
      const version =
        typeof xCasa.version === "string" ? xCasa.version : undefined;
      const port = parsePortMap(xCasa.port_map ?? xCasa.port);
      const pathSuffix =
        typeof xCasa.index === "string" ? xCasa.index : undefined;
      const website = xCasa.homepage ?? xCasa.website ?? undefined;
      const repo = xCasa.repo ?? xCasa.project_url ?? undefined;

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

async function resolveScreenshots(
  xCasa: CasaMeta,
  storeId: string,
  appDir: string,
): Promise<string[]> {
  const rawScreens =
    xCasa.screenshot ?? xCasa.screenshots ?? xCasa.gallery ?? [];
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

function buildContainerMetadata(manifest: CasaManifest, xCasa: CasaMeta) {
  const services = manifest?.services ?? {};
  const mainServiceName = xCasa?.main || Object.keys(services)[0] || undefined;
  if (!mainServiceName) return undefined;

  const service = services[mainServiceName];
  if (!service) return undefined;

  const ports = normalizePorts(service.ports || []);
  const volumes = normalizeVolumes(service.volumes || []);
  const environment = normalizeEnvironment(service.environment || []);

  return {
    image: service.image || "",
    ports,
    volumes,
    environment,
  };
}

function normalizePorts(rawPorts: Array<string | PortObject>): {
  container: string;
  published: string;
  protocol: string;
}[] {
  return (rawPorts || [])
    .map((port) => {
      if (typeof port === "string") {
        const [hostPart, containerPartRaw] = port.split(":");
        const [containerPart, protocolPart] = (
          containerPartRaw || hostPart
        ).split("/");
        return {
          container: containerPart?.toString() || "",
          published: hostPart?.toString() || containerPart?.toString() || "",
          protocol: (protocolPart || "tcp").toString(),
        };
      }
      if (typeof port === "object" && port !== null) {
        const container = port.target ?? port.container ?? port.port ?? "";
        const published =
          port.published ?? port.host ?? port.host_port ?? container;
        const protocol = port.protocol ?? "tcp";
        return {
          container: container?.toString() || "",
          published: published?.toString() || "",
          protocol: protocol?.toString() || "tcp",
        };
      }
      return null;
    })
    .filter(
      (p): p is { container: string; published: string; protocol: string } =>
        Boolean(p && p.container),
    );
}

function normalizeVolumes(
  rawVolumes: Array<string | VolumeObject>,
): { container: string; source: string }[] {
  return (rawVolumes || [])
    .map((vol) => {
      if (typeof vol === "string") {
        const parts = vol.split(":");
        const source = parts[0] || "";
        const container = parts[1] || source;
        return { container, source };
      }
      if (typeof vol === "object" && vol !== null) {
        const container = vol.target ?? vol.container ?? "";
        const source =
          vol.source ??
          vol.from ??
          (vol.type === "volume" ? vol.name : undefined) ??
          "";
        return {
          container: container?.toString() || "",
          source: source?.toString() || "",
        };
      }
      return null;
    })
    .filter(
      (v): v is { container: string; source: string } =>
        Boolean(v && v.container),
    );
}

function normalizeEnvironment(
  rawEnv:
    | Array<string | EnvObject>
    | Record<string, string | number>
    | undefined,
): { key: string; value: string }[] {
  const envArray: { key: string; value: string }[] = [];

  if (Array.isArray(rawEnv)) {
    rawEnv.forEach((item) => {
      if (typeof item === "string" && item.includes("=")) {
        const [key, ...rest] = item.split("=");
        envArray.push({ key, value: rest.join("=") });
      } else if (typeof item === "object" && item) {
        const key = item.key ?? item.name;
        if (key)
          envArray.push({ key: String(key), value: String(item.value ?? "") });
      }
    });
  } else if (rawEnv && typeof rawEnv === "object") {
    Object.entries(rawEnv).forEach(([key, value]) => {
      envArray.push({ key, value: String(value ?? "") });
    });
  }

  return envArray;
}

type LocalizedString = string | Record<string, string>;

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
  screenshot?: string | string[];
  screenshots?: string | string[];
  gallery?: string | string[];
};

type CasaService = {
  image?: string;
  ports?: Array<string | PortObject>;
  volumes?: Array<string | VolumeObject>;
  environment?: Array<string | EnvObject> | Record<string, string | number>;
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
