'use client';

import { type FileSystemItem } from '@/app/actions/filesystem';
import { getFileIcon, FolderIcon } from '@/components/icons/files';
import { HardDrive } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { type MouseEvent, useMemo } from 'react';

interface FilesContentProps {
  loading: boolean;
  viewMode: 'grid' | 'list';
  items: FileSystemItem[];
  onOpenItem: (item: FileSystemItem) => void;
  onContextMenu: (event: MouseEvent, item: FileSystemItem) => void;
}

const formatSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

const getExtensionLabel = (name: string) => {
  if (/^dockerfile$/i.test(name)) return 'DOCKER';
  const parts = name.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop() || '' : '';
  if (!ext) return 'FILE';
  return ext.toUpperCase().slice(0, 4);
};

export function FilesContent({
  loading,
  viewMode,
  items,
  onOpenItem,
  onContextMenu,
}: FilesContentProps) {
  // Pre-compute icons for all files
  const fileIcons = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getFileIcon>>();
    items.forEach((item) => {
      if (item.type !== 'directory') {
        map.set(item.path, getFileIcon(item.name));
      }
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
            {items.map((item) => {
              const FileIcon = fileIcons.get(item.path);
              const extLabel = item.type !== 'directory' ? getExtensionLabel(item.name) : null;

              return (
                <button
                  key={item.path}
                  onClick={() => onOpenItem(item)}
                  onDoubleClick={() => onOpenItem(item)}
                  onContextMenu={(event) => onContextMenu(event, item)}
                  className="flex flex-col items-center gap-3 group"
                >
                  {item.type === 'directory' ? (
                    <div className="w-16 h-14 transition-transform group-hover:scale-105">
                      {item.isMount ? (
                        <HardDrive className="w-full h-full drop-shadow-lg text-cyan-200" />
                      ) : (
                        <FolderIcon className="w-full h-full drop-shadow-lg" />
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-14 transition-transform group-hover:scale-105 relative">
                      {FileIcon && <FileIcon className="w-full h-full drop-shadow-lg" />}
                      {extLabel && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full border border-white/10 bg-black/40 backdrop-blur-sm text-[9px] uppercase tracking-wider text-white/70">
                          {extLabel}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-center max-w-full">
                    <div className="text-sm font-medium text-white/90 -tracking-[0.01em] truncate">
                      {item.displayName || item.name}
                    </div>
                    <div className="text-xs text-white/40 -tracking-[0.01em]">
                      {item.type === 'directory' ? 'Folder' : formatSize(item.size)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item) => {
              const FileIcon = fileIcons.get(item.path);
              const extLabel = item.type !== 'directory' ? getExtensionLabel(item.name) : null;

              return (
                <button
                  key={item.path}
                  onClick={() => onOpenItem(item)}
                  onContextMenu={(event) => onContextMenu(event, item)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {item.type === 'directory' ? (
                    <div className="w-8 h-7 flex-shrink-0">
                      {item.isMount ? (
                        <HardDrive className="w-full h-full text-cyan-200" />
                      ) : (
                        <FolderIcon className="w-full h-full" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-8 flex-shrink-0">
                        {FileIcon && <FileIcon className="w-full h-full" />}
                      </div>
                      {extLabel && (
                        <span className="text-[10px] uppercase tracking-wider text-white/50">
                          {extLabel}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-white/90 -tracking-[0.01em] truncate">
                      {item.displayName || item.name}
                    </div>
                    <div className="text-xs text-white/40 -tracking-[0.01em]">
                      {item.type === 'directory'
                        ? 'Folder'
                        : `${formatSize(item.size)} • ${new Date(item.modified).toLocaleDateString()}`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
