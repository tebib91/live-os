"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSystemStatus } from "./useSystemStatus";
import type {
  AvailableWidget,
  WidgetData,
  WidgetType,
  TextWithProgressData,
  ThreeStatsData,
  FourStatsData,
  TwoStatsGaugeData,
  FilesListData,
  FilesGridData,
} from "@/components/widgets/types";
import {
  AVAILABLE_WIDGETS,
  DEFAULT_WIDGET_IDS,
  MAX_WIDGETS,
  WIDGET_COLORS,
} from "@/components/widgets/constants";

const STORAGE_KEY = "liveos-selected-widgets";

interface UseWidgetsReturn {
  // Available widgets
  availableWidgets: AvailableWidget[];

  // Selected widget IDs
  selectedIds: string[];

  // Widget data by ID
  widgetData: Map<string, { type: WidgetType; data: WidgetData }>;

  // Selection management
  toggleWidget: (id: string) => void;
  isSelected: (id: string) => boolean;
  canSelectMore: boolean;

  // Shake animation state (when trying to select > MAX)
  shakeTrigger: number;

  // Loading state
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Load initial selection from localStorage
function getInitialSelectedIds(): string[] {
  if (typeof window === "undefined") return DEFAULT_WIDGET_IDS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, MAX_WIDGETS);
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_WIDGET_IDS;
}

export function useWidgets(): UseWidgetsReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>(getInitialSelectedIds);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isLoading] = useState(false);
  const initializedRef = useRef(false);

  const { systemStats, storageStats } = useSystemStatus();

  // Save to localStorage when selection changes (skip initial render)
  useEffect(() => {
    if (initializedRef.current) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
    } else {
      initializedRef.current = true;
    }
  }, [selectedIds]);

  // Toggle widget selection
  const toggleWidget = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const isCurrentlySelected = prev.includes(id);

        if (isCurrentlySelected) {
          // Remove from selection
          return prev.filter((wid) => wid !== id);
        }

        // Check if at max capacity
        if (prev.length >= MAX_WIDGETS) {
          // Trigger shake animation
          setShakeTrigger((t) => t + 1);
          return prev;
        }

        // Add to selection
        return [...prev, id];
      });
    },
    []
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  const canSelectMore = selectedIds.length < MAX_WIDGETS;

  // Generate widget data from system stats
  const widgetData = useMemo(() => {
    const dataMap = new Map<string, { type: WidgetType; data: WidgetData }>();

    // Storage widget
    if (storageStats) {
      const storageData: TextWithProgressData = {
        title: "Storage",
        value: `${formatBytes(storageStats.used)} / ${formatBytes(storageStats.total)}`,
        subtext: `${formatBytes(storageStats.total - storageStats.used)} available`,
        progress: storageStats.usagePercent,
        color: WIDGET_COLORS.storage,
      };
      dataMap.set("liveos:storage", { type: "text-with-progress", data: storageData });
    }

    // Memory widget
    if (systemStats?.memory) {
      const memoryData: TextWithProgressData = {
        title: "Memory",
        value: `${formatBytes(systemStats.memory.used)} / ${formatBytes(systemStats.memory.total)}`,
        subtext: `${formatBytes(systemStats.memory.free)} free`,
        progress: systemStats.memory.usage,
        color: WIDGET_COLORS.memory,
      };
      dataMap.set("liveos:memory", { type: "text-with-progress", data: memoryData });
    }

    // System stats (three stats)
    if (systemStats && storageStats) {
      const threeStatsData: ThreeStatsData = {
        stats: [
          {
            label: "CPU",
            value: `${systemStats.cpu.usage.toFixed(0)}%`,
            color: WIDGET_COLORS.cpu,
          },
          {
            label: "Memory",
            value: `${systemStats.memory.usage.toFixed(0)}%`,
            color: WIDGET_COLORS.memory,
          },
          {
            label: "Storage",
            value: `${storageStats.usagePercent.toFixed(0)}%`,
            color: WIDGET_COLORS.storage,
          },
        ],
      };
      dataMap.set("liveos:system-stats", { type: "three-stats", data: threeStatsData });
    }

    // CPU & Memory gauges
    if (systemStats) {
      const gaugeData: TwoStatsGaugeData = {
        stats: [
          {
            label: "CPU",
            value: systemStats.cpu.usage,
            displayValue: `${systemStats.cpu.usage.toFixed(0)}%`,
            color: WIDGET_COLORS.cpu,
          },
          {
            label: "Memory",
            value: systemStats.memory.usage,
            displayValue: `${systemStats.memory.usage.toFixed(0)}%`,
            color: WIDGET_COLORS.memory,
          },
        ],
      };
      dataMap.set("liveos:cpu-memory", { type: "two-stats-gauge", data: gaugeData });
    }

    // Four stats grid
    if (systemStats && storageStats) {
      const fourStatsData: FourStatsData = {
        stats: [
          {
            label: "CPU",
            value: `${systemStats.cpu.usage.toFixed(0)}%`,
            subtext: `${systemStats.cpu.temperature.toFixed(0)}°C`,
            color: WIDGET_COLORS.cpu,
          },
          {
            label: "Memory",
            value: `${systemStats.memory.usage.toFixed(0)}%`,
            subtext: formatBytes(systemStats.memory.used),
            color: WIDGET_COLORS.memory,
          },
          {
            label: "Storage",
            value: `${storageStats.usagePercent.toFixed(0)}%`,
            subtext: formatBytes(storageStats.used),
            color: WIDGET_COLORS.storage,
          },
          {
            label: "Health",
            value: storageStats.health,
            color: "#10b981",
          },
        ],
      };
      dataMap.set("liveos:four-stats", { type: "four-stats", data: fourStatsData });
    }

    // Files widgets (placeholder data)
    const filesListData: FilesListData = {
      files: [],
      title: "Recent Files",
    };
    dataMap.set("liveos:files-recents", { type: "files-list", data: filesListData });

    const filesGridData: FilesGridData = {
      folders: [],
      title: "Favorites",
    };
    dataMap.set("liveos:files-favorites", { type: "files-grid", data: filesGridData });

    return dataMap;
  }, [systemStats, storageStats]);

  return {
    availableWidgets: AVAILABLE_WIDGETS,
    selectedIds,
    widgetData,
    toggleWidget,
    isSelected,
    canSelectMore,
    shakeTrigger,
    isLoading,
  };
}
