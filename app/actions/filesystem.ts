/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';

import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PRIMARY_HOME_ROOT = process.env.LIVEOS_HOME || '/DATA';
const FALLBACK_HOME_ROOT = path.join(process.cwd(), 'DATA');
const DEFAULT_DIRECTORIES = ['apps', 'Downloads', 'Documents', 'Photos', 'Devices'] as const;
let resolvedHomeRoot = PRIMARY_HOME_ROOT;

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

export type DefaultDirectory = {
  name: string;
  path: string;
};

async function ensureHomeRoot(): Promise<string> {
  try {
    await fs.mkdir(resolvedHomeRoot, { recursive: true });
    return resolvedHomeRoot;
  } catch (error: any) {
    if (error?.code !== 'EACCES') {
      throw error;
    }

    // Fall back to a workspace-local data directory when /DATA is not writable (e.g. local dev)
    resolvedHomeRoot = FALLBACK_HOME_ROOT;
    await fs.mkdir(resolvedHomeRoot, { recursive: true });
    console.warn(`[Filesystem] Falling back to ${resolvedHomeRoot} because ${PRIMARY_HOME_ROOT} is not writable`);
    return resolvedHomeRoot;
  }
}

export async function getHomeRoot(): Promise<string> {
  // Reuse the same resolution logic used by the filesystem actions
  return ensureHomeRoot();
}

async function ensureDefaultDirectories(): Promise<DefaultDirectory[]> {
  const directories: DefaultDirectory[] = [];
  const homeRoot = await ensureHomeRoot();

  for (const dir of DEFAULT_DIRECTORIES) {
    const target = path.join(homeRoot, dir);
    directories.push({ name: dir, path: target });
    try {
      await fs.mkdir(target, { recursive: true });
    } catch {
      // Ignore if it already exists or cannot be created
    }
  }

  return directories;
}

/**
 * Validate and sanitize path to prevent directory traversal attacks
 */
async function validatePath(requestedPath: string): Promise<{ valid: boolean; sanitized: string }> {
  try {
    const homeRoot = await ensureHomeRoot();

    // Default to home directory if no path provided
    if (!requestedPath || requestedPath === '') {
      requestedPath = homeRoot;
    }

    // Resolve to absolute path and normalize
    const sanitized = path.resolve(requestedPath);

    // Prevent access to sensitive system directories
    const blockedPaths = ['/etc/shadow', '/etc/passwd', '/sys', '/proc'];

    for (const blocked of blockedPaths) {
      if (sanitized.startsWith(blocked)) {
        return { valid: false, sanitized: homeRoot };
      }
    }

    return { valid: true, sanitized };
  } catch {
    const fallback = await ensureHomeRoot();
    return { valid: false, sanitized: fallback };
  }
}

/**
 * Get directory contents
 */
export async function readDirectory(dirPath: string): Promise<DirectoryContent> {
  try {
    console.log("[filesystem] readDirectory requested:", dirPath);
    await ensureDefaultDirectories();

    const { valid, sanitized } = await validatePath(dirPath);
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
    console.error('Read directory error for path:', dirPath, error);
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
    const { valid, sanitized } = await validatePath(parentPath);
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
    const { valid, sanitized } = await validatePath(itemPath);
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
    const { valid, sanitized } = await validatePath(oldPath);
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
 * Create an empty file
 */
export async function createFile(
  parentPath: string,
  fileName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, sanitized } = await validatePath(parentPath);
    if (!valid) {
      return { success: false, error: 'Invalid parent path' };
    }

    if (!fileName || fileName.includes('/') || fileName.includes('..')) {
      return { success: false, error: 'Invalid file name' };
    }

    const newFilePath = path.join(sanitized, fileName);
    try {
      await fs.access(newFilePath);
      return { success: false, error: 'File already exists' };
    } catch {
      // ok
    }

    await fs.writeFile(newFilePath, '');
    return { success: true };
  } catch (error: any) {
    console.error('Create file error:', error);
    return { success: false, error: error.message || 'Failed to create file' };
  }
}

export async function writeFileContent(
  filePath: string,
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, sanitized } = await validatePath(filePath);
    if (!valid) {
      return { success: false, error: 'Invalid path' };
    }

    await fs.writeFile(sanitized, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    console.error('Write file content error:', error);
    return { success: false, error: error.message || 'Failed to save file' };
  }
}

/**
 * Get disk usage for a directory
 */
