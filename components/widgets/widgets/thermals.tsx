"use client";

import { text } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import { Flame, Thermometer } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import type { ThermalsWidgetData } from "../types";

interface ThermalsWidgetProps {
  data: ThermalsWidgetData;
}

export function ThermalsWidget({ data }: ThermalsWidgetProps) {
  const { cpuTemperature, main, max, cores = [], socket = [] } = data;

  const headlineTemp = firstNumber(cpuTemperature ?? main ?? null);
  const maxDisplay = formatTemp(max);
  const coresDisplay = formatList(cores);
  const socketDisplay = formatList(socket);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const update = () => {
      if (cardRef.current) {
        const { offsetWidth, offsetHeight } = cardRef.current;
        setCardSize({ width: offsetWidth, height: offsetHeight });
      }
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div ref={cardRef} className="relative h-full w-full overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-amber-400/5 to-transparent" />
      <div className="absolute -left-12 -top-12 h-32 w-32 rounded-full bg-orange-500/15 blur-3xl" />
      <div className="absolute -right-10 -bottom-10 h-28 w-28 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 shadow-inner shadow-black/20">
              <Thermometer className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <p
                className={cn(
                  text.label,
                  "uppercase tracking-wider text-[10px]",
                )}
              >
                Thermals
              </p>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold text-white leading-tight">
                  {headlineTemp ?? "—"}
                </span>
                {headlineTemp !== null && (
                  <span className={cn(text.muted, "text-white/70 text-xs")}>
                    °C
                  </span>
                )}
              </div>
              <p className="text-[10px] text-white/60">
                {headlineTemp !== null ? "CPU temp" : "Awaiting data"}
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white/5 px-2 py-1.5 text-right">
            <p className={cn(text.label, "text-[10px]")}>Max</p>
            <p className="text-lg font-semibold text-white leading-tight">
              {maxDisplay ?? "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <StatPill
            label="Cores"
            value={coresDisplay ?? "—"}
            temps={cores}
            overlaySize={cardSize}
          />
          <StatPill
            label="Socket"
            value={socketDisplay ?? "—"}
            temps={socket}
            overlaySize={cardSize}
          />
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  temps = [],
  overlaySize,
}: {
  label: string;
  value: string;
  temps?: (number | null)[];
  overlaySize?: { width: number; height: number };
}) {
  const filteredTemps = temps.filter(
    (t): t is number => typeof t === "number" && Number.isFinite(t),
  );
  const showPopover = filteredTemps.length > 3;

  return (
    <div className="relative group">
      <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1">
        <Flame className="h-3 w-3 text-amber-200 shrink-0" />
        <div className="flex flex-col leading-none min-w-0">
          <span className="text-[10px] text-white/50">{label}</span>
          <span className="text-xs text-white truncate">{value}</span>
        </div>
      </div>

      {showPopover && (
        <div
          className="pointer-events-none absolute left-[-13%] bottom-full z-30 mb-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100"
          style={{
            width: overlaySize?.width || undefined,
            maxWidth: "calc(100vw - 48px)",
          }}
        >
          <div
            className="rounded-xl border border-white/15 bg-zinc-900/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur"
            style={{
              maxHeight: overlaySize?.height || undefined,
              overflowY: "auto",
            }}
          >
            <p className="text-[10px] uppercase tracking-wide text-white/50 mb-2">
              {label} temps
            </p>
            <div className="flex flex-wrap gap-1 text-[11px] text-white">
              {filteredTemps.map((temp, idx) => (
                <span
                  key={`${label}-${idx}`}
                  className="rounded-full bg-white/10 px-2 py-[3px] border border-white/10"
                >
                  {idx + 1}: {Math.round(temp)}°C
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTemp(value?: number | null): string | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return `${Math.round(value)}°C`;
}

function formatList(values?: (number | null)[]): string | null {
  if (!values || values.length === 0) return null;
  const filtered = values.filter((v): v is number => typeof v === "number");
  if (filtered.length === 0) return null;
  return filtered
    .slice(0, 3)
    .map((v) => `${Math.round(v)}°`)
    .join(" · ");
}

function firstNumber(value: number | null): number | null {
  if (typeof value === "number" && !Number.isNaN(value))
    return Math.round(value);
  return null;
}
