'use client';

import type { FileSystemItem } from '@/app/actions/filesystem';
import {
  compressItems,
  copyItems,
  moveItems,
  trashItem,
  uncompressArchive,
} from '@/app/actions/filesystem';
import { addFavorite, removeFavorite } from '@/app/actions/favorites';
import { useCallback } from 'react';
import { toast } from 'sonner';
import type { ClipboardState, ContextMenuAction } from './types';

interface UseContextMenuActionsProps {
  currentPath: string;
  clipboard: ClipboardState;
  onCut: (items: FileSystemItem[]) => void;
  onCopy: (items: FileSystemItem[]) => void;
  onClearClipboard: () => void;
  onRefresh: () => void;
  onOpen: (item: FileSystemItem) => void;
  onOpenInEditor: (path: string) => void;
  onRename: (item: FileSystemItem) => void;
  onShareNetwork: (item: FileSystemItem) => void;
  onClose: () => void;
}

export function useContextMenuActions({
  currentPath,
  clipboard,
  onCut,
  onCopy,
  onClearClipboard,
  onRefresh,
  onOpen,
  onOpenInEditor,
  onRename,
  onShareNetwork,
  onClose,
}: UseContextMenuActionsProps) {
  const handleAction = useCallback(
    async (action: ContextMenuAction, item: FileSystemItem) => {
      onClose();

      switch (action) {
        case 'open':
          onOpen(item);
          break;

        case 'openInEditor':
          onOpenInEditor(item.path);
          break;

        case 'rename':
          onRename(item);
          break;

        case 'download':
          // Trigger download via API route
          window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
          break;

        case 'cut':
          onCut([item]);
          toast.success('Item ready to move');
          break;

        case 'copy':
          onCopy([item]);
          toast.success('Item copied to clipboard');
          break;

        case 'paste':
          if (clipboard.items.length === 0 || !clipboard.operation) {
            toast.error('Nothing to paste');
            return;
          }
          try {
            const sourcePaths = clipboard.items.map((i) => i.path);
            // Paste into directory if it's a directory, otherwise paste into current path
            const destPath = item.type === 'directory' ? item.path : currentPath;

            if (clipboard.operation === 'cut') {
              const result = await moveItems(sourcePaths, destPath);
              if (result.success) {
                toast.success('Items moved successfully');
                onClearClipboard();
              } else {
                toast.error(result.error || 'Failed to move items');
              }
            } else {
              const result = await copyItems(sourcePaths, destPath);
              if (result.success) {
                toast.success('Items copied successfully');
              } else {
                toast.error(result.error || 'Failed to copy items');
              }
            }
            onRefresh();
          } catch (error) {
            toast.error('Paste operation failed');
            console.error(error);
          }
          break;

        case 'trash':
          if (!confirm(`Move "${item.name}" to trash?`)) return;
          try {
            const result = await trashItem(item.path);
            if (result.success) {
              toast.success('Item moved to trash');
              onRefresh();
            } else {
              toast.error(result.error || 'Failed to move item to trash');
            }
          } catch (error) {
            toast.error('Failed to move item to trash');
            console.error(error);
          }
          break;

        case 'compress':
          try {
            const result = await compressItems([item.path]);
            if (result.success) {
              toast.success(`Created ${result.outputPath?.split('/').pop()}`);
              onRefresh();
            } else {
              toast.error(result.error || 'Failed to compress item');
            }
          } catch (error) {
            toast.error('Failed to compress item');
            console.error(error);
          }
          break;

        case 'uncompress':
          try {
            const result = await uncompressArchive(item.path);
            if (result.success) {
              toast.success('Archive extracted successfully');
              onRefresh();
            } else {
              toast.error(result.error || 'Failed to extract archive');
            }
          } catch (error) {
            toast.error('Failed to extract archive');
            console.error(error);
          }
          break;

        case 'shareNetwork':
          onShareNetwork(item);
          break;

        case 'addFavorite':
          try {
            const result = await addFavorite(item.path);
            if (result.success) {
              toast.success('Added to favorites');
            } else {
              toast.error(result.error || 'Failed to add to favorites');
            }
          } catch (error) {
            toast.error('Failed to add to favorites');
            console.error(error);
          }
          break;

        case 'removeFavorite':
          try {
            const result = await removeFavorite(item.path);
            if (result.success) {
              toast.success('Removed from favorites');
            } else {
              toast.error(result.error || 'Failed to remove from favorites');
            }
          } catch (error) {
            toast.error('Failed to remove from favorites');
            console.error(error);
          }
          break;
      }
    },
    [
      clipboard,
      currentPath,
      onClearClipboard,
      onClose,
      onCopy,
      onCut,
      onOpen,
      onOpenInEditor,
      onRefresh,
      onRename,
      onShareNetwork,
    ]
  );

  return { handleAction };
}
