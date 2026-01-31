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
import {
    CASAOS_OFFICIAL_ZIP,
    getCasaCommunityStores,
    isLikelyCasaStore,
    parseCasaOSStore,
} from "./store/casa-store";
import {
    getUmbrelCommunityStores,
    isLikelyUmbrelStore,
    parseUmbrelStore,
} from "./store/umbrel-store";
import { listFiles, resolveAsset } from "./store/utils";

const execAsync = promisify(exec);

const STORE_ROOT = path.join(process.cwd(), "external-apps");
const CASAOS_RECOMMEND_LIST_URL =
  "https://raw.githubusercontent.com/live-doctor/live-os/refs/heads/main/recommend-list.json";

type StoreFormat = "casaos" | "umbrel";

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
        container: (record as any)?.container ?? undefined,
        storeName: record.store?.name ?? undefined,
        storeSlug: record.store?.slug ?? undefined,
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

export async function getCasaOsRecommendList(): Promise<string[]> {
  return withActionLogging("appstore:casaos:recommendations", async () => {
    try {
      const response = await fetch(CASAOS_RECOMMEND_LIST_URL, {
        cache: "no-store",
      });
      if (!response.ok) {
        return [];
      }

      const parsed = (await response.json()) as Array<
        { appid?: string } | string
      >;
      const ids = parsed
        .map((item) => (typeof item === "string" ? item : item?.appid))
        .filter(Boolean)
        .map((id) => String(id).toLowerCase());

      return Array.from(new Set(ids));
    } catch (error) {
      console.warn("[appstore] Failed to read CasaOS recommend list:", error);
      return [];
    }
  });
}

/**
 * Download and extract a CasaOS- or Umbrel-compatible app store ZIP into external-apps/<slug>
 * and persist store/app metadata to the database.
 */
export async function importAppStore(
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
  const urlNameFallback =
    url.split("/").pop()?.replace(/\.zip$/i, "") || storeSlug;
  let resolvedStoreName = meta?.name ?? urlNameFallback ?? storeSlug;

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

    const manifestHash =
      (existingStore as any)?.manifestHash?.toString() ?? undefined;

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

    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });
    await extractZipBuffer(buffer, targetDir);

    // Try to derive a friendly name from the extracted folder if none was provided.
    if (!meta?.name) {
      resolvedStoreName =
        (await deriveStoreName(targetDir, urlNameFallback, storeSlug)) ??
        resolvedStoreName;
    }

    const storeFormat = await detectStoreFormat(targetDir);
    const parsedApps =
      storeFormat === "casaos"
        ? await parseCasaOSStore(targetDir, storeSlug)
        : await parseUmbrelStore(targetDir, storeSlug);
    if (parsedApps.length === 0) {
      throw new Error("No applications found in the downloaded store archive.");
    }

    const store = await prisma.store.upsert({
      where: { slug: storeSlug },
      update: {
        url,
        name: resolvedStoreName,
        description: meta?.description,
        localPath: targetDir,
        manifestHash: zipHash,
      },
      create: {
        slug: storeSlug,
        url,
        name: resolvedStoreName,
        description: meta?.description,
        localPath: targetDir,
        manifestHash: zipHash,
      },
    });

    for (const app of parsedApps) {
      const categories = app.category ?? [];
      const screenshots = app.screenshots ?? [];
      const developer =
        app.developer === undefined || app.developer === null
          ? null
          : String(app.developer);

      await prisma.app.upsert({
        where: { storeId_appId: { storeId: store.id, appId: app.id } },
        update: {
          title: app.title,
          name: app.name,
          icon: app.icon,
          tagline: app.tagline,
          overview: app.overview,
          category: categories,
          developer,
          screenshots,
          version: app.version,
          port: Number.isFinite(app.port as number)
            ? (app.port as number)
            : null,
          path: app.path,
          website: app.website,
          repo: app.repo,
          composePath: app.composePath || "",
          container: (app.container ?? undefined) as never,
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
          developer,
          screenshots,
          version: app.version,
          port: Number.isFinite(app.port as number)
            ? (app.port as number)
            : null,
          path: app.path,
          website: app.website,
          repo: app.repo,
          composePath: app.composePath || "",
          container: (app.container ?? undefined) as never,
        },
      });
    }

    const parsedIds = parsedApps.map((a) => a.id);
    if (parsedIds.length > 0) {
      await prisma.app.deleteMany({
        where: {
          storeId: store.id,
          appId: { notIn: parsedIds },
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
 * Best-effort bootstrap of the official CasaOS store.
 */
export async function ensureDefaultCasaStoreInstalled(): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const slug = slugify(CASAOS_OFFICIAL_ZIP);
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

    await logAction("appstore:bootstrap:casaos:start");
    const result = await importAppStore(CASAOS_OFFICIAL_ZIP, {
      name: "CasaOS App Store",
      description: "Official CasaOS application catalog",
    });

    return result.success
      ? { success: true, skipped: false }
      : { success: false, error: result.error };
  } catch (error: any) {
    await logAction("appstore:bootstrap:casaos:error", {
      error: error?.message || "unknown",
    });
    return { success: false, error: error?.message || "Unknown error" };
  }
}

export { getCasaCommunityStores, getUmbrelCommunityStores };

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
      // try next
    }
  }

  return null;
}

