'use client';

import {
  createDirectory,
  trashItem,
  createFile,
  readFileContent,
  writeFileContent,
  getDefaultDirectories,
  getTrashInfo,
  emptyTrash,
  moveItems,
  openPath,
  readDirectory,
  renameItem,
  type DefaultDirectory,
  type DirectoryContent,
  type FileSystemItem,
} from '@/app/actions/filesystem';
import { getFavorites } from '@/app/actions/favorites';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

const DEFAULT_ROOT = '/DATA';

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileSystemItem | null;
}

const TEXT_EXTENSIONS =
  /\.(txt|md|log|json|ya?ml|js|ts|jsx|tsx|html|css|scss|less|sh|bash|zsh|env|toml|ini|conf|config|dockerfile|go|rs|py|rb|php|java|c|cpp|h|hpp|sql|prisma)$/i;

const LANGUAGE_BY_EXT: Record<string, string> = {
  json: 'json',
  md: 'markdown',
  markdown: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  env: 'properties',
  toml: 'toml',
  ini: 'properties',
  conf: 'properties',
  config: 'properties',
  dockerfile: 'dockerfile',
  go: 'go',
  rs: 'rust',
  py: 'python',
  rb: 'ruby',
  php: 'php',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  sql: 'sql',
  prisma: 'prisma',
};

const isTextLike = (fileName: string) => {
  if (/dockerfile$/i.test(fileName)) return true;
  return TEXT_EXTENSIONS.test(fileName);
};

const guessLanguage = (filePath: string) => {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('dockerfile')) return 'dockerfile';
  const parts = lower.split('.');
  const ext = parts.length > 1 ? parts.pop() || '' : '';
  return LANGUAGE_BY_EXT[ext] || 'plaintext';
};

const toDirectoryItem = (itemPath: string, label: string): FileSystemItem => ({
  name: label || itemPath.split('/').filter(Boolean).pop() || 'folder',
  path: itemPath,
  type: 'directory',
  size: 0,
  modified: Date.now(),
  permissions: '',
  isHidden: label.startsWith('.'),
});

