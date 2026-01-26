"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { ListEmojiData } from "../types";

interface ListEmojiProps {
  data: ListEmojiData;
}

export function ListEmojiWidget({ data }: ListEmojiProps) {
  const { items, maxItems = 5 } = data;
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex-1 space-y-1 overflow-hidden">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 py-1.5 px-2 rounded-lg",
              "hover:bg-white/5 transition-colors"
            )}
          >
            <span className="text-xl shrink-0">{item.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className={cn(text.valueSmall, "truncate")}>{item.title}</p>
              {item.subtitle && (
                <p className={cn(text.muted, "truncate")}>{item.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
