"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { App } from "@/components/app-store/types";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import YAML from "yaml";
import { logAction, withActionLogging } from "./logger";

const execAsync = promisify(exec);

const PUBLIC_ROOT = path.join(process.cwd());
const STORE_ROOT = path.join(PUBLIC_ROOT, "external-apps");
const UMBREL_GALLERY_BASE =
  "https://raw.githubusercontent.com/getumbrel/umbrel-apps-gallery/refs/heads/master";

// Umbrel official store
const UMBREL_OFFICIAL_ZIP =
  "https://github.com/getumbrel/umbrel-apps/archive/refs/heads/master.zip";

// Community stores can be added via the UI
export type CommunityStore = {
  id: string;
  name: string;
  description: string;
  sourceUrls: string[];
  repoUrl?: string;
};

/**
 * List all imported app stores (directory names).
 */
export async function listImportedStores(): Promise<string[]> {
  return withActionLogging("appstore:listImported", async () => {
    try {
      await fs.mkdir(STORE_ROOT, { recursive: true });
      const entries = await fs.readdir(STORE_ROOT, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b));
    } catch (error) {
      console.error("Failed to list imported stores:", error);
      return [];
    }
  });
}

/**
 * Remove an imported store by its slug.
 */
export async function removeImportedStore(slug: string): Promise<boolean> {
  return withActionLogging("appstore:removeImported", async () => {
    if (!slug) return false;
    const target = path.join(STORE_ROOT, slug);
    try {
      await fs.rm(target, { recursive: true, force: true });
      await prisma.store.deleteMany({ where: { slug } });
      await prisma.app.deleteMany({ where: { store: { slug } } });
      return true;
    } catch (error) {
      console.error("Failed to remove imported store:", error);
      return false;
    }
  });
}

/**
 * Load apps from the persisted store database.
 */
export async function getAppStoreApps(): Promise<App[]> {
  return withActionLogging("appstore:list", async () => {
    await logAction("appstore:list:start");
    try {
      const records = await prisma.app.findMany({
        orderBy: [{ title: "asc" }],
        include: { store: true },
      });

      const apps = records.map((record) => ({
        id: record.appId,
        title: record.title,
        name: record.name,
        icon: record.icon,
        tagline: record.tagline ?? "",
        overview: record.overview ?? "",
        category: Array.isArray(record.category)
          ? (record.category as string[])
          : [],
        developer: record.developer ?? "Unknown",
        screenshots: Array.isArray(record.screenshots)
          ? (record.screenshots as string[])
          : [],
        version: record.version ?? undefined,
        port: record.port ?? undefined,
        path: record.path ?? undefined,
        website: record.website ?? undefined,
        repo: record.repo ?? undefined,
        composePath: record.composePath,
      }));
      await logAction("appstore:list:done", { count: apps.length });
      return apps;
    } catch (error) {
      await logAction("appstore:list:error", {
        error: (error as Error)?.message || "unknown",
      });
      return [];
    }
  });
}

/**
 * Placeholder for installed apps; currently not implemented.
 */
export async function getInstalledApps(): Promise<App[]> {
  return withActionLogging("appstore:getInstalledApps", async () => []);
}

/**
 * Download and extract an Umbrel-compatible app store ZIP into external-apps/<slug>
 * and persist store/app metadata to the database.
 */
