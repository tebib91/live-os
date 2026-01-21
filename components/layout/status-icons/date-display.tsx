"use client";

import { memo, useEffect, useState } from "react";

function DateDisplayComponent() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize on mount to avoid hydration mismatch
    requestAnimationFrame(() => setNow(new Date()));
    const interval = setInterval(() => setNow(new Date()), 60_000);
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
        {now.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </span>
      <span className="text-xs font-medium" suppressHydrationWarning>
        {now.toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
  );
}

export const DateDisplay = memo(DateDisplayComponent);
