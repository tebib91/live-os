'use client';

import type { FileSystemItem } from '@/app/actions/filesystem';
import { type RefObject, useMemo } from 'react';
import { menuSections } from './constants';
import { ContextMenuHeader } from './context-menu-header';
import { ContextMenuItem } from './context-menu-item';
import { ContextMenuSeparator } from './context-menu-separator';
import type { ClipboardState, ContextMenuAction, ContextMenuSectionConfig } from './types';
import { useContextMenuActions } from './use-context-menu-actions';

interface ContextMenuState {
  x: number;
  y: number;
  item: FileSystemItem | null;
}

interface FilesContextMenuProps {
  contextMenu: ContextMenuState;
  menuRef: RefObject<HTMLDivElement | null>;
  currentPath: string;
  clipboard: ClipboardState;
  favorites: string[];
  onCut: (items: FileSystemItem[]) => void;
  onCopy: (items: FileSystemItem[]) => void;
  onClearClipboard: () => void;
  onRefresh: () => void;
  onOpen: (item: FileSystemItem) => void;
  onPreview?: (item: FileSystemItem) => void;
  onOpenInEditor: (path: string) => void;
  onRename: (item: FileSystemItem) => void;
  onShareNetwork: (item: FileSystemItem) => void;
  onClose: () => void;
}

export function FilesContextMenu({
  contextMenu,
  menuRef,
  currentPath,
  clipboard,
  favorites,
  onCut,
  onCopy,
  onClearClipboard,
  onRefresh,
  onOpen,
  onPreview,
  onOpenInEditor,
  onRename,
  onShareNetwork,
  onClose,
}: FilesContextMenuProps) {
  const { handleAction } = useContextMenuActions({
    currentPath,
    clipboard,
    onCut,
    onCopy,
    onClearClipboard,
    onRefresh,
    onOpen,
    onPreview,
    onOpenInEditor,
    onRename,
    onShareNetwork,
    onClose,
  });

  const item = contextMenu.item;
  const isFavorite = item ? favorites.includes(item.path) : false;

  // Filter sections based on conditions
  const visibleSections = useMemo(() => {
    if (!item) return [];

    return menuSections
      .map((section: ContextMenuSectionConfig) => ({
        ...section,
        items: section.items.filter((menuItem) => {
          if (!menuItem.condition) return true;
          return menuItem.condition(item, clipboard, isFavorite);
        }),
      }))
      .filter((section) => section.items.length > 0);
  }, [item, clipboard, isFavorite]);

  if (!item) return null;

  const handleItemClick = (actionId: ContextMenuAction) => {
    handleAction(actionId, item);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gradient-to-b from-[#0b0b0f]/95 to-[#101018]/95 border border-white/10 rounded-xl shadow-2xl text-white text-sm min-w-[240px] overflow-hidden backdrop-blur-lg"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(event) => event.stopPropagation()}
    >
      <ContextMenuHeader item={item} />

      <div className="p-1">
        {visibleSections.map((section, sectionIndex) => (
          <div key={section.id}>
            {sectionIndex > 0 && <ContextMenuSeparator />}
            {section.items.map((menuItem) => (
              <ContextMenuItem
                key={menuItem.id}
                id={menuItem.id}
                label={menuItem.label}
                shortcut={menuItem.shortcut}
                icon={menuItem.icon}
                danger={menuItem.danger}
                onClick={handleItemClick}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
