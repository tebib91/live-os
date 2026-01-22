'use server';

import fs from 'fs/promises';
import path from 'path';
import { getHomeRoot } from './filesystem';

const FAVORITES_FILE = '.file-favorites.json';

interface FavoritesData {
  favorites: string[];
}

async function getFavoritesPath(): Promise<string> {
  const homeRoot = await getHomeRoot();
  return path.join(homeRoot, FAVORITES_FILE);
}

async function readFavoritesFile(): Promise<FavoritesData> {
  try {
    const filePath = await getFavoritesPath();
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as FavoritesData;
  } catch {
    return { favorites: [] };
  }
}

async function writeFavoritesFile(data: FavoritesData): Promise<void> {
  const filePath = await getFavoritesPath();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Get all favorites
 */
export async function getFavorites(): Promise<{ favorites: string[] }> {
  try {
    console.log('[favorites] getFavorites');
    const data = await readFavoritesFile();

    // Filter out favorites that no longer exist
    const validFavorites: string[] = [];
    for (const favPath of data.favorites) {
      try {
        await fs.access(favPath);
        validFavorites.push(favPath);
      } catch {
        // Path no longer exists, skip it
      }
    }

    // Update file if some favorites were removed
    if (validFavorites.length !== data.favorites.length) {
      await writeFavoritesFile({ favorites: validFavorites });
    }

    return { favorites: validFavorites };
  } catch (error) {
    console.error('Get favorites error:', error);
    return { favorites: [] };
  }
}

/**
 * Add a path to favorites
 */
export async function addFavorite(
  favPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[favorites] addFavorite:', favPath);

    // Verify the path exists and is a directory
    const stats = await fs.stat(favPath);
    if (!stats.isDirectory()) {
      return { success: false, error: 'Only directories can be favorited' };
    }

    const data = await readFavoritesFile();

    // Check if already in favorites
    if (data.favorites.includes(favPath)) {
      return { success: true }; // Already exists, no-op
    }

    data.favorites.push(favPath);
    await writeFavoritesFile(data);

    return { success: true };
  } catch (error: unknown) {
    console.error('Add favorite error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add favorite',
    };
  }
}

/**
 * Remove a path from favorites
 */
export async function removeFavorite(
  favPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[favorites] removeFavorite:', favPath);

    const data = await readFavoritesFile();
    const index = data.favorites.indexOf(favPath);

    if (index === -1) {
      return { success: true }; // Not in favorites, no-op
    }

    data.favorites.splice(index, 1);
    await writeFavoritesFile(data);

    return { success: true };
  } catch (error: unknown) {
    console.error('Remove favorite error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove favorite',
    };
  }
}

/**
 * Check if a path is in favorites
 */
export async function isFavorite(favPath: string): Promise<boolean> {
  try {
    const data = await readFavoritesFile();
    return data.favorites.includes(favPath);
  } catch {
    return false;
  }
}
