import { InfoRow } from "../info-row";
import { formatCpuTemp, type HardwareInfo } from "../hardware-utils";

interface ThermalsTabProps {
  thermals?: HardwareInfo["thermals"];
  cpuTemperature?: HardwareInfo["cpuTemperature"];
}

function formatTempArray(temps?: (number | null)[]): string {
  if (!temps || temps.length === 0) return "Unknown";
  return temps
    .map((t) => (typeof t === "number" ? `${Math.round(t)}°C` : "—"))
    .join(" · ");
}

export function ThermalsTab({ thermals, cpuTemperature }: ThermalsTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="CPU temperature" value={formatCpuTemp(cpuTemperature)} />
      <InfoRow
        label="Main (avg)"
        value={
          typeof thermals?.main === "number" ? `${Math.round(thermals.main)}°C` : undefined
        }
      />
      <InfoRow
        label="Max"
        value={
          typeof thermals?.max === "number" ? `${Math.round(thermals.max)}°C` : undefined
        }
      />
      <InfoRow label="Cores" value={formatTempArray(thermals?.cores)} />
      <InfoRow label="Socket" value={formatTempArray(thermals?.socket)} />
      <InfoRow
        label="Chipset"
        value={
          typeof thermals?.chipset === "number"
            ? `${Math.round(thermals.chipset)}°C`
            : undefined
        }
      />
    </div>
  );
}
