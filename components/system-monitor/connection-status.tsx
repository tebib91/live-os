"use client";

import { text, statusDot } from "@/components/ui/design-tokens";

interface ConnectionStatusProps {
  connected: boolean;
}

export function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
      <div
        className={`${statusDot.base} ${
          connected ? statusDot.connected : statusDot.disconnected
        }`}
      />
      <span className={text.muted}>
        {connected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
}
