"use client";

import { text, button } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import type { TextWithButtonsData } from "../types";

interface TextWithButtonsProps {
  data: TextWithButtonsData;
}

export function TextWithButtonsWidget({ data }: TextWithButtonsProps) {
  const { title, subtitle, buttons } = data;

  return (
    <div className="flex flex-col h-full justify-between p-3">
      {/* Header */}
      <div>
        <h3 className={cn(text.heading, "mb-1")}>{title}</h3>
        {subtitle && <p className={text.muted}>{subtitle}</p>}
      </div>

      {/* Buttons */}
      <div className="flex gap-2 mt-4">
        {buttons.slice(0, 3).map((btn) => (
          <button
            key={btn.id}
            onClick={btn.action}
            className={cn(
              button.ghost,
              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
