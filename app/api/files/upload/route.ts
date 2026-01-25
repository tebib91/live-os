import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, stat } from 'fs/promises';
import path from 'path';

// Block sensitive paths
const BLOCKED_PATHS = ['/etc', '/sys', '/proc', '/dev', '/boot', '/root'];
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

function isPathBlocked(targetPath: string): boolean {
  const normalized = path.normalize(targetPath);
  return BLOCKED_PATHS.some((blocked) => normalized.startsWith(blocked));
}

function sanitizeFileName(name: string): string {
  // Remove path traversal attempts and invalid characters
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const targetDir = formData.get('targetDir') as string;
    const files = formData.getAll('files') as File[];

    if (!targetDir) {
      return NextResponse.json(
        { success: false, error: 'Target directory is required' },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    const totalBytes = files.reduce((sum, file) => sum + (file?.size ?? 0), 0);
    if (totalBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Upload exceeds 100MB limit' },
        { status: 413 }
      );
    }

    // Validate target directory
    const normalizedTarget = path.normalize(targetDir);
    if (isPathBlocked(normalizedTarget)) {
      return NextResponse.json(
        { success: false, error: 'Access to this directory is not allowed' },
        { status: 403 }
      );
    }

    // Check if target directory exists
    try {
      const stats = await stat(normalizedTarget);
      if (!stats.isDirectory()) {
        return NextResponse.json(
          { success: false, error: 'Target path is not a directory' },
          { status: 400 }
        );
      }
    } catch {
      // Try to create the directory
      try {
        await mkdir(normalizedTarget, { recursive: true });
      } catch {
        return NextResponse.json(
          { success: false, error: 'Target directory does not exist and could not be created' },
          { status: 400 }
        );
      }
    }

    const results: { name: string; success: boolean; error?: string }[] = [];

    for (const file of files) {
      const sanitizedName = sanitizeFileName(file.name);

      if (!sanitizedName) {
        results.push({ name: file.name, success: false, error: 'Invalid file name' });
        continue;
      }

      const filePath = path.join(normalizedTarget, sanitizedName);

      // Ensure the final path is still within the target directory (prevent path traversal)
      if (!filePath.startsWith(normalizedTarget)) {
        results.push({ name: file.name, success: false, error: 'Invalid file path' });
        continue;
      }

      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);
        results.push({ name: sanitizedName, success: true });
      } catch (err) {
        results.push({
          name: sanitizedName,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to write file'
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `Uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload failed' },
      { status: 500 }
    );
  }
}
