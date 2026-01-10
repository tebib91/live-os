'use server';

import type { App } from '@/components/app-store/types';
import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';

/**
 * Main function to get all apps from the AppStore directory
 */
export async function getAppStoreApps(): Promise<App[]> {
  try {
    const appStorePath = path.join(process.cwd(), 'store');

    // Read all folders in AppStore directory
    const entries = await fs.readdir(appStorePath, { withFileTypes: true });
    const appFolders = entries.filter(entry => entry.isDirectory());

    // Parse each app folder
    const appPromises = appFolders.map(async (folder) => {
      const appPath = path.join(appStorePath, folder.name);

      // Try to parse appfile.json first, then fallback to docker-compose.yml
      const app = await parseAppFile(appPath, folder.name)
        || await parseDockerCompose(appPath, folder.name);

      return app;
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
 * Parse appfile.json format (51 apps have this)
 */
async function parseAppFile(appPath: string, folderName: string): Promise<App | null> {
  try {
    const appfilePath = path.join(appPath, 'appfile.json');

    // Check if appfile.json exists
    try {
      await fs.access(appfilePath);
    } catch {
      return null; // File doesn't exist
    }

    const content = await fs.readFile(appfilePath, 'utf-8');
    const appfile = JSON.parse(content);

    const app: App = {
      id: folderName,
      title: appfile.title || folderName,
      name: appfile.name || folderName.toLowerCase(),
      icon: await getAppIcon(appPath, appfile.icon),
      tagline: appfile.tagline || '',
      overview: appfile.overview || '',
      category: Array.isArray(appfile.category)
        ? appfile.category
        : (appfile.category ? [appfile.category] : ['Other']),
      developer: appfile.developer?.name || appfile.developer || 'Unknown',
      screenshots: appfile.screenshots || [],
      version: appfile.version,
      container: appfile.container ? {
        image: appfile.container.image,
        ports: appfile.container.ports || [],
        volumes: appfile.container.volumes || []
      } : undefined
    };

    return app;
  } catch (error) {
    console.error(`Failed to parse appfile.json for ${folderName}:`, error);
    return null;
  }
}

/**
 * Parse docker-compose.yml with x-casaos metadata (107 apps use this)
 */
async function parseDockerCompose(appPath: string, folderName: string): Promise<App | null> {
  try {
    // Try both .yml and .yaml extensions
    let dockerComposePath = path.join(appPath, 'docker-compose.yml');
    try {
      await fs.access(dockerComposePath);
    } catch {
      dockerComposePath = path.join(appPath, 'docker-compose.yaml');
      await fs.access(dockerComposePath);
    }

    const content = await fs.readFile(dockerComposePath, 'utf-8');
    const parsed = YAML.parse(content);

    // Extract x-casaos metadata from root or services
    const xCasaOS = parsed['x-casaos'] || {};

    // Get title with language fallback
    const title = typeof xCasaOS.title === 'object'
      ? (xCasaOS.title.en_us || xCasaOS.title.en_US || Object.values(xCasaOS.title)[0])
      : (xCasaOS.title || folderName);

    // Get description with language fallback
    const description = typeof xCasaOS.description === 'object'
      ? (xCasaOS.description.en_us || xCasaOS.description.en_US || Object.values(xCasaOS.description)[0])
      : (xCasaOS.description || '');

    // Get tagline with language fallback
    const tagline = typeof xCasaOS.tagline === 'object'
      ? (xCasaOS.tagline.en_us || xCasaOS.tagline.en_US || Object.values(xCasaOS.tagline)[0])
      : (xCasaOS.tagline || (description ? description.slice(0, 100) + '...' : ''));

    const app: App = {
      id: folderName,
      title: title as string,
      name: parsed.name || folderName.toLowerCase(),
      icon: await getAppIcon(appPath, xCasaOS.icon),
      tagline: tagline as string,
      overview: description as string,
      category: Array.isArray(xCasaOS.category)
        ? xCasaOS.category
        : (xCasaOS.category ? [xCasaOS.category] : ['Other']),
      developer: xCasaOS.developer || xCasaOS.author || 'Unknown',
      screenshots: xCasaOS.screenshot_link || [],
      version: xCasaOS.version
    };

    return app;
  } catch (error) {
    console.error(`Failed to parse docker-compose.yml for ${folderName}:`, error);
    return null;
  }
}

/**
 * Get app icon - prioritize local file, fallback to URL
 */
async function getAppIcon(appPath: string, iconUrl?: string): Promise<string> {
  // Check for local icon files
  const iconExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];

  for (const ext of iconExtensions) {
    const localIconPath = path.join(appPath, `icon.${ext}`);
    try {
      await fs.access(localIconPath);
      // Return path relative to AppStore folder for public access
      const folderName = path.basename(appPath);
      return `/AppStore/${folderName}/icon.${ext}`;
    } catch {
      // File doesn't exist, try next extension
    }
  }

  // If no local icon found, use URL from metadata
  if (iconUrl) {
    return iconUrl;
  }

  // Fallback to placeholder
  return '/icons/default-app-icon.png';
}
