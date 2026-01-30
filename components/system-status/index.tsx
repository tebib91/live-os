"use client";

import { Card } from "@/components/ui/card";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { formatBytes } from "@/lib/utils";
import { ChevronRight, HardDrive, Settings } from "lucide-react";
import { CircularProgress } from "./circular-progress";

export function SystemStatusCard() {
  const { systemStats, storageStats } = useSystemStatus();

  // Use WebSocket data or defaults
  const systemStatus = systemStats || {
    cpu: { usage: 0, temperature: 0, power: 0 },
    memory: { usage: 0, total: 0, used: 0, free: 0 },
  };

  const storage = storageStats || {
    total: 0,
    used: 0,
    usagePercent: 0,
    health: "Healthy",
  };

  return (
    <Card className="fixed top-8 left-8 z-10 w-80 bg-zinc-950/60 backdrop-blur-xl ">
      {/* System Status Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white drop-shadow-sm">
            System status
          </h3>
          <ChevronRight className="w-5 h-5 text-white/70" />
        </div>

        {/* CPU and RAM */}
        <div className="flex items-center justify-around gap-4">
          <CircularProgress
            percentage={systemStatus.cpu.usage}
            size={100}
            strokeWidth={8}
            color="#a855f7"
            label="CPU"
            sublabel={`${systemStatus.cpu.power}W / ${systemStatus.cpu.temperature}°C`}
          />
          <CircularProgress
            percentage={systemStatus.memory.usage}
            size={100}
            strokeWidth={8}
            color="#22d3ee"
            label="RAM"
            sublabel={formatBytes(systemStatus.memory.used)}
          />
        </div>
      </div>

      {/* Storage Section */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white drop-shadow-sm">
            Storage
          </h3>
          <Settings className="w-5 h-5 text-white/70" />
        </div>

        <div className="flex items-start gap-3">
          <div className="w-14 h-14 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center shadow-md">
            <HardDrive className="w-7 h-7 text-white/80" />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-medium text-emerald-200 bg-emerald-400/20 border border-emerald-400/30 rounded">
                {storage.health}
              </span>
            </div>
            <p className="text-sm text-white mb-1">
              Used:{" "}
              <span className="font-medium text-white">{storage.used} GB</span>
            </p>
            <p className="text-xs text-white/70">Total: {storage.total} GB</p>

            {/* Progress Bar */}
            <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-400 to-cyan-300 rounded-full transition-all duration-500"
                style={{ width: `${storage.usagePercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
