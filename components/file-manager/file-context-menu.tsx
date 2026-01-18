'use client';

import { type FileSystemItem } from '@/app/actions/filesystem';
import { ExternalLink, FileIcon, Info, Share2, Trash2 } from 'lucide-react';
import { type RefObject } from 'react';

interface ContextMenuState {
  x: number;
  y: number;
  item: FileSystemItem | null;
}

interface FilesContextMenuProps {
  contextMenu: ContextMenuState;
  menuRef: RefObject<HTMLDivElement | null>;
  isTextLike: (name: string) => boolean;
  onOpen: (item: FileSystemItem) => void;
  onOpenInEditor: (path: string) => void;
  onRename: (item: FileSystemItem) => void;
  onDelete: (item: FileSystemItem) => void;
  onShare: (item: FileSystemItem) => void;
  onInfo: (item: FileSystemItem) => void;
  onClose: () => void;
}

export function FilesContextMenu({
  contextMenu,
  menuRef,
  isTextLike,
  onOpen,
  onOpenInEditor,
  onRename,
  onDelete,
  onShare,
  onInfo,
  onClose,
}: FilesContextMenuProps) {
  if (!contextMenu.item) return null;

  const item = contextMenu.item;

  const handleAction = (action: () => void) => () => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gradient-to-b from-[#0b0b0f]/95 to-[#101018]/95 border border-white/10 rounded-xl shadow-2xl text-white text-sm min-w-[220px] overflow-hidden backdrop-blur-lg"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-white/10">
        <div className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-1">
          Selected
        </div>
        <div className="font-semibold text-white truncate">{item.name}</div>
        <div className="text-[11px] text-white/40 truncate">{item.path}</div>
      </div>
      <div className="p-1">
        <button
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
          onClick={handleAction(() => onOpen(item))}
        >
          <ExternalLink className="h-4 w-4 text-white/70" /> Open
        </button>
        {item.type === 'file' && isTextLike(item.name) && (
          <button
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
            onClick={handleAction(() => onOpenInEditor(item.path))}
          >
            <FileIcon className="h-4 w-4 text-white/70" /> Open in editor
          </button>
        )}
        <button
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
          onClick={handleAction(() => onRename(item))}
        >
          <FileIcon className="h-4 w-4 text-white/70" /> Rename
        </button>
        <button
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-red-300 transition-colors"
          onClick={handleAction(() => onDelete(item))}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </button>
        <button
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
          onClick={handleAction(() => onShare(item))}
        >
          <Share2 className="h-4 w-4 text-white/70" /> Share path
        </button>
        <button
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
          onClick={handleAction(() => onInfo(item))}
        >
          <Info className="h-4 w-4 text-white/70" /> Info
        </button>
      </div>
    </div>
  );
}
