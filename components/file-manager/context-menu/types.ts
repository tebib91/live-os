import { type FileSystemItem } from '@/app/actions/filesystem';

// Re-exported from use-files-dialog for consistency
export interface ContextMenuState {
  x: number;
  y: number;
  item: FileSystemItem | null;
}

export interface ClipboardState {
  items: FileSystemItem[];
  operation: 'cut' | 'copy' | null;
}

export type ContextMenuAction =
  | 'open'
  | 'preview'
  | 'openInEditor'
  | 'rename'
  | 'download'
  | 'cut'
  | 'copy'
  | 'paste'
  | 'trash'
  | 'compress'
  | 'uncompress'
  | 'shareNetwork'
  | 'addFavorite'
  | 'removeFavorite';

export interface ContextMenuItemConfig {
  id: ContextMenuAction;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  condition?: (item: FileSystemItem, clipboard: ClipboardState, isFavorite: boolean) => boolean;
}

export interface ContextMenuSectionConfig {
  id: string;
  items: ContextMenuItemConfig[];
}
