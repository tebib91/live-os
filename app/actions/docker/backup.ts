import fs from "fs/promises";
import path from "path";
import { execAsync } from "./utils";

const BACKUP_ROOT = "/DATA/AppBackups";

/**
 * Backup a compose file before an update.
 * Returns the backup file path, or null on failure.
 */
export async function backupComposeFile(
  composePath: string,
  appId: string,
): Promise<string | null> {
  try {
    const backupDir = path.join(BACKUP_ROOT, appId);
    await fs.mkdir(backupDir, { recursive: true });
    const dest = path.join(backupDir, "docker-compose.backup.yml");
    await fs.copyFile(composePath, dest);
    return dest;
  } catch (error) {
    console.warn(`[Backup] Failed to backup compose for ${appId}:`, error);
    return null;
  }
}

/**
 * Restore a compose file from a backup.
 */
export async function restoreComposeFile(
  backupPath: string,
  originalPath: string,
): Promise<boolean> {
  try {
    await fs.copyFile(backupPath, originalPath);
    return true;
  } catch (error) {
    console.error(`[Backup] Failed to restore compose:`, error);
    return false;
  }
}

/**
 * Backup the container inspect output as JSON.
 */
export async function backupContainerConfig(
  containerName: string,
  appId: string,
): Promise<string | null> {
  try {
    const backupDir = path.join(BACKUP_ROOT, appId);
    await fs.mkdir(backupDir, { recursive: true });
    const { stdout } = await execAsync(
      `docker inspect "${containerName}"`,
    );
    const dest = path.join(backupDir, "container-inspect.json");
    await fs.writeFile(dest, stdout, "utf-8");
    return dest;
  } catch (error) {
    console.warn(`[Backup] Failed to backup container config for ${appId}:`, error);
    return null;
  }
}

/**
 * Clean up backup directory for an app.
 */
export async function cleanupBackup(appId: string): Promise<void> {
  try {
    const backupDir = path.join(BACKUP_ROOT, appId);
    await fs.rm(backupDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup
  }
}
