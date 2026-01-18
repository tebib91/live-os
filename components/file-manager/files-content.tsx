'use client';

import { type FileSystemItem } from '@/app/actions/filesystem';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileIcon, Loader2 } from 'lucide-react';
import { type MouseEvent } from 'react';

interface FilesContentProps {
  loading: boolean;
  viewMode: 'grid' | 'list';
  items: FileSystemItem[];
  onOpenItem: (item: FileSystemItem) => void;
  onOpenNative: (path: string) => void;
  onContextMenu: (event: MouseEvent, item: FileSystemItem) => void;
}

const formatSize = (size: number) => `${(size / 1024).toFixed(1)} KB`;

export function FilesContent({
  loading,
  viewMode,
  items,
  onOpenItem,
  onOpenNative,
  onContextMenu,
}: FilesContentProps) {
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
                  <div className="w-20 h-16 flex items-center justify-center">
                    <FileIcon className="w-12 h-12 text-blue-400" />
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
                  <FileIcon className="w-8 h-8 text-blue-400 flex-shrink-0" />
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
