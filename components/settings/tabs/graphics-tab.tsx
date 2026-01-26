import { InfoRow } from "../info-row";
import type { HardwareInfo } from "../hardware-utils";

interface GraphicsTabProps {
  graphics?: HardwareInfo["graphics"];
}

function formatMb(value?: number | null): string {
  if (typeof value !== "number") return "Unknown";
  return `${value} MB`;
}

function formatPercent(value?: number | null): string | undefined {
  if (typeof value !== "number") return undefined;
  return `${Math.round(value)}%`;
}

export function GraphicsTab({ graphics }: GraphicsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="Model" value={graphics?.model} />
      <InfoRow label="Vendor" value={graphics?.vendor} />
      <InfoRow
        label="VRAM"
        value={typeof graphics?.vram === "number" ? `${graphics.vram} MB` : undefined}
      />
      <InfoRow
        label="VRAM dynamic"
        value={
          typeof graphics?.vramDynamic === "boolean"
            ? graphics.vramDynamic
              ? "Yes"
              : "No"
            : undefined
        }
      />
      <InfoRow
        label="Fan speed"
        value={typeof graphics?.fanSpeed === "number" ? `${graphics.fanSpeed}%` : undefined}
      />
      <InfoRow label="Memory total" value={formatMb(graphics?.memoryTotal)} />
      <InfoRow label="Memory used" value={formatMb(graphics?.memoryUsed)} />
      <InfoRow label="Memory free" value={formatMb(graphics?.memoryFree)} />
      <InfoRow label="Utilization GPU" value={formatPercent(graphics?.utilizationGpu)} />
      <InfoRow
        label="Utilization memory"
        value={formatPercent(graphics?.utilizationMemory)}
      />
      <InfoRow
        label="Temperature GPU"
        value={
          typeof graphics?.temperatureGpu === "number"
            ? `${Math.round(graphics.temperatureGpu)}°C`
            : undefined
        }
      />
      <InfoRow
        label="Temperature memory"
        value={
          typeof graphics?.temperatureMemory === "number"
            ? `${Math.round(graphics.temperatureMemory)}°C`
            : undefined
        }
      />
      <InfoRow
        label="Power draw"
        value={
          typeof graphics?.powerDraw === "number" ? `${graphics.powerDraw} W` : undefined
        }
      />
      <InfoRow
        label="Power limit"
        value={
          typeof graphics?.powerLimit === "number" ? `${graphics.powerLimit} W` : undefined
        }
      />
    </div>
  );
}