export async function getDiskUsage(dirPath: string): Promise<{ size: string; error?: string }> {
  try {
    const { valid, sanitized } = await validatePath(dirPath);
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
    const { valid, sanitized } = await validatePath(filePath);
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

export async function getDefaultDirectories(): Promise<{
  home: string;
  directories: DefaultDirectory[];
}> {
  const home = await ensureHomeRoot();
  const directories = await ensureDefaultDirectories();
  return { home, directories };
}

export async function openPath(
  targetPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { valid, sanitized } = await validatePath(targetPath);
    if (!valid) {
      return { success: false, error: 'Invalid path' };
    }

    const platform = process.platform;
    const command =
      platform === 'darwin'
        ? `open "${sanitized}"`
        : platform === 'win32'
        ? `start "" "${sanitized}"`
        : `xdg-open "${sanitized}"`;

    await execAsync(command, {
      shell: platform === 'win32' ? 'cmd.exe' : undefined,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Open path error:', error);
    return { success: false, error: error.message || 'Failed to open path' };
  }
}

/**
 * Move items to a destination directory
 */
export async function moveItems(
  sourcePaths: string[],
  destPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[filesystem] moveItems:', sourcePaths, '->', destPath);

    // Validate destination
    const { valid: destValid, sanitized: destSanitized } = await validatePath(destPath);
    if (!destValid) {
      return { success: false, error: 'Invalid destination path' };
    }

    // Ensure destination is a directory
    const destStats = await fs.stat(destSanitized);
    if (!destStats.isDirectory()) {
      return { success: false, error: 'Destination is not a directory' };
    }

    // Move each source item
    for (const sourcePath of sourcePaths) {
      const { valid: srcValid, sanitized: srcSanitized } = await validatePath(sourcePath);
      if (!srcValid) {
        return { success: false, error: `Invalid source path: ${sourcePath}` };
      }

      const baseName = path.basename(srcSanitized);
      const targetPath = path.join(destSanitized, baseName);

      // Check if target already exists
      try {
        await fs.access(targetPath);
        return { success: false, error: `Item already exists: ${baseName}` };
      } catch {
        // Good, doesn't exist
      }

      // Move the item
      await fs.rename(srcSanitized, targetPath);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Move items error:', error);
    return { success: false, error: error.message || 'Failed to move items' };
  }
}

/**
 * Copy items to a destination directory
 */
export async function copyItems(
  sourcePaths: string[],
  destPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[filesystem] copyItems:', sourcePaths, '->', destPath);

    // Validate destination
    const { valid: destValid, sanitized: destSanitized } = await validatePath(destPath);
    if (!destValid) {
      return { success: false, error: 'Invalid destination path' };
    }

    // Ensure destination is a directory
    const destStats = await fs.stat(destSanitized);
    if (!destStats.isDirectory()) {
      return { success: false, error: 'Destination is not a directory' };
    }

    // Copy each source item
    for (const sourcePath of sourcePaths) {
      const { valid: srcValid, sanitized: srcSanitized } = await validatePath(sourcePath);
      if (!srcValid) {
        return { success: false, error: `Invalid source path: ${sourcePath}` };
      }

      const baseName = path.basename(srcSanitized);
      let targetPath = path.join(destSanitized, baseName);

      // Generate unique name if target exists
      let counter = 1;
      while (true) {
        try {
          await fs.access(targetPath);
          // File exists, generate new name
          const ext = path.extname(baseName);
          const nameWithoutExt = path.basename(baseName, ext);
          targetPath = path.join(destSanitized, `${nameWithoutExt} (${counter})${ext}`);
          counter++;
        } catch {
          // Doesn't exist, use this path
          break;
        }
      }

      // Use cp -r for directories, simple copy for files
      const srcStats = await fs.stat(srcSanitized);
      if (srcStats.isDirectory()) {
        await execAsync(`cp -r "${srcSanitized}" "${targetPath}"`);
      } else {
        await fs.copyFile(srcSanitized, targetPath);
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('Copy items error:', error);
    return { success: false, error: error.message || 'Failed to copy items' };
  }
}

/**
 * Move item to trash (.Trash directory)
 */
export async function trashItem(
  itemPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[filesystem] trashItem:', itemPath);

    const { valid, sanitized } = await validatePath(itemPath);
    if (!valid) {
      return { success: false, error: 'Invalid path' };
    }

    // Get home directory for .Trash
    const homeRoot = await ensureHomeRoot();
    const trashDir = path.join(homeRoot, '.Trash');

    // Ensure .Trash directory exists
    await fs.mkdir(trashDir, { recursive: true });

    const baseName = path.basename(sanitized);
    let trashPath = path.join(trashDir, baseName);

    // Generate unique name if target exists in trash
    let counter = 1;
    while (true) {
      try {
        await fs.access(trashPath);
        const ext = path.extname(baseName);
        const nameWithoutExt = path.basename(baseName, ext);
        trashPath = path.join(trashDir, `${nameWithoutExt} (${counter})${ext}`);
        counter++;
      } catch {
        break;
      }
    }

    // Move to trash
    await fs.rename(sanitized, trashPath);

    return { success: true };
  } catch (error: any) {
    console.error('Trash item error:', error);
    return { success: false, error: error.message || 'Failed to move item to trash' };
  }
}

/**
 * Compress items into a tar.gz archive
 */
export async function compressItems(
  paths: string[],
  outputName?: string
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  try {
    console.log('[filesystem] compressItems:', paths);

    if (paths.length === 0) {
      return { success: false, error: 'No items to compress' };
    }

    // Validate all paths
    const sanitizedPaths: string[] = [];
    for (const p of paths) {
      const { valid, sanitized } = await validatePath(p);
      if (!valid) {
        return { success: false, error: `Invalid path: ${p}` };
      }
      sanitizedPaths.push(sanitized);
    }

    // Determine output directory and archive name
    const firstPath = sanitizedPaths[0];
    const parentDir = path.dirname(firstPath);
    const archiveName = outputName || (paths.length === 1
      ? `${path.basename(firstPath)}.tar.gz`
      : `archive-${Date.now()}.tar.gz`);
    const archivePath = path.join(parentDir, archiveName);

    // Create file list for tar
    const fileNames = sanitizedPaths.map((p) => path.basename(p));

    // Use tar to create archive
    const tarCommand = `cd "${parentDir}" && tar -czvf "${archiveName}" ${fileNames.map((f) => `"${f}"`).join(' ')}`;
    await execAsync(tarCommand);

    return { success: true, outputPath: archivePath };
  } catch (error: any) {
    console.error('Compress items error:', error);
    return { success: false, error: error.message || 'Failed to compress items' };
  }
}

/**
 * Extract an archive to the same directory or specified destination
 */
export async function uncompressArchive(
  archivePath: string,
  destPath?: string
): Promise<{ success: boolean; outputPath?: string; error?: string }> {
  try {
    console.log('[filesystem] uncompressArchive:', archivePath);

    const { valid, sanitized } = await validatePath(archivePath);
    if (!valid) {
      return { success: false, error: 'Invalid archive path' };
    }

    // Check if file exists
    const stats = await fs.stat(sanitized);
    if (!stats.isFile()) {
      return { success: false, error: 'Not a file' };
    }

    // Determine destination directory
    let outputDir = destPath;
    if (!outputDir) {
      // Create a directory with the archive name (without extension)
      const archiveName = path.basename(sanitized);
      const parentDir = path.dirname(sanitized);

      // Remove common archive extensions
      const baseName = archiveName
        .replace(/\.tar\.gz$/i, '')
        .replace(/\.tgz$/i, '')
        .replace(/\.tar\.bz2$/i, '')
        .replace(/\.tbz2$/i, '')
        .replace(/\.tar\.xz$/i, '')
        .replace(/\.txz$/i, '')
        .replace(/\.tar$/i, '')
        .replace(/\.zip$/i, '')
        .replace(/\.7z$/i, '')
        .replace(/\.rar$/i, '')
        .replace(/\.gz$/i, '')
        .replace(/\.bz2$/i, '')
        .replace(/\.xz$/i, '');

      outputDir = path.join(parentDir, baseName);
    }

    // Validate and create output directory
    const { valid: destValid, sanitized: destSanitized } = await validatePath(outputDir);
    if (!destValid) {
      return { success: false, error: 'Invalid destination path' };
    }
    await fs.mkdir(destSanitized, { recursive: true });

    // Determine the appropriate extraction command based on file extension
    const lowerPath = sanitized.toLowerCase();
    let command: string;

    if (lowerPath.endsWith('.tar.gz') || lowerPath.endsWith('.tgz')) {
      command = `tar -xzvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith('.tar.bz2') || lowerPath.endsWith('.tbz2')) {
      command = `tar -xjvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith('.tar.xz') || lowerPath.endsWith('.txz')) {
      command = `tar -xJvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith('.tar')) {
      command = `tar -xvf "${sanitized}" -C "${destSanitized}"`;
    } else if (lowerPath.endsWith('.zip')) {
      command = `unzip -o "${sanitized}" -d "${destSanitized}"`;
    } else if (lowerPath.endsWith('.gz')) {
      // Single file gzip
      const outputFile = path.join(destSanitized, path.basename(sanitized, '.gz'));
      command = `gunzip -c "${sanitized}" > "${outputFile}"`;
    } else if (lowerPath.endsWith('.bz2')) {
      const outputFile = path.join(destSanitized, path.basename(sanitized, '.bz2'));
      command = `bunzip2 -c "${sanitized}" > "${outputFile}"`;
    } else if (lowerPath.endsWith('.xz')) {
      const outputFile = path.join(destSanitized, path.basename(sanitized, '.xz'));
      command = `xz -dc "${sanitized}" > "${outputFile}"`;
    } else if (lowerPath.endsWith('.7z')) {
      command = `7z x "${sanitized}" -o"${destSanitized}" -y`;
    } else if (lowerPath.endsWith('.rar')) {
      command = `unrar x "${sanitized}" "${destSanitized}/"`;
    } else {
      return { success: false, error: 'Unsupported archive format' };
    }

    await execAsync(command);

    return { success: true, outputPath: destSanitized };
  } catch (error: any) {
    console.error('Uncompress archive error:', error);
    return { success: false, error: error.message || 'Failed to extract archive' };
  }
}
