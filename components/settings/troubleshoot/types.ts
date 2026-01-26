/**
 * Troubleshoot Panel Types
 */

export type LogLevel = "info" | "warn" | "error" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export type LogSource = "system" | "docker" | "liveos" | "all";

export interface DiagnosticCheck {
  id: string;
  name: string;
  description: string;
  status: "pending" | "running" | "passed" | "failed" | "warning";
  message?: string;
  duration?: number;
}

export interface DiagnosticResult {
  checks: DiagnosticCheck[];
  overallStatus: "passed" | "failed" | "warning";
  timestamp: string;
}

export interface SystemService {
  name: string;
  displayName: string;
  status: "running" | "stopped" | "error" | "unknown";
  canRestart: boolean;
}

export interface DebugAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  dangerous?: boolean;
}
