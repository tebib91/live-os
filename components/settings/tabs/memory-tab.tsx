import { formatBytes } from "@/lib/utils";
import { InfoRow } from "../info-row";

interface MemoryTabProps {
  memory?: {
    total?: number;
    used?: number;
    free?: number;
    usage?: number;
  };
}



export function MemoryTab({ memory }: MemoryTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="Total" value={formatBytes(memory?.total ?? 0)} />
      <InfoRow label="Used" value={formatBytes(memory?.used ?? 0)} />
      <InfoRow label="Free" value={formatBytes(memory?.free ?? 0)} />
      <InfoRow
        label="Usage"
        value={typeof memory?.usage === "number" ? `${memory.usage}%` : undefined}
      />
    </div>
  );
}
