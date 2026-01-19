"use client";

import { card } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";

interface WidgetContainerProps {
  children: React.ReactNode;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function WidgetContainer({
  children,
  selected = false,
  onClick,
  className,
}: WidgetContainerProps) {
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        card.base,
        card.padding.sm,
        "w-full aspect-[4/3] overflow-hidden flex flex-col",
        isClickable && "cursor-pointer transition-all",
        isClickable && card.hover,
        selected && card.selected,
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
