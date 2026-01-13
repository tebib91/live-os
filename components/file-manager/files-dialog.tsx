'use client';

import {
  createDirectory,
  deleteItem,
  readDirectory,
  renameItem,
  type DirectoryContent,
  type FileSystemItem,
} from '@/app/actions/filesystem';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileIcon,
  FolderPlus,
  Grid2x2,
  Grid3x3,
  Home,
  List,
  Loader2,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface FilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FilesDialog({ open, onOpenChange }: FilesDialogProps) {
  const [currentPath, setCurrentPath] = useState('/home');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [content, setContent] = useState<DirectoryContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [history, setHistory] = useState<string[]>(['/home']);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    if (open) {
      loadDirectory(currentPath);
    }
  }, [open, currentPath]);

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
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(path);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentPath(path);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1400px] max-h-[90vh] bg-black border-zinc-800 shadow-2xl p-0 gap-0 overflow-hidden"
        aria-describedby="files-description"
      >
        <div className="flex h-[90vh]">
          {/* Left Sidebar */}
          <div className="w-52 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6">
              <DialogTitle className="text-5xl font-bold text-white/90 -tracking-[0.02em]">Files</DialogTitle>
              <DialogDescription id="files-description" className="sr-only">
                File manager for browsing and managing your files
              </DialogDescription>
            </div>

            <ScrollArea className="flex-1 px-3">
              <div className="space-y-1">
                {/* Main Navigation */}
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/15 transition-colors">
                  <Home className="h-4 w-4 text-orange-500" />
                  <span className="text-sm -tracking-[0.01em]">ahmed&apos;s Umbrel</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <span className="text-sm -tracking-[0.01em]">Recents</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
                  <Grid3x3 className="h-4 w-4 text-orange-500" />
                  <span className="text-sm -tracking-[0.01em]">Apps</span>
                </button>

                {/* Favorites Section */}
                <div className="pt-4 pb-2">
                  <div className="text-xs text-white/40 px-3 -tracking-[0.01em]">Favorites</div>
                </div>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
                  <div className="relative w-4 h-3.5 flex-shrink-0">
                    {/* Tab */}
                    <div className="absolute top-0 left-0 w-1.5 h-1 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                    {/* Body */}
                    <div className="absolute top-0.5 left-0 w-full h-2.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                      <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                    </div>
                  </div>
                  <span className="text-sm -tracking-[0.01em]">Downloads</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
                  <div className="relative w-4 h-3.5 flex-shrink-0">
                    {/* Tab */}
                    <div className="absolute top-0 left-0 w-1.5 h-1 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                    {/* Body */}
                    <div className="absolute top-0.5 left-0 w-full h-2.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                      <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                    </div>
                  </div>
                  <span className="text-sm -tracking-[0.01em]">Documents</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
                  <div className="relative w-4 h-3.5 flex-shrink-0">
                    {/* Tab */}
                    <div className="absolute top-0 left-0 w-1.5 h-1 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                    {/* Body */}
                    <div className="absolute top-0.5 left-0 w-full h-2.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                      <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                    </div>
                  </div>
                  <span className="text-sm -tracking-[0.01em]">Photos</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
                  <div className="relative w-4 h-3.5 flex-shrink-0">
                    {/* Tab */}
                    <div className="absolute top-0 left-0 w-1.5 h-1 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                    {/* Body */}
                    <div className="absolute top-0.5 left-0 w-full h-2.5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                      <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                    </div>
                  </div>
                  <span className="text-sm -tracking-[0.01em]">Videos</span>
                </button>

                {/* Network Section */}
                <div className="pt-4 pb-2">
                  <div className="text-xs text-white/40 px-3 -tracking-[0.01em]">Network</div>
                </div>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
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
            <div className="p-3 border-t border-zinc-800">
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors">
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
          <div className="flex-1 flex flex-col bg-zinc-950">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
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

                <div className="flex items-center gap-2 text-white/90">
                  <Home className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium -tracking-[0.01em]">{currentPath}</span>
                </div>
              </div>

              {/* Right Section - Actions */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setCreatingFolder(!creatingFolder)}
                  disabled={loading}
                  className="h-9 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-white/90 text-sm"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Folder
                </Button>

                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={showHidden}
                    onChange={(e) => setShowHidden(e.target.checked)}
                    className="rounded"
                  />
                  Hidden
                </label>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                  <Input
                    placeholder="Search"
                    className="h-9 w-48 pl-9 bg-zinc-800/50 border-zinc-700 text-white/90 placeholder:text-white/40 text-sm"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={`h-9 w-9 rounded-lg ${
                    viewMode === 'grid'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-zinc-800/50 hover:bg-zinc-800 text-white/60'
                  }`}
                >
                  <Grid2x2 className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={`h-9 w-9 rounded-lg ${
                    viewMode === 'list'
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-zinc-800/50 hover:bg-zinc-800 text-white/60'
                  }`}
                >
                  <List className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-white/60"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                  className="h-9 w-9 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-white/60 hover:text-white/90"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* New Folder Input */}
            {creatingFolder && (
              <div className="px-6 py-3 border-b border-zinc-800 flex items-center gap-2">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') setCreatingFolder(false);
                  }}
                  className="bg-zinc-800/50 border-zinc-700 text-white"
                  autoFocus
                />
                <Button
                  onClick={handleCreateFolder}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Create
                </Button>
                <Button
                  onClick={() => setCreatingFolder(false)}
                  size="sm"
                  variant="ghost"
                  className="hover:bg-white/5"
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
                        onClick={() => {
                          if (item.type === 'directory') {
                            handleNavigate(item.path);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const action = confirm(`Delete "${item.name}"?`);
                          if (action) handleDelete(item);
                        }}
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
                        onClick={() => {
                          if (item.type === 'directory') {
                            handleNavigate(item.path);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const action = confirm(`Delete "${item.name}"?`);
                          if (action) handleDelete(item);
                        }}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
