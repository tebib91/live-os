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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Dialog as Modal,
  DialogContent as ModalContent,
  DialogHeader as ModalHeader,
  DialogTitle as ModalTitle,
  DialogFooter as ModalFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  ExternalLink,
  FilePlus,
  FileIcon,
  FolderPlus,
  Grid2x2,
  Grid3x3,
  Home,
  List,
  Loader2,
  Plus,
  Search,
  Share2,
  Info,
  Trash2,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface FilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilesDialog({ open, onOpenChange }: FilesDialogProps) {
  const [homePath, setHomePath] = useState('/DATA');
  const [currentPath, setCurrentPath] = useState('/DATA');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [content, setContent] = useState<DirectoryContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [openingNative, setOpeningNative] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [history, setHistory] = useState<string[]>(['/DATA']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [shortcuts, setShortcuts] = useState<DefaultDirectory[]>([]);
  const [ready, setReady] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: FileSystemItem | null;
  }>({ x: 0, y: 0, item: null });
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorPath, setEditorPath] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [editorSaving, setEditorSaving] = useState(false);
  const isTextLike = (fileName: string) =>
    /\.(txt|md|log|json|ya?ml|js|ts|jsx|tsx|html|css)$/i.test(fileName);
  const toDirectoryItem = (itemPath: string, label: string): FileSystemItem => ({
    name: label || itemPath.split('/').filter(Boolean).pop() || 'folder',
    path: itemPath,
    type: 'directory',
    size: 0,
    modified: Date.now(),
    permissions: '',
    isHidden: label.startsWith('.'),
  });

  const guessLanguage = (filePath: string) => {
    if (filePath.endsWith('.json')) return 'json';
    if (filePath.endsWith('.md')) return 'markdown';
    if (filePath.endsWith('.yml') || filePath.endsWith('.yaml')) return 'yaml';
    if (filePath.endsWith('.ts')) return 'typescript';
    if (filePath.endsWith('.tsx')) return 'typescript';
    if (filePath.endsWith('.js')) return 'javascript';
    if (filePath.endsWith('.jsx')) return 'javascript';
    if (filePath.endsWith('.html')) return 'html';
    if (filePath.endsWith('.css')) return 'css';
    return 'plaintext';
  };

  useEffect(() => {
    if (open && ready) {
      loadDirectory(currentPath);
    }
  }, [open, currentPath, ready]);

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
        setHomePath(result.home);
        setShortcuts(result.directories);

        const normalizedHome = result.home || '/DATA';
        setHistory((prev) => {
          if (prev.length === 1 && (prev[0] === '/home' || prev[0] === '/DATA')) {
            setHistoryIndex(0);
            setCurrentPath(normalizedHome);
            return [normalizedHome];
          }
          return prev;
        });
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

  const loadDirectory = async (path: string) => {
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
  };

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

  const handleItemOpen = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      handleNavigate(item.path);
    } else {
      if (isTextLike(item.name)) {
        openFileInEditor(item.path);
        return;
      }
      handleOpenNative(item.path);
    }
  };

  const breadcrumbs = useMemo(() => {
    const normalizedHome = homePath.endsWith('/')
      ? homePath.slice(0, -1)
      : homePath || '/';

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

  const handleCreateFile = () => {
    setCreatingFolder(false);
    setNewFileName('');
    setCreatingFile(true);
  };

  const openContextMenu = (event: React.MouseEvent, item: FileSystemItem) => {
    event.preventDefault();
    const menuWidth = 220;
    const menuHeight = 260;
    const posX = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const posY = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
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

  const openFileInEditor = async (filePath: string) => {
    try {
      const result = await readFileContent(filePath);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setEditorPath(filePath);
      setEditorContent(result.content);
      setEditorOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to open file');
    }
  };

  const saveEditor = useCallback(async () => {
    setEditorSaving(true);
    const result = await writeFileContent(editorPath, editorContent);
    setEditorSaving(false);
    if (result.success) {
      toast.success('File saved');
      loadDirectory(currentPath);
      setEditorOpen(false);
    } else {
      toast.error(result.error || 'Failed to save file');
    }
  }, [currentPath, editorContent, editorPath]);

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

  const filteredItems = content?.items.filter((item) => showHidden || !item.isHidden) || [];
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1400px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
        aria-describedby="files-description"
      >
        <div className="flex h-[90vh]">
          {/* Left Sidebar */}
          <div className="w-60 bg-black/30 backdrop-blur-xl border-r border-white/10 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                  System
                </span>
                <DialogTitle className="text-3xl font-semibold text-white drop-shadow">
                  Files
                </DialogTitle>
              </div>
              <DialogDescription id="files-description" className="sr-only">
                File manager for browsing and managing your files
              </DialogDescription>
            </div>

            <ScrollArea className="flex-1 px-3">
              <div className="space-y-1">
                {/* Main Navigation */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/15 transition-colors border border-white/10 shadow-sm"
                  onClick={() => handleNavigate(homePath)}
                >
                  <Home className="h-4 w-4 text-white/80" />
                  <span className="text-sm -tracking-[0.01em]">
                    {homePath.split('/').filter(Boolean).pop() || 'Home'}
                  </span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10">
                  <Clock className="h-4 w-4 text-white/70" />
                  <span className="text-sm -tracking-[0.01em]">Recents</span>
                </button>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
                  onClick={() => handleNavigate(shortcutPath('apps'))}
                >
                  <Grid3x3 className="h-4 w-4 text-white/70" />
                  <span className="text-sm -tracking-[0.01em]">Apps</span>
                </button>

                {/* Favorites Section */}
                <div className="pt-4 pb-2">
                  <div className="text-xs text-white/50 px-3 -tracking-[0.01em]">Favorites</div>
                </div>

                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.path}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
                    onClick={() => handleNavigate(shortcut.path)}
                  >
                    <div className="relative w-4 h-3.5 flex-shrink-0">
                      <div className="absolute top-0 left-0 w-1.5 h-1 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                      <div className="absolute top-0.5 left-0 w-full h-2.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                        <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                      </div>
                    </div>
                    <span className="text-sm -tracking-[0.01em]">
                      {shortcut.name.charAt(0).toUpperCase() + shortcut.name.slice(1)}
                    </span>
                  </button>
                ))}

                {/* Network Section */}
                <div className="pt-4 pb-2">
                  <div className="text-xs text-white/50 px-3 -tracking-[0.01em]">Network</div>
                </div>

                <button
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
                  onClick={() => handleNavigate(shortcutPath('Devices'))}
                >
                  <div className="relative w-4 h-4 flex-shrink-0">
                    <div className="w-full h-full rounded-sm bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-600 shadow-sm">
                      <div className="absolute inset-0 rounded-sm bg-gradient-to-b from-white/30 to-transparent"></div>
                      <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-2 h-0.5 bg-cyan-700 rounded-full"></div>
                    </div>
                  </div>
                  <span className="text-sm -tracking-[0.01em]">Devices</span>
                  <Plus className="h-3 w-3 ml-auto text-white/40" />
                </button>
              </div>
            </ScrollArea>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-white/10">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10">
                <div className="relative w-4 h-4 flex-shrink-0">
                  <div className="w-full h-full rounded-sm bg-gradient-to-br from-zinc-500 via-zinc-600 to-zinc-700 shadow-sm">
                    <div className="absolute inset-0 rounded-sm bg-gradient-to-b from-white/20 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="w-2 h-2.5 border border-zinc-300 border-t-0 rounded-b-sm"></div>
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-0.5 bg-zinc-300 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <span className="text-sm -tracking-[0.01em]">Trash</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-xl">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur">
              {/* Left Section - Navigation */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    disabled={historyIndex === 0 || loading}
                    className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleForward}
                    disabled={historyIndex >= history.length - 1 || loading}
                    className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-1 text-white">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.path} className="flex items-center gap-1">
                      {index === 0 ? (
                        <Home className="h-4 w-4 text-white/80" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-white/50" />
                      )}
                      <button
                        className={`px-2 py-1 rounded-md text-sm font-medium -tracking-[0.01em] transition-colors ${
                          index === breadcrumbs.length - 1
                            ? 'bg-white/15 text-white border border-white/15'
                            : 'hover:bg-white/10 text-white/80 border border-transparent'
                        }`}
                        onClick={() => handleNavigate(crumb.path)}
                        onContextMenu={(e) =>
                          openContextMenu(e, toDirectoryItem(crumb.path, crumb.label))
                        }
                      >
                        {crumb.label}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleGoToParent}
                    disabled={!content?.parent || loading}
                    className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenNative(currentPath)}
                    disabled={loading || openingNative}
                    className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCreatingFolder((prev) => {
                      const next = !prev;
                      if (next) {
                        setCreatingFile(false);
                        setNewFileName('');
                      }
                      return next;
                    })
                  }
                  disabled={loading}
                  className="h-9 px-4 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-white text-sm shadow-sm"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Folder
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    setCreatingFile((prev) => {
                      const next = !prev;
                      if (next) {
                        setCreatingFolder(false);
                        setNewFolderName('');
                      }
                      return next;
                    })
                  }
                  disabled={loading}
                  className="h-9 px-4 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-white text-sm shadow-sm"
                >
                  <FilePlus className="h-4 w-4 mr-2" />
                  File
                </Button>

                <label className="flex items-center gap-2 text-xs text-white/70">
                  <span className="relative inline-flex">
                    <input
                      type="checkbox"
                      checked={showHidden}
                      onChange={(e) => setShowHidden(e.target.checked)}
                      className="peer h-4 w-4 appearance-none rounded border border-white/20 bg-white/10 transition-all checked:bg-white checked:border-white/80 checked:shadow-[0_0_0_2px_rgba(255,255,255,0.18)]"
                    />
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] text-black opacity-0 peer-checked:opacity-100">
                      ✓
                    </span>
                  </span>
                  Hidden
                </label>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search"
                    className="h-9 w-48 pl-9 bg-white/10 border-white/15 text-white placeholder:text-white/40 text-sm"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={`h-9 w-9 rounded-lg border ${
                    viewMode === 'grid'
                      ? 'border-white/60 bg-white/15 text-white'
                      : 'border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <Grid2x2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={`h-9 w-9 rounded-lg border ${
                    viewMode === 'list'
                      ? 'border-white/60 bg-white/15 text-white'
                      : 'border-white/15 bg-white/10 text-white/70 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <List className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-white/70"
                  onClick={handleCreateFile}
                >
                  <FilePlus className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* New Folder Input */}
            {creatingFolder && (
              <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2 bg-black/30 backdrop-blur">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  className="bg-white/10 border border-white/15 text-white"
                  autoFocus
                />
                <Button
                  onClick={handleCreateFolder}
                  size="sm"
                  className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
                >
                  Create
                </Button>
                <Button
                  onClick={() => {
                    setCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  size="sm"
                  variant="ghost"
                  className="hover:bg-white/10 text-white/80"
                >
                  Cancel
                </Button>
              </div>
            )}
            {creatingFile && (
              <div className="px-6 py-3 border-b border-white/10 flex items-center gap-2 bg-black/30 backdrop-blur">
                <Input
                  placeholder="File name"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFileSubmit();
                    if (e.key === 'Escape') {
                      setCreatingFile(false);
                      setNewFileName('');
                    }
                  }}
                  className="bg-white/10 border border-white/15 text-white"
                  autoFocus
                />
                <Button
                  onClick={handleCreateFileSubmit}
                  size="sm"
                  className="border border-white/15 bg-white/10 hover:bg-white/20 text-white shadow-sm"
                >
                  Create
                </Button>
                <Button
                  onClick={() => {
                    setCreatingFile(false);
                    setNewFileName('');
                  }}
                  size="sm"
                  variant="ghost"
                  className="hover:bg-white/10 text-white/80"
                >
                  Cancel
                </Button>
              </div>
            )}

            {/* Content Area */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-white/40">
                    Empty directory
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {filteredItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleItemOpen(item)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          handleOpenNative(item.path);
                        }}
                        onContextMenu={(e) => openContextMenu(e, item)}
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
                            {item.type === 'directory'
                              ? 'Folder'
                              : `${(item.size / 1024).toFixed(1)} KB`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => handleItemOpen(item)}
                        onContextMenu={(e) => openContextMenu(e, item)}
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
                              : `${(item.size / 1024).toFixed(1)} KB • ${new Date(
                                  item.modified
                                ).toLocaleDateString()}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-800">
              <div className="text-xs text-white/40 text-right -tracking-[0.01em]">
                {filteredItems.length} items {showHidden && `(${content?.items.length} total)`}
              </div>
            </div>

            {contextMenu.item && (
              <div
                ref={contextMenuRef}
                className="fixed z-50 bg-gradient-to-b from-[#0b0b0f]/95 to-[#101018]/95 border border-white/10 rounded-xl shadow-2xl text-white text-sm min-w-[220px] overflow-hidden backdrop-blur-lg"
                style={{ top: contextMenu.y, left: contextMenu.x }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-white/10">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-1">
                    Selected
                  </div>
                  <div className="font-semibold text-white truncate">
                    {(contextMenu.item as FileSystemItem).name}
                  </div>
                  <div className="text-[11px] text-white/40 truncate">
                    {(contextMenu.item as FileSystemItem).path}
                  </div>
                </div>
                <div className="p-1">
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      handleItemOpen(contextMenu.item as FileSystemItem);
                      setContextMenu({ ...contextMenu, item: null });
                    }}
                  >
                    <ExternalLink className="h-4 w-4 text-white/70" /> Open
                  </button>
                  {contextMenu.item?.type === 'file' &&
                    isTextLike((contextMenu.item as FileSystemItem).name) && (
                      <button
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                        onClick={() => {
                          openFileInEditor((contextMenu.item as FileSystemItem).path);
                          setContextMenu({ ...contextMenu, item: null });
                        }}
                      >
                        <FileIcon className="h-4 w-4 text-white/70" /> Open in editor
                      </button>
                    )}
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      handleRename(contextMenu.item as FileSystemItem);
                      setContextMenu({ ...contextMenu, item: null });
                    }}
                  >
                    <FileIcon className="h-4 w-4 text-white/70" /> Rename
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 text-red-300 transition-colors"
                    onClick={() => {
                      handleDelete(contextMenu.item as FileSystemItem);
                      setContextMenu({ ...contextMenu, item: null });
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      handleShare(contextMenu.item as FileSystemItem);
                      setContextMenu({ ...contextMenu, item: null });
                    }}
                  >
                    <Share2 className="h-4 w-4 text-white/70" /> Share path
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors"
                    onClick={() => {
                      showInfo(contextMenu.item as FileSystemItem);
                      setContextMenu({ ...contextMenu, item: null });
                    }}
                  >
                    <Info className="h-4 w-4 text-white/70" /> Info
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      {editorOpen && (
        <Modal open={editorOpen} onOpenChange={(isOpen) => setEditorOpen(isOpen)}>
          <ModalContent className="max-w-6xl w-[96vw] max-h-[90vh] bg-[#05050a]/95 text-white border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/60 overflow-hidden">
            <ModalHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <ModalTitle className="text-xl font-semibold">
                  Editing {editorPath.split('/').filter(Boolean).pop()}
                </ModalTitle>
                <p className="text-xs text-white/50 mt-1 break-all">
                  {editorPath}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                  onClick={() => setEditorOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                  onClick={saveEditor}
                  disabled={editorSaving}
                >
                  {editorSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </ModalHeader>
            <div className="px-2 pb-4">
              <div className="text-[11px] text-white/50 mb-2">
                Tip: press <span className="font-semibold text-white/80">Ctrl/⌘ + S</span> to save
              </div>
              <div className="h-[65vh] rounded-lg border border-white/10 overflow-hidden bg-black/60">
                <MonacoEditor
                  height="100%"
                  language={editorLanguage}
                  theme="vs-dark"
                  value={editorContent}
                  onChange={(value) => setEditorContent(value ?? '')}
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    smoothScrolling: true,
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
            <ModalFooter className="px-6 pb-6 pt-0 flex justify-between">
              <div className="text-xs text-white/40">
                {editorPath}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                  onClick={() => setEditorOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="h-9 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/30"
                  onClick={saveEditor}
                  disabled={editorSaving}
                >
                  {editorSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </Dialog>
  );
}
