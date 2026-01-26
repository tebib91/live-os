"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WidgetCheckerProps {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}

export function WidgetChecker({
  checked,
  disabled = false,
  onChange,
}: WidgetCheckerProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled || checked) onChange();
      }}
      className={cn(
        "absolute top-2 right-2 z-10",
        "w-6 h-6 rounded-full border-2 flex items-center justify-center",
        "transition-all duration-200",
        checked
          ? "bg-cyan-500 border-cyan-500"
          : "bg-white/10 border-white/30 hover:border-white/50",
        disabled && !checked && "opacity-50 cursor-not-allowed"
      )}
    >
      {checked && <Check className="w-4 h-4 text-white" />}
    </button>
  );
}
