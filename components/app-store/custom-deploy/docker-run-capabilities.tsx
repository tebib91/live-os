import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { CapabilityRow } from "./docker-run-utils";

type DockerRunCapabilitiesProps = {
  loading: boolean;
  rows: CapabilityRow[];
  onAdd: () => void;
  onUpdate: (id: string, name: string) => void;
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

export function DockerRunCapabilities({
  loading,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: DockerRunCapabilitiesProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-zinc-200">Capabilities (cap-add)</Label>
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
              placeholder="SYS_ADMIN"
              value={row.name}
              onChange={(e) => onUpdate(row.id, e.target.value)}
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
              aria-label="Remove capability"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        Add Linux capabilities to the container (e.g. SYS_ADMIN, NET_ADMIN).
      </p>
    </div>
  );
}
