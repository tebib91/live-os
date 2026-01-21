"use client";

import { FolderIcon } from "@/components/icons/files";
import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { FilesGridData } from "../types";

interface FilesGridProps {
  data: FilesGridData;
}

export function FilesGridWidget({ data }: FilesGridProps) {
  const { folders, title = "Favorites" } = data;
  const displayFolders = folders.slice(0, 4);

  return (
    <div className="flex flex-col h-full p-3">
      <h3 className={cn(text.label, "uppercase tracking-wider mb-2")}>
        {title}
      </h3>

      {displayFolders.length === 0 ? (
        <p className={text.muted}>No favorites</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 flex-1">
          {displayFolders.map((folder) => (
            <div
              key={folder.id}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2 rounded-lg",
                "bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              )}
            >
              <div className="w-10 h-8">
                <FolderIcon className="w-full h-full drop-shadow" />
              </div>
              <span className={cn(text.muted, "truncate max-w-full text-center text-[11px]")}>
                {folder.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
