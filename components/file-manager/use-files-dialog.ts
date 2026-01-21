'use client';

import {
  createDirectory,
  deleteItem,
  createFile,
  readFileContent,
  writeFileContent,
  getDefaultDirectories,
  openPath,
  readDirectory,
  renameItem,
  type DefaultDirectory,
  type DirectoryContent,
  type FileSystemItem,
} from '@/app/actions/filesystem';
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
        const result = await getDefaultDirectories();
        const normalizedHome = result.home || DEFAULT_ROOT;
        setHomePath(normalizedHome);
        setShortcuts(result.directories);
        setHistory([normalizedHome]);
        setHistoryIndex(0);
        setCurrentPath(normalizedHome);
        setReady(true);
      } catch (error) {
        console.error(error);
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

  const handleNavigate = (path: string) => {
    if (!path) return;
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentPath(path);
  };

  const handleGoToParent = () => {
    if (content?.parent) {
      handleNavigate(content.parent);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1]);
    }
  };

  const handleOpenNative = async (pathToOpen: string) => {
    if (!pathToOpen) return;
    setOpeningNative(true);
    try {
      const result = await openPath(pathToOpen);
      if (result.success) {
        toast.success('Opened in your OS');
      } else {
        toast.error(result.error || 'Failed to open');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to open');
    } finally {
      setOpeningNative(false);
    }
  };

  const openFileInEditor = async (filePath: string) => {
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
    } catch (error) {
      console.error(error);
      toast.error('Failed to open file');
    }
  };

  const handleItemOpen = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      handleNavigate(item.path);
      return;
    }
    if (isTextLike(item.name)) {
      openFileInEditor(item.path);
      return;
    }
    handleOpenNative(item.path);
  };

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

  const shortcutPath = (name: string) => {
    const match = shortcuts.find(
      (dir) => dir.name.toLowerCase() === name.toLowerCase()
    );
    if (match) return match.path;
    const trimmedHome = homePath.endsWith('/') ? homePath.slice(0, -1) : homePath;
    return `${trimmedHome}/${name}`;
  };

  const handleContextMenu = (event: React.MouseEvent, item: FileSystemItem) => {
    event.preventDefault();
    const menuWidth = 240;
    const menuHeight = 260;
    const preferredX = event.clientX;
    const preferredY = event.clientY;
    const posX = Math.min(Math.max(preferredX, 8), window.innerWidth - menuWidth - 8);
    const posY = Math.min(Math.max(preferredY, 8), window.innerHeight - menuHeight - 8);
    setContextMenu({ x: posX, y: posY, item });
  };

  const handleShare = async (item: FileSystemItem) => {
    try {
      await navigator.clipboard.writeText(item.path);
      toast.success('Path copied to clipboard');
    } catch {
      toast.error('Failed to copy path');
    }
  };

  const showInfo = (item: FileSystemItem) => {
    toast.info(`${item.type === 'directory' ? 'Folder' : 'File'} • ${item.path}`);
  };

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

  const handleCreateFolder = async () => {
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
  };

  const handleCreateFileSubmit = async () => {
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
  };

  const handleDelete = async (item: FileSystemItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) {
      return;
    }

    const result = await deleteItem(item.path);
    if (result.success) {
      toast.success('Item deleted successfully');
      loadDirectory(currentPath);
    } else {
      toast.error(result.error || 'Failed to delete item');
    }
  };

  const handleRename = async (item: FileSystemItem) => {
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
  };

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

  const handleCreateFile = () => {
    setCreatingFolder(false);
    setNewFileName('');
    setCreatingFile(true);
  };

  const toggleFolderCreation = () =>
    setCreatingFolder((prev) => {
      const next = !prev;
      if (next) {
        setCreatingFile(false);
        setNewFileName('');
      }
      return next;
    });

  const toggleFileCreation = () =>
    setCreatingFile((prev) => {
      const next = !prev;
      if (next) {
        setCreatingFolder(false);
        setNewFolderName('');
      }
      return next;
    });

  const cancelFolderCreation = () => {
    setCreatingFolder(false);
    setNewFolderName('');
  };

  const cancelFileCreation = () => {
    setCreatingFile(false);
    setNewFileName('');
  };

  const closeContextMenu = () => setContextMenu((prev) => ({ ...prev, item: null }));

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
    startFileCreation: handleCreateFile,
    toggleFolderCreation,
    toggleFileCreation,
    cancelFolderCreation,
    cancelFileCreation,
    shortcutPath,
    toDirectoryItem,
    closeContextMenu,
    isTextLike,
  };
}
