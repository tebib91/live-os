"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { App } from "@/components/app-store/types";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import YAML from "yaml";
import { logAction } from "./logger";

const execAsync = promisify(exec);

const CASA_COMMUNITY_LIST_URL =
  "https://awesome.casaos.io/content/3rd-party-app-stores/list.html";
const PUBLIC_ROOT = path.join(process.cwd());
const CASA_STORE_ROOT = path.join(PUBLIC_ROOT, "external-apps");
const CASA_OFFICIAL_ZIP =
  "https://github.com/IceWhaleTech/CasaOS-AppStore/archive/refs/heads/main.zip";

export type CommunityStore = {
  id: string;
  name: string;
  description: string;
  sourceUrls: string[];
  repoUrl?: string;
};

export async function listImportedStores(): Promise<string[]> {
  try {
    await fs.mkdir(CASA_STORE_ROOT, { recursive: true });
    const entries = await fs.readdir(CASA_STORE_ROOT, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));
  } catch (error) {
    console.error("Failed to list imported stores:", error);
    return [];
  }
}

export async function removeImportedStore(slug: string): Promise<boolean> {
  if (!slug) return false;
  const target = path.join(CASA_STORE_ROOT, slug);
  try {
    await fs.rm(target, { recursive: true, force: true });
    await prisma.store.deleteMany({ where: { slug } });
    await prisma.app.deleteMany({ where: { store: { slug } } });
    return true;
  } catch (error) {
    console.error("Failed to remove imported store:", error);
    return false;
  }
}

function pickLocalizedText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = ["en_us", "en_US", "en", "default"];
    for (const key of preferred) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
    }
    const firstString = Object.values(record).find(
      (v) => typeof v === "string" && v.trim(),
    );
    if (typeof firstString === "string") return firstString;
  }
  return fallback;
}

/**
 * Load apps from the persisted store database.
 */
