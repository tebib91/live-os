"use client";

/* eslint-disable @next/next/no-img-element */

import { iconBox, text } from "@/components/ui/design-tokens";
import type { RunningApp } from "./types";

interface AppListItemProps {
  app: RunningApp;
  cpuLabel: string;
  memLabel: string;
  netLabel?: string;
}

export function AppListItem({ app, cpuLabel, memLabel, netLabel }: AppListItemProps) {
  return (
    <div className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`${iconBox.sm} overflow-hidden`}>
          <img
            src={app.icon || "/default-application-icon.png"}
            alt={app.name}
            className="w-6 h-6 object-contain"
            onError={(event) => {
              event.currentTarget.src = "/default-application-icon.png";
            }}
          />
        </div>
        <span className={text.valueSmall}>{app.name}</span>
      </div>
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span className="inline-flex min-w-[92px] justify-center items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/80">
          CPU {cpuLabel}
        </span>
        <span className="inline-flex min-w-[108px] justify-center items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/80">
          RAM {memLabel}
        </span>
        {netLabel && (
          <span className="inline-flex min-w-[160px] justify-center items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/15 text-white/80">
            NET {netLabel}
          </span>
        )}
      </div>
    </div>
  );
}
