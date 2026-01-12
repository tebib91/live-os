'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  X,
  Home,
  Clock,
  Grid3x3,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Upload,
  Search,
  Grid2x2,
  List,
  ArrowUpDown,
  HardDrive,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

interface FilesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  icon?: string;
}

export function FilesDialog({ open, onOpenChange }: FilesDialogProps) {
  const [currentPath, setCurrentPath] = useState('Home');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock data - replace with real file system data later
  const folders: FileItem[] = [
    { id: '1', name: 'Documents', type: 'folder' },
    { id: '2', name: 'Downloads', type: 'folder' },
    { id: '3', name: 'Photos', type: 'folder' },
    { id: '4', name: 'Videos', type: 'folder' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1400px] max-h-[90vh] bg-black border-zinc-800 shadow-2xl p-0 gap-0 overflow-hidden"
      >
        <div className="flex h-[90vh]">
          {/* Left Sidebar */}
          <div className="w-52 bg-zinc-900/50 border-r border-zinc-800 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-6">
              <h1 className="text-5xl font-bold text-white/90 -tracking-[0.02em]">Files</h1>
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
                    className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90"
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
                  className="h-9 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-white/90 text-sm"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Folder
                </Button>

                <Button
                  variant="ghost"
                  className="h-9 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 text-white/90 text-sm"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>

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

            {/* Content Area */}
            <ScrollArea className="flex-1">
              <div className="p-6">
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        className="flex flex-col items-center gap-3 group"
                      >
                        {/* 3D Folder Icon */}
                        <div className="relative w-20 h-16 transition-transform group-hover:scale-105">
                          {/* Folder Tab */}
                          <div className="absolute top-0 left-0 w-10 h-4 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-t-md shadow-sm"></div>

                          {/* Folder Body */}
                          <div className="absolute top-3 left-0 w-full h-12 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-lg shadow-xl">
                            {/* Inner shadow for depth */}
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-black/0 via-black/0 to-black/20"></div>
                            {/* Highlight */}
                            <div className="absolute top-1 left-1 right-1 h-5 bg-gradient-to-b from-white/25 to-transparent rounded-t-lg"></div>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                            {folder.name}
                          </div>
                          <div className="text-xs text-white/40 -tracking-[0.01em]">Folder</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        {/* Compact Folder Icon */}
                        <div className="relative w-8 h-7 flex-shrink-0">
                          {/* Tab */}
                          <div className="absolute top-0 left-0 w-3.5 h-2 bg-gradient-to-br from-orange-400 to-orange-500 rounded-t"></div>
                          {/* Body */}
                          <div className="absolute top-1.5 left-0 w-full h-5 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded shadow">
                            <div className="absolute inset-0 rounded bg-gradient-to-b from-white/20 to-transparent"></div>
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                            {folder.name}
                          </div>
                          <div className="text-xs text-white/40 -tracking-[0.01em]">Folder</div>
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
                {folders.length} items
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
