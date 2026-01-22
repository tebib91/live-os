"use server";

import fs from "fs/promises";
import path from "path";
import { installApp } from "./docker";
import type { InstallConfig } from "@/components/app-store/types";
import { logAction } from "./logger";

type InternalAppManifest = {
  id: string;
  title?: string;
  name?: string;
  icon?: string;
  volumes?: { container: string; source: string }[];
};

/**
 * Install a bundled internal app (lives under /internal-apps/<id>)
 * by reusing the standard installApp flow.
 */
export async function installInternalApp(appId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  await logAction("internal-app:install:start", { appId });

  try {
    if (!appId || appId.includes("/") || appId.includes("..")) {
      return { success: false, error: "Invalid app id" };
    }

    const manifestPath = path.join(
      process.cwd(),
      "internal-apps",
      appId,
      "app.json",
    );

    const manifestRaw = await fs.readFile(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestRaw) as InternalAppManifest;

    const config: InstallConfig = {
      ports: [],
      volumes:
        manifest.volumes?.map((vol) => ({
          container: vol.container,
          source: vol.source,
        })) ?? [],
      environment: [],
    };

    const result = await installApp(appId, config, {
      name: manifest.title || manifest.name || appId,
      icon: manifest.icon,
    });

    if (!result.success) {
      await logAction("internal-app:install:error", {
        appId,
        error: result.error,
      });
      return { success: false, error: result.error };
    }

    await logAction("internal-app:install:success", { appId });
    return { success: true };
  } catch (error) {
    const message = (error as Error)?.message || "Failed to install app";
    await logAction("internal-app:install:error", { appId, error: message });
    return { success: false, error: message };
  }
}
