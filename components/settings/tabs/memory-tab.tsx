import { InfoRow } from "../info-row";

interface MemoryTabProps {
  memory?: {
    total?: number;
    used?: number;
    free?: number;
    usage?: number;
  };
}

function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "Unknown";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function MemoryTab({ memory }: MemoryTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <InfoRow label="Total" value={formatBytes(memory?.total)} />
      <InfoRow label="Used" value={formatBytes(memory?.used)} />
      <InfoRow label="Free" value={formatBytes(memory?.free)} />
      <InfoRow
        label="Usage"
        value={typeof memory?.usage === "number" ? `${memory.usage}%` : undefined}
      />
    </div>
  );
}
