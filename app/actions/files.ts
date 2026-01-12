'use server';

import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface FileItem {
  id: string;
  name: string;
  isDir: boolean;
  size?: number;
  modDate?: Date;
  childrenCount?: number;
}

/**
 * List files and folders in a directory
 */
export async function listFiles(dirPath?: string): Promise<{ files: FileItem[]; currentPath: string }> {
  try {
    // Default to user's home directory
    const basePath = dirPath || os.homedir();
    const resolvedPath = path.resolve(basePath);

    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });

    const files: FileItem[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(resolvedPath, entry.name);
        const stats = await fs.stat(fullPath);

        return {
          id: fullPath,
          name: entry.name,
          isDir: entry.isDirectory(),
          size: stats.size,
          modDate: stats.mtime,
          childrenCount: entry.isDirectory() ? (await fs.readdir(fullPath)).length : undefined,
        };
      })
    );

    // Sort: folders first, then by name
    files.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      files,
      currentPath: resolvedPath,
    };
  } catch (error) {
    console.error('Error listing files:', error);
    return {
      files: [],
      currentPath: dirPath || os.homedir(),
    };
  }
}

/**
 * Create a new folder
 */
export async function createFolder(parentPath: string, folderName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const newFolderPath = path.join(parentPath, folderName);
    await fs.mkdir(newFolderPath, { recursive: false });
    return { success: true };
  } catch (error) {
    console.error('Error creating folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create folder'
    };
  }
}

/**
 * Delete a file or folder
 */
export async function deleteItem(itemPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const stats = await fs.stat(itemPath);

    if (stats.isDirectory()) {
      await fs.rm(itemPath, { recursive: true, force: true });
    } else {
      await fs.unlink(itemPath);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete item'
    };
  }
}

/**
 * Rename a file or folder
 */
export async function renameItem(oldPath: string, newName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parentDir = path.dirname(oldPath);
    const newPath = path.join(parentDir, newName);
    await fs.rename(oldPath, newPath);
    return { success: true };
  } catch (error) {
    console.error('Error renaming item:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rename item'
    };
  }
}

/**
 * Get file/folder info
 */
export async function getItemInfo(itemPath: string): Promise<{
  success: boolean;
  info?: {
    name: string;
    path: string;
    size: number;
    isDirectory: boolean;
    created: Date;
    modified: Date;
    accessed: Date;
  };
  error?: string;
}> {
  try {
    const stats = await fs.stat(itemPath);

    return {
      success: true,
      info: {
        name: path.basename(itemPath),
        path: itemPath,
        size: stats.size,
        isDirectory: stats.isDirectory(),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
      }
    };
  } catch (error) {
    console.error('Error getting item info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get item info'
    };
  }
}
