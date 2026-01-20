"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import Image from "next/image";
import type { ListWidgetData } from "../types";

interface ListWidgetProps {
  data: ListWidgetData;
}

export function ListWidget({ data }: ListWidgetProps) {
  const { items, maxItems = 5 } = data;
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="flex flex-col h-full p-3">
      <div className="flex-1 space-y-1 overflow-hidden relative">
        {displayItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between py-1.5 px-2 rounded-lg",
              "hover:bg-white/5 transition-colors"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {item.icon && (
                <Image
                  src={item.icon}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded object-cover"
                />
              )}
              <div className="min-w-0">
                <p className={cn(text.valueSmall, "truncate")}>{item.title}</p>
                {item.subtitle && (
                  <p className={cn(text.muted, "truncate")}>{item.subtitle}</p>
                )}
              </div>
            </div>
            {item.rightText && (
              <span className={cn(text.muted, "ml-2 shrink-0")}>
                {item.rightText}
              </span>
            )}
          </div>
        ))}

        {/* Gradient fade at bottom */}
        {items.length > maxItems && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  );
}
