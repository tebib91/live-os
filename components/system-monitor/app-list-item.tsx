"use client";

/* eslint-disable @next/next/no-img-element */

import { iconBox, text } from "@/components/ui/design-tokens";
import type { RunningApp } from "./types";

interface AppListItemProps {
  app: RunningApp;
  metricValue: string;
}

export function AppListItem({ app, metricValue }: AppListItemProps) {
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
      <span className={text.valueSmall}>{metricValue}</span>
    </div>
  );
}
