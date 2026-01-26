import prisma from "@/lib/prisma";
import { DEFAULT_APP_ICON, FALLBACK_APP_NAME } from "./utils";

/**
 * Get app metadata from database
 */
export async function getAppMeta(
  appId: string,
  override?: { name?: string; icon?: string }
) {
  const appMeta = await prisma.app.findFirst({
    where: { appId },
    orderBy: { createdAt: "desc" },
  });

  return {
    name:
      override?.name ||
      appMeta?.title ||
      appMeta?.name ||
      appId ||
      FALLBACK_APP_NAME,
    icon: override?.icon || appMeta?.icon || DEFAULT_APP_ICON,
  };
}

/**
 * Record an installed app in the database
 */
export async function recordInstalledApp(
  appId: string,
  containerName: string,
  override?: { name?: string; icon?: string }
): Promise<void> {
  const meta = await getAppMeta(appId, override);

  await prisma.installedApp.upsert({
    where: { containerName },
    update: { appId, name: meta.name, icon: meta.icon },
    create: { appId, name: meta.name, icon: meta.icon, containerName },
  });
}

/**
 * Get recorded container name for an app
 */
export async function getRecordedContainerName(appId: string): Promise<string | null> {
  try {
    const record = await prisma.installedApp.findFirst({
      where: { appId },
      orderBy: { updatedAt: "desc" },
      select: { containerName: true },
    });
    return record?.containerName || null;
  } catch {
    return null;
  }
}

/**
 * Remove installed app record from database
 */
export async function removeInstalledAppRecord(containerName: string): Promise<void> {
  await prisma.installedApp.delete({ where: { containerName } }).catch(() => null);
}

/**
 * Get all installed app records from database
 */
export async function getInstalledAppRecords() {
  return prisma.installedApp.findMany();
}

/**
 * Get all app metadata records from database
 */
export async function getAllAppMeta() {
  return prisma.app.findMany();
}
