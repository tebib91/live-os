"use client";

import { memo, useEffect, useReducer } from "react";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DateDisplayComponent() {
  // useReducer to force re-render every minute without lint warnings
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const now = typeof window === "undefined" ? null : new Date();

  useEffect(() => {
    // Hydration-safe: wait for mount before ticking the clock
    forceUpdate();
    const interval = setInterval(forceUpdate, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    return (
      <div className="flex items-center gap-2 text-white/80">
        <span className="text-xs font-medium" suppressHydrationWarning>
          --
        </span>
        <span className="text-xs font-medium" suppressHydrationWarning>
          --
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-white/80">
      <span className="text-xs font-medium" suppressHydrationWarning>
        {formatDate(now)}
      </span>
      <span className="text-xs font-medium" suppressHydrationWarning>
        {formatTime(now)}
      </span>
    </div>
  );
}

export const DateDisplay = memo(DateDisplayComponent);
