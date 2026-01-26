"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSystemLogs } from "@/app/actions/troubleshoot";
import { Button } from "@/components/ui/button";
import { card, text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Bug,
  RefreshCw,
  Download,
} from "lucide-react";
import type { LogEntry, LogSource } from "./types";

const LOG_SOURCES: { value: LogSource; label: string }[] = [
  { value: "all", label: "All Logs" },
  { value: "system", label: "System" },
  { value: "docker", label: "Docker" },
  { value: "liveos", label: "LiveOS" },
];

const LEVEL_CONFIG = {
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
  warn: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  info: { icon: Info, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  debug: { icon: Bug, color: "text-white/40", bg: "bg-white/5" },
};

export function LogsViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<LogSource>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await getSystemLogs(source, 100);
      setLogs(entries);
    } catch {
      // Error handled silently - logs may fail on some systems
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleExport = () => {
    const content = logs
      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liveos-logs-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={cn(card.base, card.padding.md, "flex flex-col h-[400px]")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className={cn(text.heading, "text-base")}>System Logs</h4>
          <p className={text.muted}>Recent system and application logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "border border-white/15 text-white text-xs",
              autoRefresh ? "bg-cyan-500/20 border-cyan-500/30" : "bg-white/10"
            )}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Live" : "Auto"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExport}
            className="border border-white/15 bg-white/10 hover:bg-white/20 text-white text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Source Filter */}
      <div className="flex gap-2 mb-3">
        {LOG_SOURCES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSource(s.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              source === s.value
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 rounded-lg bg-black/20 p-2"
      >
        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="h-5 w-5 text-white/40 animate-spin" />
          </div>
        )}
        {!loading && logs.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className={text.muted}>No logs found</p>
          </div>
        )}
        {logs.map((log) => {
          const config = LEVEL_CONFIG[log.level];
          const Icon = config.icon;
          return (
            <div
              key={log.id}
              className={cn(
                "flex items-start gap-2 px-2 py-1.5 rounded text-xs",
                config.bg
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.color)} />
              <span className="text-white/40 shrink-0 font-mono">
                {formatTime(log.timestamp)}
              </span>
              <span className="text-white/60 shrink-0 font-medium">
                [{log.source}]
              </span>
              <span className="text-white/80 break-all">{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
