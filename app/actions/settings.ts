'use server';

import { promises as fs } from 'fs';
import path from 'path';

import { prisma } from '@/lib/prisma';

const WALLPAPER_DIR = path.join(process.cwd(), 'public', 'wallpapers');
const WALLPAPER_ROUTE = '/wallpapers';
const WALLPAPER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export type WallpaperOption = {
  id: string;
  name: string;
  path: string;
};

export type SettingsData = {
  currentWallpaper: string | null;
  selectedWidgets?: string[] | null;
  userLatitude?: number | null;
  userLongitude?: number | null;
  userCity?: string | null;
  userCountry?: string | null;
};

function formatWallpaperName(filename: string): string {
  const base = path.parse(filename).name;
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export async function getWallpapers(): Promise<WallpaperOption[]> {
  try {
    const entries = await fs.readdir(WALLPAPER_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => WALLPAPER_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b));

    return files.map((filename) => ({
      id: filename,
      name: formatWallpaperName(filename),
      path: `${WALLPAPER_ROUTE}/${filename}`,
    }));
  } catch (error) {
    console.error('Failed to load wallpapers:', error);
    return [];
  }
}

export async function getSettings(): Promise<SettingsData> {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    return {
      currentWallpaper: settings?.currentWallpaper ?? null,
      selectedWidgets: (settings?.selectedWidgets as string[] | null) ?? null,
      userLatitude: settings?.userLatitude ?? null,
      userLongitude: settings?.userLongitude ?? null,
      userCity: settings?.userCity ?? null,
      userCountry: settings?.userCountry ?? null,
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return { currentWallpaper: null, selectedWidgets: null };
  }
}

export async function updateSettings(
  input: Partial<SettingsData>
): Promise<SettingsData> {
  try {
    const nextWallpaper = input.currentWallpaper;

    if (typeof nextWallpaper === 'string') {
      const wallpapers = await getWallpapers();
      const isValid = wallpapers.some((wallpaper) => wallpaper.path === nextWallpaper);
      if (!isValid) {
        return getSettings();
      }
    }

    // Build update data object
    const data: Record<string, unknown> = {};
    if (input.currentWallpaper !== undefined) {
      data.currentWallpaper = input.currentWallpaper;
    }
    if (input.selectedWidgets !== undefined) {
      data.selectedWidgets = input.selectedWidgets;
    }
    if (input.userLatitude !== undefined) {
      data.userLatitude = input.userLatitude;
    }
    if (input.userLongitude !== undefined) {
      data.userLongitude = input.userLongitude;
    }
    if (input.userCity !== undefined) {
      data.userCity = input.userCity;
    }
    if (input.userCountry !== undefined) {
      data.userCountry = input.userCountry;
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        ...data,
      },
      update: data,
    });

    return {
      currentWallpaper: settings.currentWallpaper ?? null,
      selectedWidgets: (settings.selectedWidgets as string[] | null) ?? null,
      userLatitude: settings.userLatitude ?? null,
      userLongitude: settings.userLongitude ?? null,
      userCity: settings.userCity ?? null,
      userCountry: settings.userCountry ?? null,
    };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { currentWallpaper: null, selectedWidgets: null };
  }
}
