import { InfoRow } from "../info-row";
import type { HardwareInfo } from "../hardware-utils";

interface BatteryTabProps {
  battery?: HardwareInfo["battery"];
}

export function BatteryTab({ battery }: BatteryTabProps) {
  const statusValue =
    battery?.hasBattery === false
      ? "No battery"
      : battery?.isCharging
      ? "Charging"
      : "On battery";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="Status" value={statusValue} />
      <InfoRow
        label="Percent"
        value={typeof battery?.percent === "number" ? `${battery.percent}%` : undefined}
      />
      <InfoRow
        label="Cycle count"
        value={typeof battery?.cycleCount === "number" ? battery.cycleCount : undefined}
      />
      <InfoRow
        label="Designed capacity"
        value={
          typeof battery?.designedCapacity === "number"
            ? `${battery.designedCapacity} mWh`
            : undefined
        }
      />
      <InfoRow
        label="Max capacity"
        value={
          typeof battery?.maxCapacity === "number"
            ? `${battery.maxCapacity} mWh`
            : undefined
        }
      />
      <InfoRow
        label="Current capacity"
        value={
          typeof battery?.currentCapacity === "number"
            ? `${battery.currentCapacity} mWh`
            : undefined
        }
      />
      <InfoRow
        label="Voltage"
        value={typeof battery?.voltage === "number" ? `${battery.voltage} V` : undefined}
      />
      <InfoRow
        label="Time remaining"
        value={
          typeof battery?.timeRemaining === "number"
            ? `${battery.timeRemaining} min`
            : undefined
        }
      />
      <InfoRow
        label="AC connected"
        value={
          typeof battery?.acConnected === "boolean"
            ? battery.acConnected
              ? "Yes"
              : "No"
            : undefined
        }
      />
      <InfoRow label="Manufacturer" value={battery?.manufacturer || undefined} />
      <InfoRow label="Model" value={battery?.model || undefined} />
      <InfoRow label="Serial" value={battery?.serial || undefined} />
    </div>
  );
}
