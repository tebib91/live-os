"use client";

import { card, text } from "@/components/ui/design-tokens";
import { formatBytes } from "@/lib/utils";
import { AppListItem } from "./app-list-item";
import type { RunningApp } from "./types";

interface AppListProps {
  apps: RunningApp[];
  connected: boolean;
}

export function AppList({ apps, connected }: AppListProps) {
  return (
    <div className={`${card.base} ${card.padding.md}`}>
      <div className="mb-3">
        <h3 className={text.valueSmall}>Applications</h3>
        <p className={text.label}>Resource usage by app</p>
      </div>

      <div className="space-y-1">
        {!connected && (
          <div className={`${text.label} py-2`}>Connecting to server...</div>
        )}
        {connected && apps.length === 0 && (
          <div className={`${text.label} py-2`}>No running apps detected.</div>
        )}
        {apps.map((app) => (
          <AppListItem
            key={app.id}
            app={app}
            cpuLabel={`${app.cpuUsage.toFixed(1)}%`}
            memLabel={`${formatBytes(app.memoryUsage)}`}
            netLabel={
              app.netRx !== undefined && app.netTx !== undefined
                ? `${formatBytes(app.netRx)} / ${formatBytes(app.netTx)}`
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
