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

const execAsync = promisify(exec);

const CASA_COMMUNITY_LIST_URL =
  "https://awesome.casaos.io/content/3rd-party-app-stores/list.html";
const PUBLIC_ROOT = path.join(process.cwd(), "public");
const CASA_STORE_ROOT = path.join(PUBLIC_ROOT, "external-apps");

export type CommunityStore = {
  id: string;
  name: string;
  description: string;
  sourceUrls: string[];
  repoUrl?: string;
};

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
  meta?: { name?: string; description?: string }
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
          port: app.port ?? null,
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
          port: app.port ?? null,
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
    console.error("Failed to import CasaOS store:", error);
    return { success: false, error: error.message || "Failed to import store" };
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
        section.matchAll(/<code>(https?:\/\/[^<]+?\.zip)\s*<\/code>/gi)
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
  targetDir: string
): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "liveos-store-"));
  const zipPath = path.join(tmpDir, "store.zip");
  await fs.writeFile(zipPath, buffer);
  try {
    await execAsync(`unzip -oq "${zipPath}" -d "${targetDir}"`);
  } catch (error: any) {
    throw new Error(
      `Failed to extract store archive (unzip required): ${
        error?.message ?? "unknown error"
      }`
    );
  }
}

async function parseCasaStore(
  storeDir: string,
  storeId: string
): Promise<App[]> {
  const files = await listFiles(storeDir);
  const manifestFiles = files.filter(
    (file) => path.basename(file).toLowerCase() === "app.json"
  );
  const composeFiles = files.filter((file) =>
    ["docker-compose.yml", "docker-compose.yaml"].includes(
      path.basename(file).toLowerCase()
    )
  );

  const apps: Map<string, App> = new Map();

  // Parse app.json manifests if present
  for (const manifestPath of manifestFiles) {
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
      const appDir = path.dirname(manifestPath);
      const appId = manifest.id || manifest.name || path.basename(appDir);
      const icon = resolveAsset(manifest.icon || manifest.logo, storeId, appDir);
      const screenshots = Array.isArray(manifest.screenshots || manifest.gallery)
        ? (manifest.screenshots || manifest.gallery).map((item: string) =>
            resolveAsset(item, storeId, appDir)
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
        title: manifest.title || manifest.name || appId,
        name: appId,
        icon:
          icon ??
          "https://raw.githubusercontent.com/IceWhaleTech/CasaOS-AppStore/master/logo.png",
        tagline: manifest.tagline || manifest.description || "",
        overview: manifest.description || manifest.tagline || "",
        category: category.filter(Boolean),
        developer:
          manifest.developer || manifest.author || manifest.maintainer || "Unknown",
        screenshots,
        version: manifest.version,
        port: manifest.port,
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
            resolveAsset(item, storeId, appDir)
          )
        : [];

      const categories = xCasa.category || xCasa.categories;
      const category = Array.isArray(categories)
        ? categories
        : typeof categories === "string"
        ? [categories]
        : [];

      const title = xCasa.title?.en_us || xCasa.title || appId;
      const tagline =
        xCasa.tagline?.en_us ||
        xCasa.tagline ||
        xCasa.description?.en_us ||
        "";
      const overview = xCasa.description?.en_us || xCasa.description || tagline;

      const ports =
        compose?.services?.[xCasa.main]?.ports ||
        (Object.values(compose?.services || {}) as any[])?.[0]?.ports;
      const firstPort =
        Array.isArray(ports) && ports.length > 0 ? ports[0] : undefined;
      const publishedPort =
        typeof firstPort === "string"
          ? parseInt(firstPort.split(":")[0], 10)
          : typeof firstPort === "object"
          ? firstPort.published ?? firstPort.target
          : undefined;

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
        port: publishedPort,
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
  return results;
}

function resolveAsset(
  asset: string | undefined,
  storeId: string,
  appDir: string
): string | undefined {
  if (!asset) return undefined;
  if (asset.startsWith("http://") || asset.startsWith("https://")) return asset;
  const absolute = path.join(appDir, asset);
  const relativeToPublic = path.relative(PUBLIC_ROOT, absolute);
  if (relativeToPublic && !relativeToPublic.startsWith("..")) {
    return `/${relativeToPublic.replace(/\\/g, "/")}`;
  }
  const relative = path.relative(process.cwd(), absolute);
  if (relative && !relative.startsWith("..")) return `/${relative.replace(/\\/g, "/")}`;
  const safePath = asset.replace(/^\.?\//, "");
  return `/external-apps/${storeId}/${safePath}`;
}
