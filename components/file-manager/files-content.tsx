'use client';

import { type FileSystemItem } from '@/app/actions/filesystem';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Container,
  FileCode,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
  TerminalSquare,
} from 'lucide-react';
import { JSX, type MouseEvent, useMemo } from 'react';

interface FilesContentProps {
  loading: boolean;
  viewMode: 'grid' | 'list';
  items: FileSystemItem[];
  onOpenItem: (item: FileSystemItem) => void;
  onOpenNative: (path: string) => void;
  onContextMenu: (event: MouseEvent, item: FileSystemItem) => void;
}

const formatSize = (size: number) => `${(size / 1024).toFixed(1)} KB`;

const extensionBadge = (name: string) => {
  if (/^dockerfile$/i.test(name)) return { label: 'DOCKER', icon: <Container className="w-4 h-4" /> };
  const parts = name.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop() || '' : '';
  if (!ext) return { label: 'TXT', icon: <FileText className="w-4 h-4" /> };
  if (ext === 'json') return { label: 'JSON', icon: <FileJson className="w-4 h-4" /> };
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext))
    return { label: ext.toUpperCase(), icon: <FileCode className="w-4 h-4" /> };
  if (['yml', 'yaml'].includes(ext))
    return { label: 'YAML', icon: <FileCode className="w-4 h-4" /> };
  if (['md', 'markdown'].includes(ext))
    return { label: 'MD', icon: <FileText className="w-4 h-4" /> };
  if (['css', 'scss', 'less'].includes(ext))
    return { label: ext.toUpperCase(), icon: <FileCode className="w-4 h-4" /> };
  if (['py', 'rb', 'php', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'hpp'].includes(ext))
    return { label: ext.toUpperCase(), icon: <FileCode className="w-4 h-4" /> };
  if (['sql', 'csv'].includes(ext))
    return { label: ext.toUpperCase(), icon: <FileSpreadsheet className="w-4 h-4" /> };
  if (['env', 'ini', 'conf', 'config', 'toml'].includes(ext))
    return { label: ext.toUpperCase(), icon: <FileType className="w-4 h-4" /> };
  if (['sh', 'bash', 'zsh'].includes(ext))
    return { label: 'SHELL', icon: <TerminalSquare className="w-4 h-4" /> };
  return { label: ext.toUpperCase(), icon: <FileText className="w-4 h-4" /> };
};

export function FilesContent({
  loading,
  viewMode,
  items,
  onOpenItem,
  onOpenNative,
  onContextMenu,
}: FilesContentProps) {
  const badges = useMemo(() => {
    const map = new Map<string, { label: string; icon: JSX.Element }>();
    items.forEach((item) => {
      if (item.type === 'directory') return;
      map.set(item.path, extensionBadge(item.name));
    });
    return map;
  }, [items]);

  return (
    <ScrollArea className="flex-1">
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-white/40">Empty directory</div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => onOpenItem(item)}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  onOpenNative(item.path);
                }}
                onContextMenu={(event) => onContextMenu(event, item)}
                className="flex flex-col items-center gap-3 group"
              >
                {item.type === 'directory' ? (
                  <div className="relative w-20 h-16 transition-transform group-hover:scale-105">
                    <div className="absolute top-0 left-0 w-10 h-4 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-t-md shadow-sm"></div>
                    <div className="absolute top-3 left-0 w-full h-12 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-xl">
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-black/0 via-black/0 to-black/20"></div>
                      <div className="absolute top-1 left-1 right-1 h-5 bg-gradient-to-b from-white/25 to-transparent rounded-t-lg"></div>
                    </div>
                  </div>
                ) : (
                  <div className="w-20 h-16 flex items-center justify-center relative">
                    <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shadow-lg shadow-black/30">
                      {badges.get(item.path)?.icon || <FileText className="w-6 h-6 text-blue-300" />}
                    </div>
                    <div className="absolute -bottom-2 px-2 py-0.5 rounded-full border border-white/10 bg-white/10 text-[10px] uppercase tracking-[0.18em] text-white/70">
                      {badges.get(item.path)?.label || 'TXT'}
                    </div>
                  </div>
                )}

                <div className="text-center max-w-full">
                  <div className="text-sm font-medium text-white/90 -tracking-[0.01em] truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {item.type === 'directory' ? 'Folder' : formatSize(item.size)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => onOpenItem(item)}
                onContextMenu={(event) => onContextMenu(event, item)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                {item.type === 'directory' ? (
                  <div className="relative w-8 h-7 flex-shrink-0">
                    <div className="absolute top-0 left-0 w-3.5 h-2 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                    <div className="absolute top-1.5 left-0 w-full h-5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                      <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shadow-md shadow-black/20">
                      {badges.get(item.path)?.icon || <FileText className="w-5 h-5 text-blue-300" />}
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-white/60">
                      {badges.get(item.path)?.label || 'TXT'}
                    </span>
                  </div>
                )}
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                    {item.name}
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {item.type === 'directory'
                      ? 'Folder'
                      : `${formatSize(item.size)} • ${new Date(item.modified).toLocaleDateString()}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
