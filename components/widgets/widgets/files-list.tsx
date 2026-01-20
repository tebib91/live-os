"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import { File, Folder } from "lucide-react";
import type { FilesListData } from "../types";

interface FilesListProps {
  data: FilesListData;
}

export function FilesListWidget({ data }: FilesListProps) {
  const { files, title = "Recent Files" } = data;
  const displayFiles = files.slice(0, 5);

  return (
    <div className="flex flex-col h-full p-3">
      <h3 className={cn(text.label, "uppercase tracking-wider mb-2")}>
        {title}
      </h3>

      <div className="flex-1 space-y-1 overflow-hidden relative">
        {displayFiles.length === 0 ? (
          <p className={text.muted}>No recent files</p>
        ) : (
          displayFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-lg",
                "hover:bg-white/5 transition-colors cursor-pointer"
              )}
            >
              {file.type === "folder" ? (
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <File className="w-4 h-4 text-white/60 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn(text.valueSmall, "truncate")}>{file.name}</p>
              </div>
              {file.modifiedAt && (
                <span className={cn(text.muted, "shrink-0")}>
                  {file.modifiedAt}
                </span>
              )}
            </div>
          ))
        )}

        {/* Gradient fade */}
        {files.length > 5 && (
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
