"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface WidgetIconProps {
  icon: LucideIcon;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: { box: "h-6 w-6", icon: 14 },
  md: { box: "h-8 w-8", icon: 18 },
  lg: { box: "h-10 w-10", icon: 22 },
};

export function WidgetIcon({
  icon: Icon,
  color,
  size = "md",
  className,
}: WidgetIconProps) {
  const { box, icon: iconSize } = sizeMap[size];

  return (
    <div
      className={cn(
        box,
        "rounded-lg bg-white/10 flex items-center justify-center",
        className
      )}
    >
      <Icon size={iconSize} style={color ? { color } : undefined} />
    </div>
  );
}