export async function importUmbrelStore(
  url: string,
  meta?: { name?: string; description?: string },
): Promise<{
  success: boolean;
  error?: string;
  storeId?: string;
  apps?: number;
  skipped?: boolean;
}> {
  if (!url || !url.startsWith("http")) {
    return { success: false, error: "Invalid store URL." };
  }
  if (!url.endsWith(".zip")) {
    return { success: false, error: "Store URL must point to a ZIP file." };
  }

  const storeSlug = slugify(url);
  const targetDir = path.join(STORE_ROOT, storeSlug);

  try {
    await logAction("appstore:import:start", { url, storeSlug });
    await fs.mkdir(STORE_ROOT, { recursive: true });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download store: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const zipHash = crypto.createHash("sha256").update(buffer).digest("hex");

    const existingStore = await prisma.store.findUnique({
      where: { slug: storeSlug },
    });
    const targetExists = await fs
      .stat(targetDir)
      .then(() => true)
      .catch(() => false);

    const manifestHash = (existingStore as any)?.manifestHash as
      | string
      | undefined;

    if (existingStore && manifestHash === zipHash && targetExists) {
      const appsCount = await prisma.app.count({
        where: { storeId: existingStore.id },
      });
      await logAction("appstore:import:skip-cache", {
        url,
        storeSlug,
        apps: appsCount,
      });
      return {
        success: true,
        storeId: storeSlug,
        apps: appsCount,
        skipped: true,
      };
    }

    // Clear any existing store folder
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    // Extract ZIP using system unzip
    await extractZipBuffer(buffer, targetDir);

    const parsedApps = await parseUmbrelStore(targetDir, storeSlug);

    // Upsert store
    const store = await prisma.store.upsert({
      where: { slug: storeSlug },
      update: {
        url,
        name: meta?.name ?? storeSlug,
        description: meta?.description,
        localPath: targetDir,
      },
      create: {
        slug: storeSlug,
        url,
        name: meta?.name ?? storeSlug,
        description: meta?.description,
        localPath: targetDir,
      },
    });

    // Upsert apps
    for (const app of parsedApps) {
      const categories = app.category ?? [];
      const screenshots = app.screenshots ?? [];
      await prisma.app.upsert({
        where: { storeId_appId: { storeId: store.id, appId: app.id } },
        update: {
          title: app.title,
          name: app.name,
          icon: app.icon,
          tagline: app.tagline,
          overview: app.overview,
          category: categories,
          developer: app.developer,
          screenshots,
          version: app.version,
          port: Number.isFinite(app.port as number)
            ? (app.port as number)
            : null,
          path: app.path,
          website: app.website,
          repo: app.repo,
          composePath: app.composePath || "",
        },
        create: {
          storeId: store.id,
          appId: app.id,
          title: app.title,
          name: app.name,
          icon: app.icon,
          tagline: app.tagline,
          overview: app.overview,
          category: categories,
          developer: app.developer,
          screenshots,
          version: app.version,
          port: Number.isFinite(app.port as number)
            ? (app.port as number)
            : null,
          path: app.path,
          website: app.website,
          repo: app.repo,
          composePath: app.composePath || "",
        },
      });
    }

    await logAction("appstore:import:done", {
      url,
      storeSlug,
      apps: parsedApps.length,
    });

    return {
      success: true,
      storeId: store.slug,
      apps: parsedApps.length,
    };
  } catch (error: any) {
    await logAction("appstore:import:error", {
      url,
      error: error?.message || "unknown",
    });
    return { success: false, error: error.message || "Failed to import store" };
  }
}

/**
 * Best-effort bootstrap of the official Umbrel store.
 * Idempotent: skips if already imported.
 */
export async function ensureDefaultUmbrelStoreInstalled(): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const slug = slugify(UMBREL_OFFICIAL_ZIP);
  const targetDir = path.join(STORE_ROOT, slug);

  try {
    await fs.mkdir(STORE_ROOT, { recursive: true });
    const dirExists = await fs
      .stat(targetDir)
      .then(() => true)
      .catch(() => false);
    const storeExists = await prisma.store.findFirst({ where: { slug } });

    if (dirExists && storeExists) {
      return { success: true, skipped: true };
    }

    await logAction("appstore:bootstrap:umbrel:start");
    const result = await importUmbrelStore(UMBREL_OFFICIAL_ZIP, {
      name: "Umbrel App Store",
      description: "Official Umbrel application catalog",
    });

    return result.success
      ? { success: true, skipped: false }
      : { success: false, error: result.error };
  } catch (error: any) {
    await logAction("appstore:bootstrap:umbrel:error", {
      error: error?.message || "unknown",
    });
    return { success: false, error: error?.message || "Unknown error" };
  }
}

/**
 * Get a list of known Umbrel community stores.
 * Unlike CasaOS, Umbrel doesn't have a central community list page.
 * Returns a curated list of popular community stores.
 */