async function detectStoreFormat(storeDir: string): Promise<StoreFormat> {
  const files = await listFiles(storeDir);
  if (isLikelyUmbrelStore(files)) return "umbrel";
  if (isLikelyCasaStore(files)) return "casaos";
  return "casaos";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function deriveStoreName(
  targetDir: string,
  fallback: string,
  storeSlug: string,
): Promise<string | null> {
  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    if (dirs.length === 1) {
      return dirs[0];
    }
    if (dirs.length > 1) {
      // Prefer a folder that matches the slug or fallback
      const matchSlug = dirs.find((d) => d.includes(storeSlug));
      if (matchSlug) return matchSlug;
      const matchFallback = dirs.find((d) => d.includes(fallback));
      if (matchFallback) return matchFallback;
    }
  } catch {
    // ignore
  }
  return null;
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
          const result = await importAppStore(store.url, {
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

    let fullPath = composePath;
    if (!path.isAbsolute(composePath)) {
      fullPath = path.join(process.cwd(), composePath);
    }

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

/**
 * Fetch docker-compose content for an installed app by its appId.
 * Looks up the app in the store DB to resolve composePath and returns content + metadata.
 */
export async function getComposeForApp(appId: string): Promise<{
  success: boolean;
  content?: string;
  appTitle?: string;
  appIcon?: string;
  container?: {
    image: string;
    ports: { container: string; published: string }[];
    volumes: { source: string; container: string }[];
    environment: { key: string; value: string }[];
  };
  error?: string;
}> {
  try {
    if (!appId) {
      return { success: false, error: "Missing appId" };
    }

    // Primary: look up from InstalledApp (single source of truth)
    const installed = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
    });

    if (!installed) {
      return { success: false, error: "App metadata not found" };
    }

    const config = installed.installConfig as Record<string, unknown> | null;
    const composePath = (config?.composePath as string) ?? undefined;

    let content: string | undefined;
    if (composePath) {
      const composeResult = await getAppComposeContent(composePath);
      if (composeResult.success && composeResult.content) {
        content = composeResult.content;
      }
    }

    const container = (installed.container as Record<string, unknown>) ?? undefined;

    if (!content && !container) {
      return {
        success: false,
        error: "No compose file or container config found for this app",
      };
    }

    return {
      success: true,
      content,
      appTitle: installed.name || installed.appId,
      appIcon: installed.icon || undefined,
      container: (container as any) || undefined,
    };
  } catch (error) {
    console.error("Failed to load compose for app:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load compose",
    };
  }
}

/**
 * Return media assets (screenshots/thumbnail/icon) for an app.
 * Falls back to parsing the compose manifest when DB data is missing.
 */
export async function getAppMedia(appId: string): Promise<{
  success: boolean;
  screenshots: string[];
  thumbnail?: string;
  icon?: string;
  error?: string;
}> {
  try {
    if (!appId)
      return { success: false, screenshots: [], error: "Missing appId" };

    const app = await prisma.app.findFirst({
      where: { appId },
      include: { store: true },
    });

    if (!app) {
      return {
        success: false,
        screenshots: [],
        error: "App metadata not found",
      };
    }

    const storeSlug = app.store?.slug || app.storeId;
    const baseScreens =
      Array.isArray(app.screenshots) && app.screenshots.length > 0
        ? (app.screenshots as string[])
        : [];

    let screenshots = baseScreens;
    let thumbnail: string | undefined;

    if ((!screenshots.length || !thumbnail) && app.composePath) {
      const compose = await getAppComposeContent(app.composePath);
      if (compose.success && compose.content) {
        try {
          const doc = YAML.parse(compose.content) as {
            ["x-casaos"]?: Record<string, unknown>;
            x_casaos?: Record<string, unknown>;
          };
          const xCasa = (doc["x-casaos"] || doc.x_casaos || {}) as Record<
            string,
            unknown
          >;
          const rawScreens =
            (xCasa.screenshot_link as unknown) ??
            xCasa.screenshot ??
            xCasa.screenshots ??
            xCasa.gallery ??
            [];
          const list = Array.isArray(rawScreens)
            ? rawScreens
            : [rawScreens].filter(Boolean);
          const appDir = path.dirname(
            path.isAbsolute(app.composePath)
              ? app.composePath
              : path.join(process.cwd(), app.composePath),
          );
          screenshots = list
            .map((item) =>
              typeof item === "string"
                ? resolveAsset(item, storeSlug, appDir)
                : undefined,
            )
            .filter(Boolean) as string[];

          const thumbRaw = xCasa.thumbnail as string | undefined;
          if (thumbRaw) {
            thumbnail = resolveAsset(thumbRaw, storeSlug, appDir);
          }
        } catch (parseError) {
          console.warn(
            "[appstore] Failed to parse compose for media:",
            parseError,
          );
        }
      }
    }

    return {
      success: true,
      screenshots,
      thumbnail,
      icon: app.icon,
    };
  } catch (error) {
    console.error("[appstore] getAppMedia error:", error);
    return {
      success: false,
      screenshots: [],
      error: error instanceof Error ? error.message : "Failed to load media",
    };
  }
}
