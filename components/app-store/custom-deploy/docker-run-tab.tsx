import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon } from "lucide-react";
import type { ClipboardEvent } from "react";
import type { EnvVarRow, PortMapping, VolumeMount } from "./docker-run-utils";
import { DockerRunEnvVars } from "./docker-run-env-vars";
import { DockerRunPortMappings } from "./docker-run-port-mappings";
import { DockerRunVolumeMounts } from "./docker-run-volume-mounts";

type DockerRunTabProps = {
  loading: boolean;
  imageName: string;
  imageTag: string;
  onImageChange: (value: string) => void;
  onTagChange: (value: string) => void;
  iconUrl: string;
  onIconUrlChange: (value: string) => void;
  onIconUrlPaste: (e: ClipboardEvent<HTMLInputElement>) => void;
  containerName: string;
  onContainerNameChange: (value: string) => void;
  portMappings: PortMapping[];
  onAddPortMapping: () => void;
  onUpdatePortMapping: (
    id: string,
    field: "host" | "container",
    value: string,
  ) => void;
  onRemovePortMapping: (id: string) => void;
  volumeMounts: VolumeMount[];
  onAddVolumeMount: () => void;
  onUpdateVolumeMount: (
    id: string,
    field: "host" | "container",
    value: string,
  ) => void;
  onRemoveVolumeMount: (id: string) => void;
  envVarRows: EnvVarRow[];
  onAddEnvVarRow: () => void;
  onUpdateEnvVarRow: (id: string, field: "key" | "value", value: string) => void;
  onRemoveEnvVarRow: (id: string) => void;
};

const inputStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
};

export function DockerRunTab({
  loading,
  imageName,
  imageTag,
  onImageChange,
  onTagChange,
  iconUrl,
  onIconUrlChange,
  onIconUrlPaste,
  containerName,
  onContainerNameChange,
  portMappings,
  onAddPortMapping,
  onUpdatePortMapping,
  onRemovePortMapping,
  volumeMounts,
  onAddVolumeMount,
  onUpdateVolumeMount,
  onRemoveVolumeMount,
  envVarRows,
  onAddEnvVarRow,
  onUpdateEnvVarRow,
  onRemoveEnvVarRow,
}: DockerRunTabProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="image-name" className="text-zinc-200">
            Docker Image *
          </Label>
          <Input
            id="image-name"
            placeholder="nginx or ghcr.io/user/image"
            value={imageName}
            onChange={(e) => onImageChange(e.target.value)}
            className="text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image-tag" className="text-zinc-200">
            Target (Version / Tag)
          </Label>
          <Input
            id="image-tag"
            placeholder="v1.2.3"
            value={imageTag}
            onChange={(e) => onTagChange(e.target.value)}
            className="text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
          />
          <p className="text-xs text-zinc-400">
            This is the image tag. Leave empty to use the default.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="icon-url" className="text-zinc-200">
          Icon URL (Optional)
        </Label>
        <div className="relative">
          <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="icon-url"
            placeholder="https://example.com/icon.png"
            value={iconUrl}
            onPaste={onIconUrlPaste}
            onChange={(e) => onIconUrlChange(e.target.value)}
            className="pl-9 text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
          />
        </div>
        <p className="text-xs text-zinc-400">
          Paste a direct image URL to customize the app icon.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="container-name" className="text-zinc-200">
          Container Name (Optional)
        </Label>
        <Input
          id="container-name"
          placeholder="my-container"
          value={containerName}
          onChange={(e) => onContainerNameChange(e.target.value)}
          className="text-white placeholder:text-zinc-500"
          style={inputStyle}
          disabled={loading}
        />
      </div>

      <DockerRunPortMappings
        loading={loading}
        rows={portMappings}
        onAdd={onAddPortMapping}
        onUpdate={onUpdatePortMapping}
        onRemove={onRemovePortMapping}
      />

      <DockerRunVolumeMounts
        loading={loading}
        rows={volumeMounts}
        onAdd={onAddVolumeMount}
        onUpdate={onUpdateVolumeMount}
        onRemove={onRemoveVolumeMount}
      />

      <DockerRunEnvVars
        loading={loading}
        rows={envVarRows}
        onAdd={onAddEnvVarRow}
        onUpdate={onUpdateEnvVarRow}
        onRemove={onRemoveEnvVarRow}
      />
    </div>
  );
}