export async function getUmbrelCommunityStores(): Promise<CommunityStore[]> {
  // Popular Umbrel community app stores
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function extractZipBuffer(
  buffer: Buffer,
  targetDir: string,
): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "liveos-store-"));
  const zipPath = path.join(tmpDir, "store.zip");
  await fs.writeFile(zipPath, buffer);

  const extractor = await findZipExtractor();
  if (!extractor) {
    throw new Error(
      "Failed to extract store archive: unzip/bsdtar/tar not available on this system",
    );
  }

  await fs.mkdir(targetDir, { recursive: true });
  try {
    await execAsync(extractor(zipPath, targetDir));
  } catch (error: any) {
    throw new Error(
      `Failed to extract store archive: ${error?.message ?? "unknown error"}`,
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function findZipExtractor(): Promise<
  ((zip: string, dest: string) => string) | null
> {
  const candidates: {
    tool: string;
    build: (zip: string, dest: string) => string;
  }[] = [
    { tool: "unzip", build: (zip, dest) => `unzip -oq "${zip}" -d "${dest}"` },
    {
      tool: "bsdtar",
      build: (zip, dest) => `bsdtar -xf "${zip}" -C "${dest}"`,
    },
    { tool: "tar", build: (zip, dest) => `tar -xf "${zip}" -C "${dest}"` },
  ];

  for (const candidate of candidates) {
    try {
      await execAsync(`command -v ${candidate.tool}`);
      return candidate.build;
    } catch {
      // Try next candidate
    }
  }

  return null;
}

/**
 * Parse an Umbrel app store directory.
 * Umbrel uses umbrel-app.yml manifest files in each app directory.
 */
async function parseUmbrelStore(
  storeDir: string,
  storeId: string,
): Promise<App[]> {
  const files = await listFiles(storeDir);

  // Umbrel uses umbrel-app.yml manifest files
  const manifestFiles = files.filter(
    (file) => path.basename(file).toLowerCase() === "umbrel-app.yml",
  );

  const apps: App[] = [];

  for (const manifestPath of manifestFiles) {
    try {
      const content = await fs.readFile(manifestPath, "utf-8");
      const manifest = YAML.parse(content) as UmbrelManifest;

      if (!manifest.id || !manifest.name) {
        console.warn(
          `Skipping manifest at ${manifestPath}: missing id or name`,
        );
        continue;
      }

      const appDir = path.dirname(manifestPath);
      const appId = manifest.id;

      // Resolve icon - prefer declared URL, fall back to Umbrel CDN gallery
      const icon = await resolveUmbrelIcon(
        manifest.icon,
        storeId,
        appDir,
        appId,
      );

      // Resolve gallery images (screenshots)
      const screenshots = Array.isArray(manifest.gallery)
        ? await Promise.all(
            manifest.gallery.map((item: string) =>
              resolveUmbrelGalleryAsset(item, storeId, appDir, appId),
            ),
          )
        : [];

      // Normalize category - Umbrel uses single category string
      const category = manifest.category ? [manifest.category] : [];

      // Find the docker-compose file for this app
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
      console.warn(
        `Failed to parse Umbrel manifest at ${manifestPath}:`,
        error,
      );
    }
  }

  return apps;
}

/**
 * Umbrel manifest structure (umbrel-app.yml)
 */
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

async function listFiles(dir: string): Promise<string[]> {
  console.log(`[appstore] listFiles: scanning ${dir}`);
  const results: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const child = await listFiles(fullPath);
      results.push(...child);
    } else {
      results.push(fullPath);
    }
  }
  console.log(
    `[appstore] listFiles: found ${results.length} entries under ${dir}`,
  );
  return results;
}

