'use client';

import { type FileSystemItem } from '@/app/actions/filesystem';
import { getFileIcon, FolderIcon } from '@/components/icons/files';
import { HardDrive } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { type MouseEvent, type DragEvent, useMemo, memo, useCallback, useState } from 'react';

interface FilesContentProps {
  loading: boolean;
  viewMode: 'grid' | 'list';
  items: FileSystemItem[];
  onOpenItem: (item: FileSystemItem) => void;
  onContextMenu: (event: MouseEvent, item: FileSystemItem) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
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

// Memoized grid item component to prevent re-renders
interface FileGridItemProps {
  item: FileSystemItem;
  FileIcon: ReturnType<typeof getFileIcon> | undefined;
  extLabel: string | null;
  onOpen: (item: FileSystemItem) => void;
  onContext: (event: MouseEvent, item: FileSystemItem) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
}

const FileGridItem = memo(function FileGridItem({
  item,
  FileIcon,
  extLabel,
  onOpen,
  onContext,
  onMoveItem,
}: FileGridItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = useCallback(() => onOpen(item), [onOpen, item]);
  const handleContext = useCallback(
    (event: MouseEvent) => onContext(event, item),
    [onContext, item]
  );

  // Drag handlers - make item draggable
  const handleDragStart = useCallback((e: DragEvent) => {
    e.dataTransfer.setData('text/plain', item.path);
    e.dataTransfer.effectAllowed = 'move';
  }, [item.path]);

  // Drop handlers - only for directories
  const handleDragOver = useCallback((e: DragEvent) => {
    if (item.type !== 'directory') return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, [item.type]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (item.type !== 'directory' || !onMoveItem) return;

    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath && sourcePath !== item.path) {
      onMoveItem(sourcePath, item.path);
    }
  }, [item.type, item.path, onMoveItem]);

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onDoubleClick={handleClick}
      onContextMenu={handleContext}
      className={`flex flex-col items-center gap-3 group transition-all ${
        isDragOver && item.type === 'directory'
          ? 'bg-cyan-500/20 rounded-xl ring-2 ring-cyan-500/50 scale-105'
          : ''
      }`}
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
});

// Memoized list item component to prevent re-renders
interface FileListItemProps {
  item: FileSystemItem;
  FileIcon: ReturnType<typeof getFileIcon> | undefined;
  extLabel: string | null;
  onOpen: (item: FileSystemItem) => void;
  onContext: (event: MouseEvent, item: FileSystemItem) => void;
  onMoveItem?: (sourcePath: string, targetFolderPath: string) => void;
}

const FileListItem = memo(function FileListItem({
  item,
  FileIcon,
  extLabel,
  onOpen,
  onContext,
  onMoveItem,
}: FileListItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = useCallback(() => onOpen(item), [onOpen, item]);
  const handleContext = useCallback(
    (event: MouseEvent) => onContext(event, item),
    [onContext, item]
  );

  // Memoize formatted values
  const formattedInfo = useMemo(() => {
    if (item.type === 'directory') return 'Folder';
    return `${formatSize(item.size)} • ${new Date(item.modified).toLocaleDateString()}`;
  }, [item.type, item.size, item.modified]);

  // Drag handlers
  const handleDragStart = useCallback((e: DragEvent) => {
    e.dataTransfer.setData('text/plain', item.path);
    e.dataTransfer.effectAllowed = 'move';
  }, [item.path]);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (item.type !== 'directory') return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, [item.type]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (item.type !== 'directory' || !onMoveItem) return;

    const sourcePath = e.dataTransfer.getData('text/plain');
    if (sourcePath && sourcePath !== item.path) {
      onMoveItem(sourcePath, item.path);
    }
  }, [item.type, item.path, onMoveItem]);

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onContextMenu={handleContext}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
        isDragOver && item.type === 'directory'
          ? 'bg-cyan-500/20 ring-2 ring-cyan-500/50'
          : 'hover:bg-white/5'
      }`}
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
          {formattedInfo}
        </div>
      </div>
    </button>
  );
});

export function FilesContent({
  loading,
  viewMode,
  items,
  onOpenItem,
  onContextMenu,
  onMoveItem,
}: FilesContentProps) {
  // Pre-compute icons and extension labels for all files
  const itemsWithMeta = useMemo(() => {
    return items.map((item) => ({
      item,
      FileIcon: item.type !== 'directory' ? getFileIcon(item.name) : undefined,
      extLabel: item.type !== 'directory' ? getExtensionLabel(item.name) : null,
    }));
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
            {itemsWithMeta.map(({ item, FileIcon, extLabel }) => (
              <FileGridItem
                key={item.path}
                item={item}
                FileIcon={FileIcon}
                extLabel={extLabel}
                onOpen={onOpenItem}
                onContext={onContextMenu}
                onMoveItem={onMoveItem}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {itemsWithMeta.map(({ item, FileIcon, extLabel }) => (
              <FileListItem
                key={item.path}
                item={item}
                FileIcon={FileIcon}
                extLabel={extLabel}
                onOpen={onOpenItem}
                onContext={onContextMenu}
                onMoveItem={onMoveItem}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
