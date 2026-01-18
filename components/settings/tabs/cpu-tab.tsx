import { InfoRow } from "../info-row";
import { formatCpuLabel, formatCpuSpeed, type HardwareInfo } from "../hardware-utils";

interface CpuTabProps {
  hardware?: HardwareInfo["cpu"];
  cpuUsage?: number;
  cpuPower?: number;
}

export function CpuTab({ hardware, cpuUsage, cpuPower }: CpuTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="Brand" value={formatCpuLabel(hardware)} />
      <InfoRow label="Base clock" value={formatCpuSpeed(hardware)} />
      <InfoRow
        label="Physical cores"
        value={hardware?.physicalCores ? `${hardware.physicalCores}` : undefined}
      />
      <InfoRow
        label="Logical cores"
        value={hardware?.cores ? `${hardware.cores}` : undefined}
      />
      <InfoRow
        label="Usage"
        value={typeof cpuUsage === "number" ? `${cpuUsage}%` : undefined}
      />
      <InfoRow
        label="Power"
        value={typeof cpuPower === "number" ? `${cpuPower} W` : undefined}
      />
    </div>
  );
}