function resolveAsset(
  asset: string | undefined,
  storeId: string,
  appDir: string,
): string | undefined {
  if (!asset) return undefined;
  if (asset.startsWith("http://") || asset.startsWith("https://")) return asset;
  const absolute = path.join(appDir, asset);
  const relativeToPublic = path.relative(PUBLIC_ROOT, absolute);
  if (relativeToPublic && !relativeToPublic.startsWith("..")) {
    return `/${relativeToPublic.replace(/\\/g, "/")}`;
  }
  const relative = path.relative(process.cwd(), absolute);
  if (relative && !relative.startsWith(".."))
    return `/${relative.replace(/\\/g, "/")}`;
  const safePath = asset.replace(/^\.?\//, "");
  return `/external-apps/${storeId}/${safePath}`;
}

async function resolveUmbrelIcon(
  manifestIcon: string | undefined,
  storeId: string,
  appDir: string,
  appId: string,
): Promise<string> {
  // 1) Explicit remote icon in manifest wins
  if (
    manifestIcon?.startsWith("http://") ||
    manifestIcon?.startsWith("https://")
  ) {
    return manifestIcon;
  }

  // 2) If a local icon exists inside the extracted store, use it
  if (manifestIcon) {
    const iconPath = path.isAbsolute(manifestIcon)
      ? manifestIcon
      : path.join(appDir, manifestIcon);
    if (await fileExists(iconPath)) {
      const resolved = resolveAsset(manifestIcon, storeId, appDir);
      if (resolved) return resolved;
    }
  }
  console.log(
    `[appstore] resolveUmbrelIcon: falling back to gallery icon for app ${appId}`,
  );
  // 3) Fallback to Umbrel gallery CDN (canonical source for Umbrel apps)
  return `${UMBREL_GALLERY_BASE}/${appId}/icon.svg`;
}

async function resolveUmbrelGalleryAsset(
  asset: string,
  storeId: string,
  appDir: string,
  appId: string,
): Promise<string | undefined> {
  if (!asset) return undefined;

  // Explicit remote URL
  if (asset.startsWith("http://") || asset.startsWith("https://")) return asset;

  // Check local extracted file
  const assetPath = path.isAbsolute(asset) ? asset : path.join(appDir, asset);
  if (await fileExists(assetPath)) {
    return resolveAsset(asset, storeId, appDir);
  }
  console.log(
    `[appstore] resolveUmbrelGalleryAsset: asset not found locally: ${assetPath}`,
  );
  // Fallback to Umbrel CDN gallery
  return `${UMBREL_GALLERY_BASE}/${appId}/${asset}`;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Refresh all imported stores by re-downloading and re-parsing them.
 */
export async function refreshAllStores(): Promise<{
  success: boolean;
  results: { slug: string; success: boolean; apps?: number; error?: string }[];
}> {
  return withActionLogging("appstore:refreshAll", async () => {
    await logAction("appstore:refreshAll:start");
    const results: {
      slug: string;
      success: boolean;
      apps?: number;
      error?: string;
    }[] = [];

    try {
      const stores = await prisma.store.findMany();

      for (const store of stores) {
        if (!store.url) {
          results.push({ slug: store.slug, success: false, error: "No URL" });
          continue;
        }

        try {
          const result = await importUmbrelStore(store.url, {
            name: store.name ?? undefined,
            description: store.description ?? undefined,
          });

          results.push({
            slug: store.slug,
            success: result.success,
            apps: result.apps,
            error: result.error,
          });
        } catch (error: any) {
          results.push({
            slug: store.slug,
            success: false,
            error: error?.message || "Unknown error",
          });
        }
      }

      await logAction("appstore:refreshAll:done", { results });
      return { success: true, results };
    } catch (error: any) {
      await logAction("appstore:refreshAll:error", {
        error: error?.message || "unknown",
      });
      return { success: false, results };
    }
  });
}

/**
 * Get details about all imported stores.
 */
export async function getImportedStoreDetails(): Promise<
  {
    slug: string;
    name: string;
    description: string | null;
    url: string | null;
    appCount: number;
  }[]
> {
  return withActionLogging("appstore:getStoreDetails", async () => {
    try {
      const stores = await prisma.store.findMany({
        include: { _count: { select: { apps: true } } },
      });

      return stores.map((store) => ({
        slug: store.slug,
        name: store.name ?? store.slug,
        description: store.description,
        url: store.url,
        appCount: store._count.apps,
      }));
    } catch (error) {
      console.error("Failed to get store details:", error);
      return [];
    }
  });
}

/**
 * Read the docker-compose.yml content for a given app.
 * Returns the raw YAML content as a string.
 */
export async function getAppComposeContent(
  composePath: string,
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    if (!composePath) {
      return { success: false, error: "No compose path provided" };
    }

    // Resolve the path - composePath might be absolute or relative
    let fullPath = composePath;
    if (!path.isAbsolute(composePath)) {
      fullPath = path.join(process.cwd(), composePath);
    }

    // Security check - ensure path is within allowed directories
    const cwd = process.cwd();
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(cwd) && !resolvedPath.startsWith("/DATA")) {
      return { success: false, error: "Invalid compose path" };
    }

    const content = await fs.readFile(resolvedPath, "utf-8");
    return { success: true, content };
  } catch (error) {
    console.error("Failed to read compose file:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to read compose file",
    };
  }
}
