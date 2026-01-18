"use client";

import { AlertTriangle, WifiOff } from "lucide-react";
import { alert } from "@/components/ui/design-tokens";

interface StatusMessageProps {
  type: "error" | "warning" | "empty";
  title: string;
  message: string;
}

export function StatusMessage({ type, title, message }: StatusMessageProps) {
  const Icon = type === "error" ? WifiOff : AlertTriangle;
  const alertClass = type === "error" ? alert.error : alert.warning;
  const colorClass = type === "error" ? "text-red" : "text-yellow";

  if (type === "empty") {
    return <div className="text-sm text-white/60">{message}</div>;
  }

  return (
    <div className={alertClass}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${colorClass}-400 flex-shrink-0 mt-0.5`} />
        <div>
          <p className={`text-sm font-medium ${colorClass}-300`}>{title}</p>
          <p className={`text-xs ${colorClass}-300/80 mt-1 whitespace-pre-line`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
