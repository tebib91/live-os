"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSettings, updateSettings } from "@/app/actions/settings";
import { useSystemStatus } from "./useSystemStatus";
import { useUserLocation } from "./useUserLocation";
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
  WeatherWidgetData,
  ThermalsWidgetData,
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
async function getInitialSelectedIds(): Promise<string[]> {
  // Server-side fallback
  if (typeof window === "undefined") return DEFAULT_WIDGET_IDS;

  // Prefer DB-backed settings
  try {
    const settings = await getSettings();
    if (settings.selectedWidgets && settings.selectedWidgets.length > 0) {
      return settings.selectedWidgets.slice(0, MAX_WIDGETS);
    }
  } catch (err) {
    console.warn("[Widgets] Failed to load settings, falling back to localStorage", err);
  }

  // Fallback to localStorage
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
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_WIDGET_IDS);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  const { systemStats, storageStats } = useSystemStatus();
  const { location: userLocation } = useUserLocation();

  // Load initial selection from DB/localStorage
  useEffect(() => {
    void (async () => {
      const initial = await getInitialSelectedIds();
      setSelectedIds(initial);
      initializedRef.current = true;
      setIsLoading(false);
    })();
  }, []);

  // Save to localStorage when selection changes (skip initial render)
  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedIds));
  }, [selectedIds]);

  // Persist to settings table (best-effort)
  useEffect(() => {
    if (!initializedRef.current) return;
    void updateSettings({ selectedWidgets: selectedIds }).catch((err) =>
      console.error("[Widgets] Failed to persist selection:", err)
    );
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
  // All widgets are always created - each widget handles its own empty/loading state
  const widgetData = useMemo(() => {
    const dataMap = new Map<string, { type: WidgetType; data: WidgetData }>();

    // Safely extract values with defaults
    const cpu = systemStats?.cpu ?? { usage: 0, temperature: 0 };
    const memory = systemStats?.memory ?? { usage: 0, total: 0, used: 0, free: 0 };
    const storage = storageStats ?? { total: 0, used: 0, usagePercent: 0, health: "—" };
    const thermals = systemStats?.hardware?.thermals;

    // Storage widget
    const storageData: TextWithProgressData = {
      title: "Storage",
      value: storage.total > 0
        ? `${formatBytes(storage.used)} / ${formatBytes(storage.total)}`
        : "Loading...",
      subtext: storage.total > 0
        ? `${formatBytes(storage.total - storage.used)} available`
        : undefined,
      progress: storage.usagePercent,
      color: WIDGET_COLORS.storage,
    };
    dataMap.set("liveos:storage", { type: "text-with-progress", data: storageData });

    // Memory widget
    const memoryData: TextWithProgressData = {
      title: "Memory",
      value: memory.total > 0
        ? `${formatBytes(memory.used)} / ${formatBytes(memory.total)}`
        : "Loading...",
      subtext: memory.total > 0
        ? `${formatBytes(memory.free)} free`
        : undefined,
      progress: memory.usage,
      color: WIDGET_COLORS.memory,
    };
    dataMap.set("liveos:memory", { type: "text-with-progress", data: memoryData });

    // System stats (three stats)
    const threeStatsData: ThreeStatsData = {
      stats: [
        {
          label: "CPU",
          value: `${cpu.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: `${memory.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.memory,
        },
        {
          label: "Storage",
          value: `${storage.usagePercent.toFixed(0)}%`,
          color: WIDGET_COLORS.storage,
        },
      ],
    };
    dataMap.set("liveos:system-stats", { type: "three-stats", data: threeStatsData });

    // CPU & Memory gauges
    const gaugeData: TwoStatsGaugeData = {
      stats: [
        {
          label: "CPU",
          value: cpu.usage,
          displayValue: `${cpu.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: memory.usage,
          displayValue: `${memory.usage.toFixed(0)}%`,
          color: WIDGET_COLORS.memory,
        },
      ],
    };
    dataMap.set("liveos:cpu-memory", { type: "two-stats-gauge", data: gaugeData });

    // Four stats grid
    const fourStatsData: FourStatsData = {
      stats: [
        {
          label: "CPU",
          value: `${cpu.usage.toFixed(0)}%`,
          subtext: `${cpu.temperature.toFixed(0)}°C`,
          color: WIDGET_COLORS.cpu,
        },
        {
          label: "Memory",
          value: `${memory.usage.toFixed(0)}%`,
          subtext: memory.total > 0 ? formatBytes(memory.used) : "—",
          color: WIDGET_COLORS.memory,
        },
        {
          label: "Storage",
          value: `${storage.usagePercent.toFixed(0)}%`,
          subtext: storage.total > 0 ? formatBytes(storage.used) : "—",
          color: WIDGET_COLORS.storage,
        },
        {
          label: "Health",
          value: storage.health,
          color: "#10b981",
        },
      ],
    };
    dataMap.set("liveos:four-stats", { type: "four-stats", data: fourStatsData });

    // Thermals widget
    const thermalsData: ThermalsWidgetData = {
      cpuTemperature: systemStats?.hardware?.cpuTemperature ?? null,
      main: thermals?.main ?? null,
      max: thermals?.max ?? null,
      cores: thermals?.cores ?? [],
      socket: thermals?.socket ?? [],
    };
    dataMap.set("liveos:thermals", { type: "thermals", data: thermalsData });

    // Weather widget (uses user's location)
    const weatherData: WeatherWidgetData = {
      location: userLocation?.city
        ? `${userLocation.city}${userLocation.country ? `, ${userLocation.country}` : ""}`
        : "Loading location...",
      latitude: String(userLocation?.latitude ?? 37.7749),
      longitude: String(userLocation?.longitude ?? -122.4194),
    };
    dataMap.set("liveos:weather", { type: "weather", data: weatherData });

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
  }, [systemStats, storageStats, userLocation]);

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
