import { InfoRow } from "../info-row";
import type { HardwareInfo } from "../hardware-utils";

interface SystemTabProps {
  hardware?: HardwareInfo["system"];
}

export function SystemTab({ hardware }: SystemTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="Manufacturer" value={hardware?.manufacturer} />
      <InfoRow label="Model" value={hardware?.model} />
      <InfoRow label="Version" value={hardware?.version} />
      <InfoRow label="Serial" value={hardware?.serial} />
      <InfoRow label="UUID" value={hardware?.uuid} />
    </div>
  );
}
