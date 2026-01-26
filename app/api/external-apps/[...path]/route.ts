import { promises as fs } from "fs";
import path from "path";

import type { NextRequest } from "next/server";

const EXTERNAL_APPS_ROOT = path.join(process.cwd(), "external-apps");

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_req: NextRequest, context: RouteContext) {
  const { path: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  const unsafeRelative = segments.join("/");
  const resolvedPath = path.resolve(EXTERNAL_APPS_ROOT, unsafeRelative);

  if (!resolvedPath.startsWith(EXTERNAL_APPS_ROOT)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isFile()) {
      return new Response("Not found", { status: 404 });
    }

    const file = await fs.readFile(resolvedPath);
    return new Response(file, {
      status: 200,
      headers: {
        "Content-Type": getMimeType(resolvedPath),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return new Response("Not found", { status: 404 });
    }
    console.error("[external-apps] Failed to serve asset:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
