import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { EnvVarRow } from "./docker-run-utils";

type DockerRunEnvVarsProps = {
  loading: boolean;
  rows: EnvVarRow[];
  onAdd: () => void;
  onUpdate: (id: string, field: "key" | "value", value: string) => void;
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

export function DockerRunEnvVars({
  loading,
  rows,
  onAdd,
  onUpdate,
  onRemove,
}: DockerRunEnvVarsProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-zinc-200">Environment Variables</Label>
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
              placeholder="KEY"
              value={row.key}
              onChange={(e) => onUpdate(row.id, "key", e.target.value)}
              className="flex-1 text-white placeholder:text-zinc-500"
              style={inputStyle}
              disabled={loading}
            />
            <span className="text-zinc-400 text-sm px-1">=</span>
            <Input
              placeholder="value"
              value={row.value}
              onChange={(e) => onUpdate(row.id, "value", e.target.value)}
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
              aria-label="Remove environment variable"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-400">
        Each row becomes a <code>-e KEY=value</code> flag.
      </p>
    </div>
  );
}
