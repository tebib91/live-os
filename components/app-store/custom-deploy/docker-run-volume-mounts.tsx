import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, X } from "lucide-react";
import type { VolumeMount } from "./docker-run-utils";

type DockerRunVolumeMountsProps = {
  loading: boolean;
  rows: VolumeMount[];
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

export function DockerRunVolumeMounts({
  loading,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: DockerRunVolumeMountsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-zinc-200">Volume Mounts</Label>
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
              placeholder="/host/path"
              value={row.host}
              onChange={(e) => onUpdate(row.id, "host", e.target.value)}
              className="flex-1 text-white placeholder:text-zinc-500"
              style={inputStyle}
              disabled={loading}
            />
            <ArrowRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            <Input
              placeholder="/container/path"
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
              aria-label="Remove volume mount"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400">Use absolute host paths when possible.</p>
    </div>
  );
}
