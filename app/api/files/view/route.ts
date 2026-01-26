import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';

// Blocked paths for security
const BLOCKED_PATHS = ['/etc/shadow', '/etc/passwd', '/sys', '/proc'];

function isBlockedPath(filePath: string): boolean {
  const normalized = path.resolve(filePath);
  return BLOCKED_PATHS.some((blocked) => normalized.startsWith(blocked));
}

// Get MIME type from extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Text
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.md': 'text/markdown',
    // Images
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.bmp': 'image/bmp',
    // Audio
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    // Video
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    // Documents
    '.pdf': 'application/pdf',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Check if file type is viewable in browser
function isViewable(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('text/')
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get('path');

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  // Security check
  if (isBlockedPath(filePath)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const normalizedPath = path.resolve(filePath);

    // Verify file exists and is a file
    const stats = await fs.stat(normalizedPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // Get file info
    const fileName = path.basename(normalizedPath);
    const mimeType = getMimeType(normalizedPath);
    const fileSize = stats.size;

    // If not viewable, return error
    if (!isViewable(mimeType)) {
      return NextResponse.json(
        { error: 'File type not viewable', mimeType },
        { status: 415 }
      );
    }

    // Handle range requests for video/audio streaming
    const range = request.headers.get('range');

    if (range && (mimeType.startsWith('video/') || mimeType.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileContent = await fs.open(normalizedPath, 'r');
      const buffer = Buffer.alloc(chunkSize);
      await fileContent.read(buffer, 0, chunkSize, start);
      await fileContent.close();

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          'Content-Type': mimeType,
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
        },
      });
    }

    // For small files (< 50MB), read directly into memory
    if (fileSize < 50 * 1024 * 1024) {
      const fileContent = await fs.readFile(normalizedPath);
      return new NextResponse(fileContent, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
          'Content-Length': fileSize.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // For larger files, stream the response
    const stream = createReadStream(normalizedPath);

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
          controller.enqueue(new Uint8Array(buf));
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
        'Content-Length': fileSize.toString(),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('View error:', error);

    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to view file' }, { status: 500 });
  }
}
