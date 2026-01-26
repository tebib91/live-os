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
        "w-full h-[160px] overflow-hidden",
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
