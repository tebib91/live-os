"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { colors } from "@/components/ui/design-tokens";

interface ProgressArcProps {
  value: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  displayValue?: string;
  className?: string;
}

export function ProgressArc({
  value,
  size = 80,
  strokeWidth = 6,
  color = colors.cpu,
  label,
  displayValue,
  className,
}: ProgressArcProps) {
  const { circumference, dashOffset, radius, center } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * r;
    const clampedValue = Math.min(100, Math.max(0, value));
    const offset = c - (clampedValue / 100) * c;

    return {
      radius: r,
      circumference: c,
      dashOffset: offset,
      center: size / 2,
    };
  }, [size, strokeWidth, value]);

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-300"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {displayValue && (
          <span className="text-lg font-bold text-white/90">{displayValue}</span>
        )}
        {label && (
          <span className="text-[10px] text-white/40 uppercase tracking-wide">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
