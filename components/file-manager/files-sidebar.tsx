'use client';

import { type DefaultDirectory } from '@/app/actions/filesystem';
import { FolderIcon } from '@/components/icons/files';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Grid3x3, Home, Plus, Trash2 } from 'lucide-react';

interface FilesSidebarProps {
  homePath: string;
  shortcuts: DefaultDirectory[];
  onNavigate: (path: string) => void;
  getShortcutPath: (name: string) => string;
  onOpenNetwork: () => void;
}

export function FilesSidebar({
  homePath,
  shortcuts,
  onNavigate,
  getShortcutPath,
  onOpenNetwork,
}: FilesSidebarProps) {
  const homeLabel = homePath.split('/').filter(Boolean).pop() || 'Home';

  return (
    <div className="w-60 bg-black/30 backdrop-blur-xl border-r border-white/10 flex flex-col">
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
          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/10 text-white/90 hover:bg-white/15 transition-colors border border-white/10 shadow-sm"
            onClick={() => onNavigate(homePath)}
          >
            <Home className="h-4 w-4 text-white/80" />
            <span className="text-sm -tracking-[0.01em]">{homeLabel}</span>
          </button>

          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10">
            <Clock className="h-4 w-4 text-white/70" />
            <span className="text-sm -tracking-[0.01em]">Recents</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
            onClick={() => onNavigate(getShortcutPath('apps'))}
          >
            <Grid3x3 className="h-4 w-4 text-white/70" />
            <span className="text-sm -tracking-[0.01em]">Apps</span>
          </button>

          <div className="pt-4 pb-2">
            <div className="text-xs text-white/50 px-3 -tracking-[0.01em]">
              Favorites
            </div>
          </div>

          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.path}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
              onClick={() => onNavigate(shortcut.path)}
            >
              <div className="w-5 h-4 flex-shrink-0">
                <FolderIcon className="w-full h-full" />
              </div>
              <span className="text-sm -tracking-[0.01em]">
                {shortcut.name.charAt(0).toUpperCase() + shortcut.name.slice(1)}
              </span>
            </button>
          ))}

          <div className="pt-4 pb-2">
            <div className="text-xs text-white/50 px-3 -tracking-[0.01em]">
              Network
            </div>
          </div>

          <button
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10"
            onClick={onOpenNetwork}
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

      <div className="p-3 border-t border-white/10">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-colors border border-transparent hover:border-white/10">
          <Trash2 className="w-4 h-4 text-white/50" />
          <span className="text-sm -tracking-[0.01em]">Trash</span>
        </button>
      </div>
    </div>
  );
}
