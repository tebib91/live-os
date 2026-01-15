/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface SystemMonitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChartDataPoint {
  value: number;
}

const cardClassName =
  "bg-black/30 backdrop-blur-xl rounded-2xl p-5 border border-white/15 shadow-lg shadow-black/25";

export function SystemMonitorDialog({
  open,
  onOpenChange,
}: SystemMonitorDialogProps) {
  // Get real-time data from WebSocket
  const { systemStats, storageStats, networkStats, runningApps, connected } =
    useSystemStatus();

  // History arrays for charts
  const [cpuHistory, setCpuHistory] = useState<ChartDataPoint[]>([]);
  const [memoryHistory, setMemoryHistory] = useState<ChartDataPoint[]>([]);
  const [storageHistory, setStorageHistory] = useState<ChartDataPoint[]>([]);
  const [gpuHistory, setGpuHistory] = useState<ChartDataPoint[]>([]);
  const [networkUploadHistory, setNetworkUploadHistory] = useState<
    ChartDataPoint[]
  >([]);
  const [networkDownloadHistory, setNetworkDownloadHistory] = useState<
    ChartDataPoint[]
  >([]);

  // Track last update to prevent duplicate history entries
  const lastUpdateRef = useRef<number>(0);

  // Update history when WebSocket data changes
  useEffect(() => {
    if (!open || !systemStats || !storageStats || !networkStats) return;

    const now = Date.now();
    // Debounce - only update if at least 500ms since last update
    if (now - lastUpdateRef.current < 500) return;
    lastUpdateRef.current = now;

    // Update CPU history
    setCpuHistory((prev) => {
      const newHistory = [...prev, { value: systemStats.cpu.usage }];
      return newHistory.slice(-30);
    });

    // Update Memory history
    setMemoryHistory((prev) => {
      const newHistory = [...prev, { value: systemStats.memory.usage }];
      return newHistory.slice(-30);
    });

    // Update Storage history
    setStorageHistory((prev) => {
      const newHistory = [...prev, { value: storageStats.usagePercent }];
      return newHistory.slice(-30);
    });

    // Update GPU history (if available)
    const gpuUsage = systemStats.gpu?.usage ?? 0;
    setGpuHistory((prev) => {
      const newHistory = [...prev, { value: gpuUsage }];
      return newHistory.slice(-30);
    });

    // Update Network history
    setNetworkUploadHistory((prev) => {
      const newHistory = [...prev, { value: networkStats.uploadMbps }];
      return newHistory.slice(-60);
    });

    setNetworkDownloadHistory((prev) => {
      const newHistory = [...prev, { value: networkStats.downloadMbps }];
      return newHistory.slice(-60);
    });
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
    }
  }, [open]);

  // Default values if WebSocket not connected
  const currentSystemStats = systemStats || {
    cpu: { usage: 0, temperature: 0, power: 0 },
    memory: { usage: 0, total: 0, used: 0, free: 0 },
    gpu: { usage: 0, name: "GPU" },
  };

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

  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 GB";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const getMetricColor = (percentage: number) => {
    if (percentage < 80) return "#06b6d4"; // cyan
    if (percentage < 90) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  const formatMbps = (value: number) => value.toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[95vw] sm:max-w-[1200px] max-h-[90vh] bg-white/5 border border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50 p-0 gap-0 overflow-hidden ring-1 ring-white/5"
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
              Monitor
            </span>
            <div>
              <p className="text-xs text-white/60 -tracking-[0.01em]">Live Monitor</p>
              <h2 className="text-4xl font-semibold text-white leading-tight drop-shadow">
                System Pulse
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  connected ? "bg-green-400" : "bg-red-400"
                }`}
              />
              <span className="text-xs text-white/70">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 rounded-full border border-white/15 bg-white/10 text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6 space-y-4 bg-white/5 backdrop-blur-xl">
            {/* Top 4 Metrics Grid with Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* CPU Card with Chart */}
              <div className={cardClassName}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">
                      CPU
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {currentSystemStats.cpu.usage}%
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    8 threads
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cpuHistory}>
                        <defs>
                          <linearGradient
                            id="cpuGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={getMetricColor(
                                currentSystemStats.cpu.usage
                              )}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={getMetricColor(
                                currentSystemStats.cpu.usage
                              )}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={getMetricColor(currentSystemStats.cpu.usage)}
                          fill="url(#cpuGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Memory Card with Chart */}
              <div className={cardClassName}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">
                      Memory
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {formatBytes(currentSystemStats.memory.used).split(" ")[0]}
                    <span className="text-sm font-normal text-white/40">
                      {" "}
                      GB
                    </span>
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {formatBytes(
                      currentSystemStats.memory.total -
                        currentSystemStats.memory.used
                    )}{" "}
                    left
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={memoryHistory}>
                        <defs>
                          <linearGradient
                            id="memoryGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#f59e0b"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#f59e0b"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#f59e0b"
                          fill="url(#memoryGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* GPU Card with Chart */}
              <div className={cardClassName}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">
                      GPU
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {Math.round(currentSystemStats.gpu?.usage ?? 0)}%
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {currentSystemStats.gpu?.name || "GPU"}
                  </div>
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={gpuHistory}>
                        <defs>
                          <linearGradient
                            id="gpuGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#a855f7"
                          fill="url(#gpuGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Storage Card with Chart */}
              <div className={cardClassName}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-white/40 -tracking-[0.01em] uppercase">
                      Storage
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-xs text-white/40">Live</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white/90 -tracking-[0.02em]">
                    {currentStorageStats.used.toFixed(1)}
                    <span className="text-sm font-normal text-white/40">
                      {" "}
                      GB
                    </span>
                  </div>
                  <div className="text-xs text-white/40 -tracking-[0.01em]">
                    {(
                      currentStorageStats.total - currentStorageStats.used
                    ).toFixed(0)}{" "}
                    GB left
                  </div>
                  {/* Mini Chart */}
                  <div className="h-12 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={storageHistory}>
                        <defs>
                          <linearGradient
                            id="storageGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#10b981"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="#10b981"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          fill="url(#storageGradient)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </div>

            {/* Network Chart */}
            <div className={cardClassName}>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white/90 -tracking-[0.01em]">
                    Network Activity
                  </h3>
                  <p className="text-xs text-white/40">
                    Real-time bandwidth usage
                  </p>
                </div>
                <div className="flex gap-4 text-xs text-white/60">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span>Upload</span>
                    <span className="text-white/80 font-semibold">
                      {formatMbps(currentNetworkStats.uploadMbps)}
                    </span>
                    <span className="text-white/50">Mbit/s</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                    <span>Download</span>
                    <span className="text-white/80 font-semibold">
                      {formatMbps(currentNetworkStats.downloadMbps)}
                    </span>
                    <span className="text-white/50">Mbit/s</span>
                  </div>
                </div>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart>
                    <defs>
                      <linearGradient
                        id="uploadGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#8b5cf6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8b5cf6"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="downloadGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#ec4899"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#ec4899"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      data={networkUploadHistory}
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="url(#uploadGradient)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Area
                      data={networkDownloadHistory}
                      type="monotone"
                      dataKey="value"
                      stroke="#ec4899"
                      fill="url(#downloadGradient)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Applications List */}
            <div className={cardClassName}>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-white/90 -tracking-[0.01em]">
                  Applications
                </h3>
                <p className="text-xs text-white/40">Resource usage by app</p>
              </div>
              <div className="space-y-1">
                {!connected && (
                  <div className="text-xs text-white/40 py-2">
                    Connecting to server...
                  </div>
                )}
                {connected && runningApps.length === 0 && (
                  <div className="text-xs text-white/40 py-2">
                    No running apps detected.
                  </div>
                )}
                {runningApps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between py-2 hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                        <img
                          src={app.icon || "/default-application-icon.png"}
                          alt={app.name}
                          className="w-6 h-6 object-contain"
                          onError={(event) => {
                            event.currentTarget.src =
                              "/default-application-icon.png";
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                        {app.name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white/90 -tracking-[0.01em]">
                      {app.cpuUsage.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
