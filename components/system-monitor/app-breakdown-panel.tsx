"use client";

import { card, text } from "@/components/ui/design-tokens";
import type { RunningApp, SelectedMetric } from "./types";
import { formatMemorySize } from "./utils";
import { AppListItem } from "./app-list-item";

interface AppBreakdownPanelProps {
  selectedMetric: SelectedMetric;
  apps: RunningApp[];
  connected: boolean;
  onClose: () => void;
}

export function AppBreakdownPanel({
  selectedMetric,
  apps,
  connected,
  onClose,
}: AppBreakdownPanelProps) {
  if (!selectedMetric) return null;

  const sortedApps = [...apps].sort((a, b) => {
    if (selectedMetric === "memory") {
      return b.memoryUsage - a.memoryUsage;
    }
    return b.cpuUsage - a.cpuUsage;
  });

  const title =
    selectedMetric === "cpu"
      ? "CPU Usage by Application"
      : "Memory Usage by Application";
  const subtitle =
    selectedMetric === "cpu" ? "Sorted by CPU usage" : "Sorted by memory usage";

  return (
    <div className={`${card.base} ${card.padding.md}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className={text.valueSmall}>{title}</h3>
          <p className={text.label}>{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          Close
        </button>
      </div>

      <div className="space-y-1">
        {!connected && (
          <div className={`${text.label} py-2`}>Connecting to server...</div>
        )}
        {connected && sortedApps.length === 0 && (
          <div className={`${text.label} py-2`}>No running apps detected.</div>
        )}
        {sortedApps.map((app) => (
          <AppListItem
            key={app.id}
            app={app}
            cpuLabel={`${app.cpuUsage.toFixed(1)}%`}
            memLabel={formatMemorySize(app.memoryUsage)}
          />
        ))}
      </div>
    </div>
  );
}