export function useFilesDialog(open: boolean) {
  const [homePath, setHomePath] = useState(DEFAULT_ROOT);
  const [currentPath, setCurrentPath] = useState(DEFAULT_ROOT);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [content, setContent] = useState<DirectoryContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingNative, setOpeningNative] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [history, setHistory] = useState<string[]>([DEFAULT_ROOT]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [shortcuts, setShortcuts] = useState<DefaultDirectory[]>([]);
  const [ready, setReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    item: null,
  });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [trashPath, setTrashPath] = useState('');
  const [trashItemCount, setTrashItemCount] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorOriginalContent, setEditorOriginalContent] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);

  const loadDirectory = useCallback(
    async (path: string) => {
      setLoading(true);
      try {
        const result = await readDirectory(path);
        setContent(result);
        setCurrentPath(result.currentPath);
      } catch (error) {
        toast.error((error as Error).message || 'Failed to load directory');
      } finally {
        setLoading(false);
      }
    },
    [setContent]
  );

  useEffect(() => {
    if (open && ready) {
      loadDirectory(currentPath);
    }
  }, [open, currentPath, ready, loadDirectory]);

  useEffect(() => {
    if (!open) {
      setReady(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const loadDefaults = async () => {
      try {
        const [dirResult, favResult, trashResult] = await Promise.all([
          getDefaultDirectories(),
          getFavorites(),
          getTrashInfo(),
        ]);
        const normalizedHome = dirResult.home || DEFAULT_ROOT;
        setHomePath(normalizedHome);
        setShortcuts(dirResult.directories);
        setFavorites(favResult.favorites);
        setTrashPath(trashResult.path);
        setTrashItemCount(trashResult.itemCount);
        setHistory([normalizedHome]);
        setHistoryIndex(0);
        setCurrentPath(normalizedHome);
        setReady(true);
      } catch {
        toast.error('Failed to load default directories');
      }
    };

    loadDefaults();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu((prev) => ({ ...prev, item: null }));
      }
    };
    const handleKeyClose = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu((prev) => ({ ...prev, item: null }));
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyClose);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyClose);
    };
  }, []);

  // Max history entries to prevent memory leaks
  const MAX_HISTORY = 50;

  const handleNavigate = useCallback((path: string) => {
    if (!path) return;
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(path);
      // Limit history to prevent memory leak
      return newHistory.slice(-MAX_HISTORY);
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
    setCurrentPath(path);
  }, [historyIndex]);

  const handleGoToParent = useCallback(() => {
    if (content?.parent) {
      handleNavigate(content.parent);
    }
  }, [content?.parent, handleNavigate]);

  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const handleForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  const handleOpenNative = useCallback(async (pathToOpen: string) => {
    if (!pathToOpen) return;
    setOpeningNative(true);
    try {
      const result = await openPath(pathToOpen);
      if (result.success) {
        toast.success('Opened in your OS');
      } else {
        toast.error(result.error || 'Failed to open');
      }
    } catch {
      toast.error('Failed to open');
    } finally {
      setOpeningNative(false);
    }
  }, []);

  const openFileInEditor = useCallback(async (filePath: string) => {
    try {
      const result = await readFileContent(filePath);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEditorPath(filePath);
      setEditorContent(result.content);
      setEditorOriginalContent(result.content);
      setEditorOpen(true);
    } catch {
      toast.error('Failed to open file');
    }
  }, []);

  const handleItemOpen = useCallback((item: FileSystemItem) => {
    if (item.type === 'directory') {
      handleNavigate(item.path);
      return;
    }
    if (isTextLike(item.name)) {
      openFileInEditor(item.path);
      return;
    }
    handleOpenNative(item.path);
  }, [handleNavigate, openFileInEditor, handleOpenNative]);

  const breadcrumbs = useMemo(() => {
    const normalizedHome = homePath.endsWith('/') ? homePath.slice(0, -1) : homePath || '/';
    const relative = currentPath.startsWith(normalizedHome)
      ? currentPath.slice(normalizedHome.length)
      : currentPath;

    const parts = relative.split('/').filter(Boolean);
    const trail: { label: string; path: string }[] = [];
    trail.push({
      label: normalizedHome.split('/').filter(Boolean).pop() || 'Home',
      path: normalizedHome || '/',
    });

    let accum = normalizedHome || '/';
    parts.forEach((part) => {
      accum = `${accum}/${part}`.replace(/\/+/g, '/');
      trail.push({ label: part, path: accum });
    });

    return trail;
  }, [currentPath, homePath]);

  const shortcutPath = useCallback((name: string) => {
    const match = shortcuts.find(
      (dir) => dir.name.toLowerCase() === name.toLowerCase()
    );
    if (match) return match.path;
    const trimmedHome = homePath.endsWith('/') ? homePath.slice(0, -1) : homePath;
    return `${trimmedHome}/${name}`;
  }, [shortcuts, homePath]);

  const handleContextMenu = useCallback((event: React.MouseEvent, item: FileSystemItem) => {
    event.preventDefault();
    const menuWidth = 240;
    const menuHeight = 260;
    const preferredX = event.clientX;
    const preferredY = event.clientY;
    const posX = Math.min(Math.max(preferredX, 8), window.innerWidth - menuWidth - 8);
    const posY = Math.min(Math.max(preferredY, 8), window.innerHeight - menuHeight - 8);
    setContextMenu({ x: posX, y: posY, item });
  }, []);

  const handleShare = useCallback(async (item: FileSystemItem) => {
    try {
      await navigator.clipboard.writeText(item.path);
      toast.success('Path copied to clipboard');
    } catch {
      toast.error('Failed to copy path');
    }
  }, []);

  const showInfo = useCallback((item: FileSystemItem) => {
    toast.info(`${item.type === 'directory' ? 'Folder' : 'File'} • ${item.path}`);
  }, []);

  const saveEditor = useCallback(async () => {
    setEditorSaving(true);
    const result = await writeFileContent(editorPath, editorContent);
    setEditorSaving(false);
    if (result.success) {
      toast.success('File saved');
      loadDirectory(currentPath);
      setEditorOriginalContent(editorContent);
      setEditorOpen(false);
    } else {
      toast.error(result.error || 'Failed to save file');
    }
  }, [currentPath, editorContent, editorPath, loadDirectory]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    const result = await createDirectory(currentPath, newFolderName);
    if (result.success) {
      toast.success('Folder created successfully');
      setNewFolderName('');
      setCreatingFolder(false);
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || 'Failed to create folder');
    }
  }, [currentPath, newFolderName, loadDirectory]);

  const handleCreateFileSubmit = useCallback(async () => {
    if (!newFileName.trim()) {
      toast.error('Please enter a file name');
      return;
    }
    const result = await createFile(currentPath, newFileName);
    if (result.success) {
      toast.success('File created successfully');
      setNewFileName('');
      setCreatingFile(false);
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || 'Failed to create file');
    }
  }, [currentPath, newFileName, loadDirectory]);

  const handleDelete = useCallback(async (item: FileSystemItem) => {
    if (!confirm(`Move "${item.name}" to Trash?`)) {
      return;
    }

    const result = await trashItem(item.path);
    if (result.success) {
      toast.success('Item moved to Trash');
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || 'Failed to move item to Trash');
    }
  }, [currentPath, loadDirectory]);

  const handleRename = useCallback(async (item: FileSystemItem) => {
    const newName = prompt(`Rename "${item.name}" to:`, item.name);
    if (!newName || newName === item.name) {
      return;
    }

    const result = await renameItem(item.path, newName);
    if (result.success) {
      toast.success('Item renamed successfully');
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || 'Failed to rename item');
    }
  }, [currentPath, loadDirectory]);

  const handleMoveItem = useCallback(async (sourcePath: string, targetFolderPath: string) => {
    const result = await moveItems([sourcePath], targetFolderPath);
    if (result.success) {
      toast.success('Item moved successfully');
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || 'Failed to move item');
    }
  }, [currentPath, loadDirectory]);

  const filteredItems = useMemo(
    () => content?.items.filter((item) => showHidden || !item.isHidden) || [],
    [content?.items, showHidden]
  );
  const editorLanguage = useMemo(() => guessLanguage(editorPath), [editorPath]);

  useEffect(() => {
    if (!editorOpen) return;
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveEditor();
      }
      if (event.key === 'Escape') {
        setEditorOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editorOpen, saveEditor]);

  const handleCreateFile = useCallback(() => {
    setCreatingFolder(false);
    setNewFileName('');
    setCreatingFile(true);
  }, []);

  const toggleFolderCreation = useCallback(() => {
    setCreatingFolder((prev) => {
      const next = !prev;
      if (next) {
        setCreatingFile(false);
        setNewFileName('');
      }
      return next;
    });
  }, []);

  const toggleFileCreation = useCallback(() => {
    setCreatingFile((prev) => {
      const next = !prev;
      if (next) {
        setCreatingFolder(false);
        setNewFolderName('');
      }
      return next;
    });
  }, []);

  const cancelFolderCreation = useCallback(() => {
    setCreatingFolder(false);
    setNewFolderName('');
  }, []);

  const cancelFileCreation = useCallback(() => {
    setCreatingFile(false);
    setNewFileName('');
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, item: null }));
  }, []);

  const refreshFavorites = useCallback(async () => {
    try {
      const result = await getFavorites();
      setFavorites(result.favorites);
    } catch {
      // Silently fail - favorites are non-critical
    }
  }, []);

  const refreshTrashInfo = useCallback(async () => {
    try {
      const result = await getTrashInfo();
      setTrashPath(result.path);
      setTrashItemCount(result.itemCount);
    } catch {
      // Silently fail
    }
  }, []);

  const handleEmptyTrash = useCallback(async () => {
    if (!confirm('Permanently delete all items in Trash? This cannot be undone.')) {
      return;
    }

    const result = await emptyTrash();
    if (result.success) {
      toast.success(`Deleted ${result.deletedCount} item(s) from Trash`);
      refreshTrashInfo();
      // Reload if currently viewing trash
      if (currentPath === trashPath) {
        loadDirectory(currentPath);
      }
    } else {
      toast.error(result.error || 'Failed to empty trash');
    }
  }, [currentPath, trashPath, loadDirectory, refreshTrashInfo]);

  const refresh = useCallback(() => {
    loadDirectory(currentPath);
    refreshFavorites();
    refreshTrashInfo();
  }, [currentPath, loadDirectory, refreshFavorites, refreshTrashInfo]);

  return {
    // state
    homePath,
    currentPath,
    viewMode,
    content,
    loading,
    openingNative,
    showHidden,
    creatingFolder,
    newFolderName,
    creatingFile,
    newFileName,
    historyIndex,
    historyLength: history.length,
    shortcuts,
    favorites,
    trashPath,
    trashItemCount,
    filteredItems,
    breadcrumbs,
    contextMenu,
    contextMenuRef,
    editorOpen,
    editorPath,
    editorContent,
    editorOriginalContent,
    editorSaving,
    editorLanguage,
    // actions
    setViewMode,
    setShowHidden,
    setNewFolderName,
    setNewFileName,
    setEditorContent,
    setEditorOriginalContent,
    closeEditor: () => setEditorOpen(false),
    navigate: handleNavigate,
    goToParent: handleGoToParent,
    back: handleBack,
    forward: handleForward,
    openNative: handleOpenNative,
    openItem: handleItemOpen,
    openContextMenu: handleContextMenu,
    share: handleShare,
    info: showInfo,
    openFileInEditor,
    saveEditor,
    createFolder: handleCreateFolder,
    createFile: handleCreateFileSubmit,
    deleteItem: handleDelete,
    renameItem: handleRename,
    moveItem: handleMoveItem,
    startFileCreation: handleCreateFile,
    toggleFolderCreation,
    toggleFileCreation,
    cancelFolderCreation,
    cancelFileCreation,
    shortcutPath,
    toDirectoryItem,
    closeContextMenu,
    isTextLike,
    refresh,
    refreshFavorites,
    emptyTrash: handleEmptyTrash,
  };
}