export async function getAppStoreApps(): Promise<App[]> {
  try {
    const records = await prisma.app.findMany({
      orderBy: [{ title: "asc" }],
      include: { store: true },
    });

    return records.map((record) => ({
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
  } catch (error) {
    console.error("Failed to load AppStore apps:", error);
    return [];
  }
}

/**
 * Placeholder for installed apps; currently not implemented.
 */
export async function getInstalledApps(): Promise<App[]> {
  return [];
}

/**
 * Download and extract a CasaOS app store ZIP into external-apps/<slug>
 * and persist store/app metadata to the database.
 */
export async function importCasaStore(
  url: string,
  meta?: { name?: string; description?: string },
): Promise<{
  success: boolean;
  error?: string;
  storeId?: string;
  apps?: number;
}> {
  if (!url || !url.startsWith("http")) {
    return { success: false, error: "Invalid store URL." };
  }
  if (!url.endsWith(".zip")) {
    return { success: false, error: "Store URL must point to a ZIP file." };
  }

  const storeSlug = slugify(url);
  const targetDir = path.join(CASA_STORE_ROOT, storeSlug);

  try {
    await logAction("appstore:import:start", { url, storeSlug });
    await fs.mkdir(CASA_STORE_ROOT, { recursive: true });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download store: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Clear any existing store folder
    await fs.rm(targetDir, { recursive: true, force: true });
    await fs.mkdir(targetDir, { recursive: true });

    // Extract ZIP using system unzip
    await extractZipBuffer(buffer, targetDir);

    const parsedApps = await parseCasaStore(targetDir, storeSlug);

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
 * Idempotent: skips if already imported.
 */
export async function ensureDefaultCasaStoreInstalled(): Promise<{
  success: boolean;
  skipped?: boolean;
  error?: string;
}> {
  const slug = slugify(CASA_OFFICIAL_ZIP);
  const targetDir = path.join(CASA_STORE_ROOT, slug);

  try {
    await fs.mkdir(CASA_STORE_ROOT, { recursive: true });
    const dirExists = await fs
      .stat(targetDir)
      .then(() => true)
      .catch(() => false);
    const storeExists = await prisma.store.findFirst({ where: { slug } });

    if (dirExists && storeExists) {
      return { success: true, skipped: true };
    }

    await logAction("appstore:bootstrap:official:start");
    const result = await importCasaStore(CASA_OFFICIAL_ZIP, {
      name: "CasaOS Official Store",
      description: "Preloaded CasaOS application catalog",
    });

    return result.success
      ? { success: true, skipped: false }
      : { success: false, error: result.error };
  } catch (error: any) {
    await logAction("appstore:bootstrap:official:error", {
      error: error?.message || "unknown",
    });
    return { success: false, error: error?.message || "Unknown error" };
  }
}

/**
 * Fetch list of CasaOS community app stores from the Awesome CasaOS page.
 */
export async function getCasaCommunityStores(): Promise<CommunityStore[]> {
  try {
    const response = await fetch(CASA_COMMUNITY_LIST_URL, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch CasaOS list: ${response.statusText}`);
    }

    const html = await response.text();
    const sections = html.split(/<h2[^>]*>/i).slice(1);
    const stores: CommunityStore[] = [];

    for (const section of sections) {
      const nameMatch = section.match(/>#<\/a>\s*([^<]+)<\/h2>/i);
      if (!nameMatch) continue;

      const rawName = nameMatch[1].trim();
      const name = rawName.replace(/^\d+\.\s*/, "").trim();
      if (!name) continue;

      const descriptionMatch = section.match(/<p>([\s\S]*?)<\/p>/i);
      const description = cleanHtmlText(descriptionMatch?.[1] ?? "");

      const sourceUrls = Array.from(
        section.matchAll(/<code>(https?:\/\/[^<]+?\.zip)\s*<\/code>/gi),
      ).map((match) => match[1]);
      if (sourceUrls.length === 0) continue;

      const repoMatch = section.match(/href="(https?:\/\/github\.com[^"]+)"/i);

      stores.push({
        id: slugify(name),
        name,
        description,
        sourceUrls,
        repoUrl: repoMatch?.[1],
      });
    }

    return stores;
  } catch (error) {
    console.error("Failed to load CasaOS community stores:", error);
    return [];
  }
}

function cleanHtmlText(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
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

async function parseCasaStore(
  storeDir: string,
  storeId: string,
): Promise<App[]> {
  const pickPort = (candidate: any): number | undefined => {
    if (candidate == null) return undefined;
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string") {
      const match = candidate.match(/(\d{2,5})/);
      if (match) {
        const num = parseInt(match[1], 10);
        return Number.isFinite(num) ? num : undefined;
      }
      return undefined;
    }
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const resolved = pickPort(item);
        if (resolved !== undefined) return resolved;
      }
    }
    if (typeof candidate === "object") {
      for (const value of Object.values(candidate)) {
        const resolved = pickPort(value);
        if (resolved !== undefined) return resolved;
      }
    }
    return undefined;
  };

  const files = await listFiles(storeDir);
  const manifestFiles = files.filter(
    (file) => path.basename(file).toLowerCase() === "app.json",
  );
  const composeFiles = files.filter((file) =>
    ["docker-compose.yml", "docker-compose.yaml"].includes(
      path.basename(file).toLowerCase(),
    ),
  );

  const apps: Map<string, App> = new Map();

  // Parse app.json manifests if present
  for (const manifestPath of manifestFiles) {
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      const appDir = path.dirname(manifestPath);
      const appId = manifest.id || manifest.name || path.basename(appDir);
      const title = pickLocalizedText(
        manifest.title,
        typeof manifest.name === "string" ? manifest.name : appId,
      );
      const tagline = pickLocalizedText(
        manifest.tagline || manifest.description,
        "",
      );
      const overview = pickLocalizedText(manifest.description, tagline);
      const icon = resolveAsset(
        manifest.icon || manifest.logo,
        storeId,
        appDir,
      );
      const screenshots = Array.isArray(
        manifest.screenshots || manifest.gallery,
      )
        ? (manifest.screenshots || manifest.gallery).map((item: string) =>
            resolveAsset(item, storeId, appDir),
          )
        : [];

      const categories = manifest.categories || manifest.category;
      const category = Array.isArray(categories)
        ? categories
        : typeof categories === "string"
          ? [categories]
          : [];

      apps.set(appId, {
        id: appId,
        title,
        name: appId,
        icon:
          icon ??
          "https://raw.githubusercontent.com/IceWhaleTech/CasaOS-AppStore/master/logo.png",
        tagline,
        overview,
        category: category.filter(Boolean),
        developer:
          manifest.developer ||
          manifest.author ||
          manifest.maintainer ||
          "Unknown",
        screenshots,
        version: manifest.version,
        port: pickPort(manifest.port ?? manifest.port_map ?? manifest.ports),
        path: manifest.path,
        website: manifest.homepage || manifest.website,
        repo: manifest.source || manifest.repo,
        composePath: "",
      });
    } catch (error) {
      console.warn(`Failed to parse manifest at ${manifestPath}:`, error);
    }
  }

  // Parse CasaOS docker-compose metadata if present
  for (const composePath of composeFiles) {
    try {
      const content = await fs.readFile(composePath, "utf-8");
      const compose = YAML.parse(content) as any;
      const xCasa = compose?.["x-casaos"] ?? {};
      const appDir = path.dirname(composePath);
      const appId = path.basename(appDir);
      const icon = resolveAsset(xCasa.icon || xCasa.thumbnail, storeId, appDir);
      const screenshots = Array.isArray(xCasa.screenshots || xCasa.gallery)
        ? (xCasa.screenshots || xCasa.gallery).map((item: string) =>
            resolveAsset(item, storeId, appDir),
          )
        : [];

      const categories = xCasa.category || xCasa.categories;
      const category = Array.isArray(categories)
        ? categories
        : typeof categories === "string"
          ? [categories]
          : [];

      const title = pickLocalizedText(
        xCasa.title,
        appId,
      );
      const tagline = pickLocalizedText(
        xCasa.tagline || xCasa.description,
        "",
      );
      const overview = pickLocalizedText(xCasa.description, tagline);

      const ports =
        compose?.services?.[xCasa.main]?.ports ||
        (Object.values(compose?.services || {}) as any[])?.[0]?.ports;
      const firstPort =
        Array.isArray(ports) && ports.length > 0 ? ports[0] : undefined;
      const publishedPortRaw =
        typeof firstPort === "string"
          ? parseInt(firstPort.split(":")[0], 10)
          : typeof firstPort === "object"
            ? (firstPort.published ?? firstPort.target)
            : undefined;
      const portNumber: number | undefined =
        typeof publishedPortRaw === "string"
          ? parseInt(publishedPortRaw, 10)
          : typeof publishedPortRaw === "number"
          ? publishedPortRaw
          : undefined;
      const fallbackPort = pickPort(
        xCasa.port_map ?? xCasa.port ?? xCasa.portmap ?? xCasa.portMap,
      );

      apps.set(appId, {
        id: appId,
        title,
        name: appId,
        icon:
          icon ??
          "https://raw.githubusercontent.com/IceWhaleTech/CasaOS-AppStore/master/logo.png",
        tagline,
        overview,
        category: category.filter(Boolean),
        developer: xCasa.developer || xCasa.author || "Unknown",
        screenshots,
        version: xCasa.version,
        port:
          Number.isFinite(portNumber as number) && portNumber !== undefined
            ? portNumber
            : fallbackPort,
        path: xCasa.path,
        website: xCasa.homepage || xCasa.website,
        repo: xCasa.source || xCasa.repo,
        composePath,
      });
    } catch (error) {
      console.warn(`Failed to parse compose at ${composePath}:`, error);
    }
  }

  return Array.from(apps.values());
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
  console.log(`[appstore] listFiles: found ${results.length} entries under ${dir}`);
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
