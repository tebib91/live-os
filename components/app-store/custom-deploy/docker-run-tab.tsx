import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageIcon } from "lucide-react";
import type { ClipboardEvent } from "react";
import type {
  CapabilityRow,
  DeviceMapping,
  EnvVarRow,
  NetworkType,
  PortMapping,
  RestartPolicy,
  VolumeMount,
} from "./docker-run-utils";
import { DockerRunAdvancedOptions } from "./docker-run-advanced-options";
import { DockerRunCapabilities } from "./docker-run-capabilities";
import { DockerRunDeviceMappings } from "./docker-run-device-mappings";
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
  networkType: NetworkType;
  onNetworkTypeChange: (value: NetworkType) => void;
  webUIPort: string;
  onWebUIPortChange: (value: string) => void;
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
  // Advanced fields
  deviceMappings: DeviceMapping[];
  onAddDeviceMapping: () => void;
  onUpdateDeviceMapping: (
    id: string,
    field: "host" | "container",
    value: string,
  ) => void;
  onRemoveDeviceMapping: (id: string) => void;
  capabilities: CapabilityRow[];
  onAddCapability: () => void;
  onUpdateCapability: (id: string, name: string) => void;
  onRemoveCapability: (id: string) => void;
  restartPolicy: RestartPolicy;
  onRestartPolicyChange: (value: RestartPolicy) => void;
  privileged: boolean;
  onPrivilegedChange: (value: boolean) => void;
  memoryLimit: string;
  onMemoryLimitChange: (value: string) => void;
  cpuShares: string;
  onCpuSharesChange: (value: string) => void;
  containerHostname: string;
  onContainerHostnameChange: (value: string) => void;
  containerCommand: string;
  onContainerCommandChange: (value: string) => void;
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
  networkType,
  onNetworkTypeChange,
  webUIPort,
  onWebUIPortChange,
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
  deviceMappings,
  onAddDeviceMapping,
  onUpdateDeviceMapping,
  onRemoveDeviceMapping,
  capabilities,
  onAddCapability,
  onUpdateCapability,
  onRemoveCapability,
  restartPolicy,
  onRestartPolicyChange,
  privileged,
  onPrivilegedChange,
  memoryLimit,
  onMemoryLimitChange,
  cpuShares,
  onCpuSharesChange,
  containerHostname,
  onContainerHostnameChange,
  containerCommand,
  onContainerCommandChange,
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="network-type" className="text-zinc-200">
            Network Type
          </Label>
          <select
            id="network-type"
            value={networkType}
            onChange={(e) => onNetworkTypeChange(e.target.value as NetworkType)}
            className="flex h-9 w-full rounded-md px-3 py-1 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={inputStyle}
            disabled={loading}
          >
            <option value="bridge">Bridge (default)</option>
            <option value="host">Host</option>
            <option value="macvlan">Macvlan</option>
            <option value="none">None</option>
          </select>
          {networkType === "host" && (
            <p className="text-xs text-yellow-400">
              Host networking ignores port mappings — the container shares the host network directly.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="web-ui-port" className="text-zinc-200">
            Web UI Port (Optional)
          </Label>
          <Input
            id="web-ui-port"
            type="number"
            placeholder="Auto-detect from first port"
            value={webUIPort}
            onChange={(e) => onWebUIPortChange(e.target.value)}
            className="text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
            min={1}
            max={65535}
          />
          <p className="text-xs text-zinc-400">
            Port used by the &quot;Open&quot; button. Leave empty to use the first mapped port.
          </p>
        </div>
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

      <DockerRunDeviceMappings
        loading={loading}
        rows={deviceMappings}
        onAdd={onAddDeviceMapping}
        onUpdate={onUpdateDeviceMapping}
        onRemove={onRemoveDeviceMapping}
      />

      <DockerRunCapabilities
        loading={loading}
        rows={capabilities}
        onAdd={onAddCapability}
        onUpdate={onUpdateCapability}
        onRemove={onRemoveCapability}
      />

      <DockerRunAdvancedOptions
        loading={loading}
        restartPolicy={restartPolicy}
        onRestartPolicyChange={onRestartPolicyChange}
        privileged={privileged}
        onPrivilegedChange={onPrivilegedChange}
        memoryLimit={memoryLimit}
        onMemoryLimitChange={onMemoryLimitChange}
        cpuShares={cpuShares}
        onCpuSharesChange={onCpuSharesChange}
        containerHostname={containerHostname}
        onContainerHostnameChange={onContainerHostnameChange}
        containerCommand={containerCommand}
        onContainerCommandChange={onContainerCommandChange}
      />
    </div>
  );
}
