import {
  Archive,
  Clipboard,
  Copy,
  Download,
  Eye,
  FolderOpen,
  Network,
  Pencil,
  Scissors,
  Star,
  StarOff,
  Trash2,
} from 'lucide-react';
import type { ContextMenuSectionConfig, ClipboardState } from './types';
import type { FileSystemItem } from '@/app/actions/filesystem';
import { isFileViewable } from '@/components/file-manager/file-viewer';

// Archive file extensions
export const ARCHIVE_EXTENSIONS = /\.(zip|tar|tar\.gz|tgz|tar\.bz2|tbz2|tar\.xz|txz|7z|rar|gz|bz2|xz)$/i;

// Check if item is an archive
export const isArchive = (name: string): boolean => ARCHIVE_EXTENSIONS.test(name);

// Menu sections configuration
export const menuSections: ContextMenuSectionConfig[] = [
  {
    id: 'primary',
    items: [
      {
        id: 'open',
        label: 'Open',
        icon: FolderOpen,
      },
      {
        id: 'preview',
        label: 'Preview',
        icon: Eye,
        condition: (item: FileSystemItem) => item.type === 'file' && isFileViewable(item.name),
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: Pencil,
      },
    ],
  },
  {
    id: 'download',
    items: [
      {
        id: 'download',
        label: 'Download',
        icon: Download,
        condition: (item: FileSystemItem) => item.type === 'file',
      },
    ],
  },
  {
    id: 'clipboard',
    items: [
      {
        id: 'cut',
        label: 'Cut',
        shortcut: '\u2318X',
        icon: Scissors,
      },
      {
        id: 'copy',
        label: 'Copy',
        shortcut: '\u2318C',
        icon: Copy,
      },
      {
        id: 'paste',
        label: 'Paste',
        shortcut: '\u2318V',
        icon: Clipboard,
        condition: (_item: FileSystemItem, clipboard: ClipboardState) =>
          clipboard.items.length > 0 && clipboard.operation !== null,
      },
    ],
  },
  {
    id: 'trash',
    items: [
      {
        id: 'trash',
        label: 'Trash',
        shortcut: '\u2318\u232B',
        icon: Trash2,
        danger: true,
      },
    ],
  },
  {
    id: 'archive',
    items: [
      {
        id: 'compress',
        label: 'Compress',
        icon: Archive,
        condition: (item: FileSystemItem) => !isArchive(item.name),
      },
      {
        id: 'uncompress',
        label: 'Uncompress',
        icon: Archive,
        condition: (item: FileSystemItem) => isArchive(item.name),
      },
    ],
  },
  {
    id: 'extras',
    items: [
      {
        id: 'shareNetwork',
        label: 'Share over network...',
        icon: Network,
        condition: (item: FileSystemItem) => item.type === 'directory',
      },
      {
        id: 'addFavorite',
        label: 'Add to favorites',
        icon: Star,
        condition: (item: FileSystemItem, _clipboard: ClipboardState, isFavorite: boolean) =>
          item.type === 'directory' && !isFavorite,
      },
      {
        id: 'removeFavorite',
        label: 'Remove from favorites',
        icon: StarOff,
        condition: (item: FileSystemItem, _clipboard: ClipboardState, isFavorite: boolean) =>
          item.type === 'directory' && isFavorite,
      },
    ],
  },
];
