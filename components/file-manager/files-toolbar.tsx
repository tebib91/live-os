'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  FilePlus,
  Grid2x2,
  List,
  Search,
  X,
  Home,
} from 'lucide-react';
import { type MouseEvent, type ReactNode } from 'react';

interface Breadcrumb {
  label: string;
  path: string;
}

interface FilesToolbarProps {
  breadcrumbs: Breadcrumb[];
  historyIndex: number;
  historyLength: number;
  loading: boolean;
  openingNative: boolean;
  showHidden: boolean;
  viewMode: 'grid' | 'list';
  canGoToParent: boolean;
  onNavigate: (path: string) => void;
  onBreadcrumbContextMenu: (event: MouseEvent, path: string, label: string) => void;
  onBack: () => void;
  onForward: () => void;
  onGoToParent: () => void;
  onOpenNative: () => void;
  onToggleHidden: (value: boolean) => void;
  onSetViewMode: (mode: 'grid' | 'list') => void;
  onToggleCreateFolder: () => void;
  onToggleCreateFile: () => void;
  onQuickCreateFile: () => void;
  onClose: () => void;
}

export function FilesToolbar({
  breadcrumbs,
  historyIndex,
  historyLength,
  loading,
  openingNative,
  showHidden,
  viewMode,
  canGoToParent,
  onNavigate,
  onBreadcrumbContextMenu,
  onBack,
  onForward,
  onGoToParent,
  onOpenNative,
  onToggleHidden,
  onSetViewMode,
  onToggleCreateFolder,
  onToggleCreateFile,
  onQuickCreateFile,
  onClose,
}: FilesToolbarProps) {
  const renderCrumb = (crumb: Breadcrumb, index: number): ReactNode => (
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
        onClick={() => onNavigate(crumb.path)}
        onContextMenu={(event) => onBreadcrumbContextMenu(event, crumb.path, crumb.label)}
      >
        {crumb.label}
      </button>
    </div>
  );

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/30 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            disabled={historyIndex === 0 || loading}
            className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onForward}
            disabled={historyIndex >= historyLength - 1 || loading}
            className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 text-white">
          {breadcrumbs.map(renderCrumb)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onGoToParent}
            disabled={!canGoToParent || loading}
            className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenNative}
            disabled={loading || openingNative}
            className="h-8 w-8 rounded-lg hover:bg-white/5 text-white/60 hover:text-white/90 disabled:opacity-30"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={onToggleCreateFolder}
          disabled={loading}
          className="h-9 px-4 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-white text-sm shadow-sm"
        >
          <FilePlus className="h-4 w-4 mr-2" />
          Folder
        </Button>
        <Button
          variant="ghost"
          onClick={onToggleCreateFile}
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
              onChange={(event) => onToggleHidden(event.target.checked)}
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
          onClick={() => onSetViewMode('grid')}
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
          onClick={() => onSetViewMode('list')}
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
          onClick={onQuickCreateFile}
        >
          <FilePlus className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
