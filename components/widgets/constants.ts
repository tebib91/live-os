/**
 * Widget System Constants
 */

import type { AvailableWidget, WidgetSectionData } from "./types";
import { colors } from "@/components/ui/design-tokens";

// Maximum number of widgets that can be selected
export const MAX_WIDGETS = 3;

// Refresh intervals (in ms)
export const REFRESH_INTERVALS = {
  fast: 5000, // CPU, Memory - real-time metrics
  medium: 15000, // Network, processes
  slow: 30000, // Storage, files
} as const;

// Default selected widget IDs
export const DEFAULT_WIDGET_IDS = [
  "liveos:system-stats",
  "liveos:storage",
  "liveos:memory",
];

// LiveOS app icon (fallback to default app icon)
export const LIVEOS_ICON = "/default-application-icon.png";

// All available widgets
export const AVAILABLE_WIDGETS: AvailableWidget[] = [
  // LiveOS System Widgets
  {
    id: "liveos:storage",
    type: "text-with-progress",
    appId: "liveos",
    appName: "LiveOS",
    appIcon: LIVEOS_ICON,
    name: "Storage",
    description: "Disk usage with progress bar",
  },
  {
    id: "liveos:memory",
    type: "text-with-progress",
    appId: "liveos",
    appName: "LiveOS",
    appIcon: LIVEOS_ICON,
    name: "Memory",
    description: "RAM usage with progress bar",
  },
  {
    id: "liveos:system-stats",
    type: "three-stats",
    appId: "liveos",
    appName: "LiveOS",
    appIcon: LIVEOS_ICON,
    name: "System Overview",
    description: "CPU, Memory, and Storage at a glance",
  },
  {
    id: "liveos:cpu-memory",
    type: "two-stats-gauge",
    appId: "liveos",
    appName: "LiveOS",
    appIcon: LIVEOS_ICON,
    name: "CPU & Memory",
    description: "Circular gauges for CPU and Memory",
  },
  {
    id: "liveos:four-stats",
    type: "four-stats",
    appId: "liveos",
    appName: "LiveOS",
    appIcon: LIVEOS_ICON,
    name: "System Grid",
    description: "CPU, Memory, Storage, and Network",
  },
  // Files Widgets
  {
    id: "liveos:files-recents",
    type: "files-list",
    appId: "liveos",
    appName: "Files",
    appIcon: "https://img.icons8.com/?size=100&id=12775&format=png&color=000000",
    name: "Recent Files",
    description: "Recently accessed files",
  },
  {
    id: "liveos:files-favorites",
    type: "files-grid",
    appId: "liveos",
    appName: "Files",
    appIcon: "https://img.icons8.com/?size=100&id=12775&format=png&color=000000",
    name: "Favorites",
    description: "Favorite folders grid",
  },
];

// Group widgets by app
export function getWidgetSections(): WidgetSectionData[] {
  const sectionMap = new Map<string, WidgetSectionData>();

  for (const widget of AVAILABLE_WIDGETS) {
    const existing = sectionMap.get(widget.appId);
    if (existing) {
      existing.widgets.push(widget);
    } else {
      sectionMap.set(widget.appId, {
        appId: widget.appId,
        appName: widget.appName,
        appIcon: widget.appIcon,
        widgets: [widget],
      });
    }
  }

  return Array.from(sectionMap.values());
}

// Widget colors
export const WIDGET_COLORS = {
  cpu: colors.cpu,
  memory: colors.memory,
  storage: colors.storage,
  network: colors.network.download,
} as const;
