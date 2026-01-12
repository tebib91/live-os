/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modified: number;
  permissions: string;
  isHidden: boolean;
}

export interface DirectoryContent {
  currentPath: string;
  items: FileSystemItem[];
  parent: string | null;
}

/**
 * Validate and sanitize path to prevent directory traversal attacks
 */
function validatePath(requestedPath: string): { valid: boolean; sanitized: string } {
  try {
    // Default to home directory if no path provided
    if (!requestedPath || requestedPath === '') {
      requestedPath = '/home';
    }

    // Resolve to absolute path and normalize
    const sanitized = path.resolve(requestedPath);

    // Prevent access to sensitive system directories
    const blockedPaths = [
      '/etc/shadow',
      '/etc/passwd',
      '/root',
      '/sys',
      '/proc',
    ];

    for (const blocked of blockedPaths) {
      if (sanitized.startsWith(blocked)) {
        return { valid: false, sanitized: '/home' };
      }
    }

    return { valid: true, sanitized };
  } catch {
    return { valid: false, sanitized: '/home' };
  }
}

/**
 * Get directory contents
 */
export async function readDirectory(dirPath: string): Promise<DirectoryContent> {
  try {
    const { valid, sanitized } = validatePath(dirPath);
    if (!valid) {
      throw new Error('Invalid path');
    }

    // Check if directory exists and is accessible
    const stats = await fs.stat(sanitized);
    if (!stats.isDirectory()) {
      throw new Error('Not a directory');
    }

    // Read directory contents
    const entries = await fs.readdir(sanitized, { withFileTypes: true });

    // Get detailed info for each item
    const items: (FileSystemItem | null)[] = await Promise.all(
      entries.map(async (entry) => {
        try {
          const itemPath = path.join(sanitized, entry.name);
          const itemStats = await fs.stat(itemPath);

          // Get permissions in octal format (e.g., 755)
          const mode = itemStats.mode;
          const permissions = (mode & parseInt('777', 8)).toString(8);

          return {
            name: entry.name,
            path: itemPath,
            type: entry.isDirectory() ? 'directory' : 'file',
            size: itemStats.size,
            modified: itemStats.mtimeMs,
            permissions,
            isHidden: entry.name.startsWith('.'),
          } as FileSystemItem;
        } catch {
          // Skip items we can't access
          return null;
        }
      })
    );

    // Filter out null items and sort (directories first, then by name)
    const validItems = items
      .filter((item): item is FileSystemItem => item !== null)
      .sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });

    // Get parent directory
    const parent = sanitized === '/' ? null : path.dirname(sanitized);

    return {
      currentPath: sanitized,
      items: validItems,
      parent,
    };
  } catch (error: any) {
    console.error('Read directory error:', error);
    throw new Error(error.message || 'Failed to read directory');
  }
}

/**
 * Create a new directory
 */
export async function createDirectory(
  parentPath: string,
  dirName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate parent path
    const { valid, sanitized } = validatePath(parentPath);
    if (!valid) {
      return { success: false, error: 'Invalid parent path' };
    }

    // Validate directory name
    if (!dirName || dirName.includes('/') || dirName.includes('..')) {
      return { success: false, error: 'Invalid directory name' };
    }

    const newDirPath = path.join(sanitized, dirName);

    // Check if already exists
    try {
      await fs.access(newDirPath);
      return { success: false, error: 'Directory already exists' };
    } catch {
      // Good, doesn't exist
    }

    // Create directory
    await fs.mkdir(newDirPath, { recursive: false });

    return { success: true };
  } catch (error: any) {
    console.error('Create directory error:', error);
    return { success: false, error: error.message || 'Failed to create directory' };
  }
}

/**
 * Delete a file or directory
 */
export async function deleteItem(itemPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, sanitized } = validatePath(itemPath);
    if (!valid) {
      return { success: false, error: 'Invalid path' };
    }

    const stats = await fs.stat(sanitized);

    if (stats.isDirectory()) {
      // Delete directory recursively
      await fs.rm(sanitized, { recursive: true, force: true });
    } else {
      // Delete file
      await fs.unlink(sanitized);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Delete item error:', error);
    return { success: false, error: error.message || 'Failed to delete item' };
  }
}

/**
 * Rename a file or directory
 */
export async function renameItem(
  oldPath: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, sanitized } = validatePath(oldPath);
    if (!valid) {
      return { success: false, error: 'Invalid path' };
    }

    // Validate new name
    if (!newName || newName.includes('/') || newName.includes('..')) {
      return { success: false, error: 'Invalid name' };
    }

    const parentDir = path.dirname(sanitized);
    const newPath = path.join(parentDir, newName);

    // Check if target already exists
    try {
      await fs.access(newPath);
      return { success: false, error: 'Target already exists' };
    } catch {
      // Good, doesn't exist
    }

    // Rename
    await fs.rename(sanitized, newPath);

    return { success: true };
  } catch (error: any) {
    console.error('Rename item error:', error);
    return { success: false, error: error.message || 'Failed to rename item' };
  }
}

/**
 * Get disk usage for a directory
 */
export async function getDiskUsage(dirPath: string): Promise<{ size: string; error?: string }> {
  try {
    const { valid, sanitized } = validatePath(dirPath);
    if (!valid) {
      return { size: '0', error: 'Invalid path' };
    }

    // Use du command for accurate disk usage
    const { stdout } = await execAsync(`du -sh "${sanitized}" 2>/dev/null || echo "0K"`);
    const size = stdout.trim().split('\t')[0];

    return { size };
  } catch (error: any) {
    console.error('Get disk usage error:', error);
    return { size: '0', error: error.message };
  }
}

/**
 * Read file content (for text files)
 */
export async function readFileContent(
  filePath: string
): Promise<{ content: string; error?: string }> {
  try {
    const { valid, sanitized } = validatePath(filePath);
    if (!valid) {
      return { content: '', error: 'Invalid path' };
    }

    const stats = await fs.stat(sanitized);
    if (!stats.isFile()) {
      return { content: '', error: 'Not a file' };
    }

    // Limit file size to 1MB for reading
    if (stats.size > 1024 * 1024) {
      return { content: '', error: 'File too large (max 1MB)' };
    }

    const content = await fs.readFile(sanitized, 'utf-8');
    return { content };
  } catch (error: any) {
    console.error('Read file content error:', error);
    return { content: '', error: error.message || 'Failed to read file' };
  }
}

/**
 * Format file size to human-readable format (internal helper)
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
