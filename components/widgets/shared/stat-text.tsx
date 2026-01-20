"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";

interface StatTextProps {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatText({
  label,
  value,
  subtext,
  color,
  size = "md",
  className,
}: StatTextProps) {
  const valueStyles = {
    sm: "text-base font-semibold",
    md: "text-xl font-bold",
    lg: "text-2xl font-bold",
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <span className={text.label}>{label}</span>
      <span
        className={cn(valueStyles[size], "text-white/90 -tracking-[0.02em]")}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      {subtext && <span className={text.muted}>{subtext}</span>}
    </div>
  );
}
