import prisma from "@/lib/prisma";

export interface DependencyCheckResult {
  satisfied: boolean;
  missing: string[];
}

/**
 * Check whether all dependencies for an app are installed.
 */
export async function checkDependencies(
  appId: string,
): Promise<DependencyCheckResult> {
  try {
    const app = await prisma.app.findFirst({
      where: { appId },
      orderBy: { createdAt: "desc" },
      select: { container: true },
    });

    const container = app?.container as
      | { dependencies?: string[] }
      | null
      | undefined;
    const deps = container?.dependencies;

    if (!deps || deps.length === 0) {
      return { satisfied: true, missing: [] };
    }

    const installed = await prisma.installedApp.findMany({
      select: { appId: true },
    });
    const installedSet = new Set(installed.map((a) => a.appId));

    const missing = deps.filter((dep) => !installedSet.has(dep));
    return { satisfied: missing.length === 0, missing };
  } catch (error) {
    console.warn(`[Dependencies] Failed to check dependencies for ${appId}:`, error);
    // If we can't check, don't block installation
    return { satisfied: true, missing: [] };
  }
}
