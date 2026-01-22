'use client';

import type { FileSystemItem } from '@/app/actions/filesystem';

interface ContextMenuHeaderProps {
  item: FileSystemItem;
}

export function ContextMenuHeader({ item }: ContextMenuHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-white/10">
      <div className="text-[10px] uppercase tracking-[0.14em] text-white/50 mb-1">
        Selected
      </div>
      <div className="font-semibold text-white truncate max-w-[200px]">
        {item.name}
      </div>
      <div className="text-[11px] text-white/40 truncate max-w-[200px]">
        {item.path}
      </div>
    </div>
  );
}
