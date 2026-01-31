import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, X } from "lucide-react";
import type { DeviceMapping } from "./docker-run-utils";

type DockerRunDeviceMappingsProps = {
  loading: boolean;
  rows: DeviceMapping[];
  onAdd: () => void;
  onUpdate: (id: string, field: "host" | "container", value: string) => void;
  onRemove: (id: string) => void;
};

const inputStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
};

const iconButtonStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
};

export function DockerRunDeviceMappings({
  loading,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: DockerRunDeviceMappingsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-zinc-200">Device Mappings</Label>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onAdd}
          disabled={loading}
          className="text-white hover:text-white shadow-none"
          style={iconButtonStyle}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2">
            <Input
              placeholder="/dev/sda"
              value={row.host}
              onChange={(e) => onUpdate(row.id, "host", e.target.value)}
              className="flex-1 text-white placeholder:text-zinc-500"
              style={inputStyle}
              disabled={loading}
            />
            <ArrowRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <Input
              placeholder="/dev/sda"
              value={row.container}
              onChange={(e) => onUpdate(row.id, "container", e.target.value)}
              className="flex-1 text-white placeholder:text-zinc-500"
              style={inputStyle}
              disabled={loading}
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onRemove(row.id)}
              disabled={loading}
              className="text-white hover:text-white shadow-none"
              style={iconButtonStyle}
              aria-label="Remove device mapping"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        Map host devices into the container (e.g. /dev/ttyUSB0).
      </p>
    </div>
  );
}
