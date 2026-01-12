'use server';

import type { App } from '@/components/app-store/types';
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

/**
 * Main function to get all apps from the umbrel-apps-ref directory
 */
export async function getAppStoreApps(): Promise<App[]> {
  try {
    const appStorePath = path.join(process.cwd(), 'umbrel-apps-ref');

    // Read all folders in umbrel-apps-ref directory
    const entries = await fs.readdir(appStorePath, { withFileTypes: true });
    const appFolders = entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));

    // Parse each app folder
    const appPromises = appFolders.map(async (folder) => {
      const appPath = path.join(appStorePath, folder.name);
      return await parseUmbrelApp(appPath, folder.name);
    });

    const apps = await Promise.all(appPromises);

    // Filter out null results and sort alphabetically
    const validApps = apps.filter((app): app is App => app !== null);
    return validApps.sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    console.error('Failed to load AppStore apps:', error);
    return [];
  }
}

/**
 * Parse Umbrel app format (umbrel-app.yml)
 */
async function parseUmbrelApp(appPath: string, folderName: string): Promise<App | null> {
  try {
    const umbrelAppPath = path.join(appPath, 'umbrel-app.yml');

    // Check if umbrel-app.yml exists
    try {
      await fs.access(umbrelAppPath);
    } catch {
      return null; // File doesn't exist
    }

    const content = await fs.readFile(umbrelAppPath, 'utf-8');
    const umbrelApp = YAML.parse(content);

    // Parse category - handle both string and array
    let categories: string[] = ['Other'];
    if (umbrelApp.category) {
      categories = Array.isArray(umbrelApp.category)
        ? umbrelApp.category
        : [umbrelApp.category];
    }

    // Get icon from Umbrel CDN or fallback
    const icon = await getAppIcon(folderName, umbrelApp.id || folderName);

    // Get gallery images from Umbrel CDN if available
    const screenshots = await getGalleryImages(folderName, umbrelApp.gallery || []);

    const app: App = {
      id: umbrelApp.id || folderName,
      title: umbrelApp.name || folderName,
      name: umbrelApp.id || folderName.toLowerCase(),
      icon: icon,
      tagline: umbrelApp.tagline || '',
      overview: cleanDescription(umbrelApp.description || ''),
      category: categories,
      developer: umbrelApp.developer || 'Unknown',
      screenshots: screenshots,
      version: umbrelApp.version || '1.0.0',
      port: umbrelApp.port,
      path: umbrelApp.path || '',
      website: umbrelApp.website,
      repo: umbrelApp.repo,
    };

    return app;
  } catch (error) {
    console.error(`Failed to parse umbrel-app.yml for ${folderName}:`, error);
    return null;
  }
}

/**
 * Get app icon from Umbrel CDN or fallback sources
 * Umbrel hosts icons at: https://getumbrel.github.io/umbrel-apps-gallery/[app-id]/icon.svg
 */
async function getAppIcon(folderName: string, appId: string): Promise<string> {
  // Try Umbrel CDN first (their official gallery)
  const umbrelCdnUrls = [
    `https://getumbrel.github.io/umbrel-apps-gallery/${appId}/icon.svg`,
    `https://getumbrel.github.io/umbrel-apps-gallery/${appId}/icon.png`,
    `https://raw.githubusercontent.com/getumbrel/umbrel-apps/master/${appId}/icon.svg`,
    `https://raw.githubusercontent.com/getumbrel/umbrel-apps/master/${appId}/icon.png`,
  ];

  // Return first CDN URL (we'll validate it client-side or in future implementation)
  return umbrelCdnUrls[0];
}

/**
 * Get gallery/screenshot images from Umbrel CDN
 */
async function getGalleryImages(folderName: string, galleryFiles: string[]): Promise<string[]> {
  if (!galleryFiles || galleryFiles.length === 0) {
    return [];
  }

  // Umbrel hosts gallery images at: https://getumbrel.github.io/umbrel-apps-gallery/[app-id]/[1-5].jpg
  return galleryFiles.map(fileName => {
    return `https://getumbrel.github.io/umbrel-apps-gallery/${folderName}/${fileName}`;
  });
}

/**
 * Clean up description text (remove excessive newlines, format properly)
 */
function cleanDescription(description: string): string {
  if (!description) return '';

  return description
    .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
    .trim();
}

/**
 * Get installed apps (apps currently running via Docker)
 */
export async function getInstalledApps(): Promise<App[]> {
  // TODO: Implement Docker integration to check running containers
  // For now, return empty array
  return [];
}
