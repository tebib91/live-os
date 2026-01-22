"use client";

import Image from "next/image";
import { useState } from "react";
import { MetricCard } from "./metric-card";
import type { StorageInfo, SystemInfo, SystemStatus } from "./types";

type SidebarProps = {
  currentWallpaper?: string;
  systemInfo?: SystemInfo | null;
  storageInfo?: StorageInfo | null;
  systemStatus?: SystemStatus | null;
  formatBytes: (bytes: number, decimals?: number) => string;
  getMetricColor: (percentage: number) => "cyan" | "green" | "yellow" | "red";
};

export function SettingsSidebar({
  currentWallpaper,
  systemInfo,
  storageInfo,
  systemStatus,
  formatBytes,
  getMetricColor,
}: SidebarProps) {
  const cpuThreads = systemStatus?.hardware?.cpu?.cores;
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");

  const tempValueC = systemStatus?.cpu.temperature;
  const displayTemp = (() => {
    if (typeof tempValueC !== "number") return null;
    return tempUnit === "C"
      ? tempValueC
      : Math.round((tempValueC * 9) / 5 + 32);
  })();

  return (
    <div className="w-80 p-6 space-y-4 border-r border-white/5 bg-gradient-to-b from-white/10 via-transparent to-transparent flex-shrink-0">
      {/* System Preview Card */}
      <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/15 bg-black/40 backdrop-blur-xl shadow-inner shadow-black/30">
        {currentWallpaper && (
          <Image
            src={currentWallpaper}
            alt="System preview"
            className="w-full h-full object-cover opacity-30"
            width={500}
            height={500}
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-white/60 -tracking-[0.01em]">
            Good evening, {systemInfo?.username || "User"}
          </p>
        </div>
      </div>

      {/* Storage Card */}
      {storageInfo && (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-lg shadow-black/20">
          <MetricCard
            label="Storage"
            value={`${storageInfo.used} GB`}
            total={`${storageInfo.total} GB`}
            percentage={storageInfo.usagePercent}
            detail={`${Math.round((storageInfo.total - storageInfo.used) * 10) / 10} GB left`}
            color={getMetricColor(storageInfo.usagePercent)}
          />
        </div>
      )}

      {/* Memory Card */}
      {systemStatus && (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-lg shadow-black/20">
          <MetricCard
            label="Memory"
            value={formatBytes(systemStatus.memory.used)}
            total={formatBytes(systemStatus.memory.total)}
            percentage={systemStatus.memory.usage}
            detail={`${formatBytes(systemStatus.memory.total - systemStatus.memory.used)} left`}
            color={getMetricColor(systemStatus.memory.usage)}
          />
        </div>
      )}

      {/* CPU Card */}
      {systemStatus && (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-lg shadow-black/20">
          <MetricCard
            label="CPU"
            value={`${systemStatus.cpu.usage}%`}
            percentage={systemStatus.cpu.usage}
            detail={
              typeof cpuThreads === "number" && cpuThreads > 0
                ? `${cpuThreads} threads`
                : "8 threads"
            }
            color={getMetricColor(systemStatus.cpu.usage)}
          />
        </div>
      )}

      {/* Temperature Card */}
      {systemStatus && tempValueC !== undefined && tempValueC !== null && (
        <div className="bg-black/30 backdrop-blur-xl rounded-2xl p-4 border border-white/15 shadow-lg shadow-black/20">
          <div className="space-y-1.5">
            <div className="text-xs text-white/60 -tracking-[0.01em]">
              Temperature
            </div>
            <div className="flex items-end justify-between">
              <div className="text-2xl font-semibold text-white -tracking-[0.02em]">
                {displayTemp ?? "—"}°{tempUnit}
              </div>
              <div className="flex gap-1">
                <button
                  className={`px-2 py-1 text-xs rounded border ${tempUnit === "C" ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-white/50 border-white/10"}`}
                  onClick={() => setTempUnit("C")}
                >
                  °C
                </button>
                <button
                  className={`px-2 py-1 text-xs rounded border ${tempUnit === "F" ? "bg-white/10 text-white border-white/20" : "bg-white/5 text-white/50 border-white/10"}`}
                  onClick={() => setTempUnit("F")}
                >
                  °F
                </button>
              </div>
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-xs text-white/60 -tracking-[0.01em]">
                Normal
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
