"use client";

import { text, progressBar } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { TextWithProgressData } from "../types";

interface TextWithProgressProps {
  data: TextWithProgressData;
}

export function TextWithProgressWidget({ data }: TextWithProgressProps) {
  const { title, value, subtext, progress, color = "#06b6d4" } = data;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className="flex flex-col h-full justify-between p-3">
      {/* Header */}
      <div>
        <h3 className={cn(text.label, "uppercase tracking-wider mb-1")}>
          {title}
        </h3>
        <div className="text-xl font-bold text-white/90 -tracking-[0.02em]">
          {value}
        </div>
        {subtext && <p className={cn(text.muted, "mt-0.5")}>{subtext}</p>}
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className={progressBar.track}>
          <div
            className={progressBar.fill}
            style={{
              width: `${clampedProgress}%`,
              backgroundColor: color,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className={text.muted}>{clampedProgress.toFixed(0)}% used</span>
        </div>
      </div>
    </div>
  );
}
