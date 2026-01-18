/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { dialog, colors } from "@/components/ui/design-tokens";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useEffect, useRef, useState } from "react";

import { DialogHeader } from "./dialog-header";
import { MetricChartCard } from "./metric-chart-card";
import { NetworkChart } from "./network-chart";
import { AppBreakdownPanel } from "./app-breakdown-panel";
import { AppList } from "./app-list";
import { formatBytes, getMetricColor } from "./utils";
import type { ChartDataPoint, SelectedMetric } from "./types";

interface SystemMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemMonitorDialog({
  open,
  onOpenChange,
}: SystemMonitorDialogProps) {
  const { systemStats, storageStats, networkStats, runningApps, connected } =
    useSystemStatus({ fast: true });

  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>(null);
  const [cpuHistory, setCpuHistory] = useState<ChartDataPoint[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<ChartDataPoint[]>([]);
  const [storageHistory, setStorageHistory] = useState<ChartDataPoint[]>([]);
  const [gpuHistory, setGpuHistory] = useState<ChartDataPoint[]>([]);
  const [networkUploadHistory, setNetworkUploadHistory] = useState<ChartDataPoint[]>([]);
  const [networkDownloadHistory, setNetworkDownloadHistory] = useState<ChartDataPoint[]>([]);

  const lastUpdateRef = useRef<number>(0);

  // Update history when WebSocket data changes
  useEffect(() => {
    if (!open || !systemStats || !storageStats || !networkStats) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 500) return;
    lastUpdateRef.current = now;

    setCpuHistory((prev) => [...prev, { value: systemStats.cpu.usage }].slice(-30));
    setMemoryHistory((prev) => [...prev, { value: systemStats.memory.usage }].slice(-30));
    setStorageHistory((prev) => [...prev, { value: storageStats.usagePercent }].slice(-30));
    const gpuUsage = systemStats.hardware?.graphics?.utilizationGpu ?? 0;
    setGpuHistory((prev) => [...prev, { value: gpuUsage }].slice(-30));
    setNetworkUploadHistory((prev) => [...prev, { value: networkStats.uploadMbps }].slice(-60));
    setNetworkDownloadHistory((prev) => [...prev, { value: networkStats.downloadMbps }].slice(-60));
  }, [open, systemStats, storageStats, networkStats]);

  // Clear history when dialog closes
  useEffect(() => {
    if (!open) {
      setCpuHistory([]);
      setMemoryHistory([]);
      setStorageHistory([]);
      setGpuHistory([]);
      setNetworkUploadHistory([]);
      setNetworkDownloadHistory([]);
      setSelectedMetric(null);
    }
  }, [open]);

  // Default values
  const currentSystemStats = systemStats || {
    cpu: { usage: 0, temperature: 0, power: 0 },
    memory: { usage: 0, total: 0, used: 0, free: 0 },
  };

  // GPU info from hardware
  const gpuUsage = systemStats?.hardware?.graphics?.utilizationGpu ?? 0;
  const gpuName = systemStats?.hardware?.graphics?.model || "GPU";

  const currentStorageStats = storageStats || {
    total: 0,
    used: 0,
    usagePercent: 0,
    health: "Healthy",
  };

  const currentNetworkStats = networkStats || {
    uploadMbps: 0,
    downloadMbps: 0,
  };

  const handleCardClick = (metric: SelectedMetric) => {
    setSelectedMetric(selectedMetric === metric ? null : metric);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={`max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] ${dialog.content} p-0 gap-0 overflow-hidden`}
      >
        <DialogHeader connected={connected} onClose={() => onOpenChange(false)} />

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4 bg-white/5 backdrop-blur-xl">
            {/* Top 4 Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <MetricChartCard
                label="CPU"
                value={`${currentSystemStats.cpu.usage}%`}
                subtitle="Click to view by app"
                color={getMetricColor(currentSystemStats.cpu.usage)}
                gradientId="cpuGradient"
                data={cpuHistory}
                selected={selectedMetric === "cpu"}
                clickable
                onClick={() => handleCardClick("cpu")}
              />

              <MetricChartCard
                label="Memory"
                value={formatBytes(currentSystemStats.memory.used).split(" ")[0]}
                unit="GB"
                subtitle={`${formatBytes(currentSystemStats.memory.total)} total • Click to view by app`}
                color={colors.memory}
                gradientId="memoryGradient"
                data={memoryHistory}
                selected={selectedMetric === "memory"}
                clickable
                onClick={() => handleCardClick("memory")}
              />

              <MetricChartCard
                label="GPU"
                value={`${Math.round(gpuUsage)}%`}
                subtitle={gpuName}
                color={colors.gpu}
                gradientId="gpuGradient"
                data={gpuHistory}
              />

              <MetricChartCard
                label="Storage"
                value={currentStorageStats.used.toFixed(1)}
                unit="GB"
                subtitle={`${(currentStorageStats.total - currentStorageStats.used).toFixed(0)} GB left`}
                color={colors.storage}
                gradientId="storageGradient"
                data={storageHistory}
              />
            </div>

            {/* App Breakdown Panel */}
            <AppBreakdownPanel
              selectedMetric={selectedMetric}
              apps={runningApps}
              connected={connected}
              onClose={() => setSelectedMetric(null)}
            />

            {/* Network Chart */}
            <NetworkChart
              uploadHistory={networkUploadHistory}
              downloadHistory={networkDownloadHistory}
              currentUpload={currentNetworkStats.uploadMbps}
              currentDownload={currentNetworkStats.downloadMbps}
            />

            {/* Applications List */}
            <AppList apps={runningApps} connected={connected} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
