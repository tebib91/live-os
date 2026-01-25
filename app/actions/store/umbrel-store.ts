import type { App } from "@/components/app-store/types";
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
