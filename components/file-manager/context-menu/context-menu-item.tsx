'use client';

import type { ContextMenuAction } from './types';

interface ContextMenuItemProps {
  id: ContextMenuAction;
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onClick: (id: ContextMenuAction) => void;
}

export function ContextMenuItem({
  id,
  label,
  shortcut,
  icon: Icon,
  danger,
  onClick,
}: ContextMenuItemProps) {
  return (
    <button
      className={`w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 flex items-center gap-2 transition-colors ${
        danger ? 'text-red-300 hover:text-red-200' : 'text-white'
      }`}
      onClick={() => onClick(id)}
    >
      <Icon className={`h-4 w-4 ${danger ? '' : 'text-white/70'}`} />
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[11px] text-white/40 font-mono">{shortcut}</span>
      )}
    </button>
  );
}
