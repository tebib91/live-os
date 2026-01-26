import fs from "fs/promises";
import path from "path";

export const PUBLIC_ROOT = path.join(process.cwd());
export const DEFAULT_APP_ICON = "/default-application-icon.png";

export async function listFiles(dir: string): Promise<string[]> {
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

export function resolveAsset(
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

  const relativeToCwd = path.relative(process.cwd(), absolute);
  if (relativeToCwd && !relativeToCwd.startsWith("..")) {
    return `/${relativeToCwd.replace(/\\/g, "/")}`;
  }

  const safePath = asset.replace(/^\.?\//, "");
  return `/api/external-apps/${storeId}/${safePath}`;
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
