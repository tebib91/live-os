import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RestartPolicy } from "./docker-run-utils";

type DockerRunAdvancedOptionsProps = {
  loading: boolean;
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

const selectStyle = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.15)",
};

export function DockerRunAdvancedOptions({
  loading,
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
}: DockerRunAdvancedOptionsProps) {
  return (
    <div className="space-y-4">
      <Label className="text-zinc-200 text-sm font-medium">
        Advanced Options
      </Label>

      {/* Row 1: Restart Policy + Privileged */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="restart-policy" className="text-zinc-200">
            Restart Policy
          </Label>
          <select
            id="restart-policy"
            value={restartPolicy}
            onChange={(e) =>
              onRestartPolicyChange(e.target.value as RestartPolicy)
            }
            className="flex h-9 w-full rounded-md px-3 py-1 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={selectStyle}
            disabled={loading}
          >
            <option value="unless-stopped">Unless Stopped (default)</option>
            <option value="always">Always</option>
            <option value="on-failure">On Failure</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="flex items-end space-x-3 pb-0.5">
          <label
            htmlFor="privileged-mode"
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              id="privileged-mode"
              type="checkbox"
              checked={privileged}
              onChange={(e) => onPrivilegedChange(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-cyan-500"
            />
            <span className="text-sm text-zinc-200">Privileged Mode</span>
          </label>
          {privileged && (
            <p className="text-xs text-yellow-400">
              Grants full host access — use with caution.
            </p>
          )}
        </div>
      </div>

      {/* Row 2: Memory Limit + CPU Shares */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="memory-limit" className="text-zinc-200">
            Memory Limit
          </Label>
          <Input
            id="memory-limit"
            placeholder="512m"
            value={memoryLimit}
            onChange={(e) => onMemoryLimitChange(e.target.value)}
            className="text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
          />
          <p className="text-xs text-zinc-400">
            e.g. 256m, 1g. Leave empty for no limit.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cpu-shares" className="text-zinc-200">
            CPU Shares
          </Label>
          <select
            id="cpu-shares"
            value={cpuShares}
            onChange={(e) => onCpuSharesChange(e.target.value)}
            className="flex h-9 w-full rounded-md px-3 py-1 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={selectStyle}
            disabled={loading}
          >
            <option value="">Default (1024)</option>
            <option value="256">Low (256)</option>
            <option value="512">Medium (512)</option>
            <option value="1024">High (1024)</option>
          </select>
        </div>
      </div>

      {/* Row 3: Hostname + Command */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="container-hostname" className="text-zinc-200">
            Container Hostname
          </Label>
          <Input
            id="container-hostname"
            placeholder="my-host"
            value={containerHostname}
            onChange={(e) => onContainerHostnameChange(e.target.value)}
            className="text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="container-command" className="text-zinc-200">
            Command
          </Label>
          <Input
            id="container-command"
            placeholder="npm start"
            value={containerCommand}
            onChange={(e) => onContainerCommandChange(e.target.value)}
            className="text-white placeholder:text-zinc-500"
            style={inputStyle}
            disabled={loading}
          />
          <p className="text-xs text-zinc-400">
            Override the default container command.
          </p>
        </div>
      </div>
    </div>
  );
}
