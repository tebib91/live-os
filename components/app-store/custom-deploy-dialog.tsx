"use client";

import { deployCustomCompose, deployCustomRun } from "@/app/actions/custom-deploy";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Upload } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { CustomDeployFooter } from "./custom-deploy/custom-deploy-footer";
import { CustomDeployHeader } from "./custom-deploy/custom-deploy-header";
import { DockerComposeTab } from "./custom-deploy/docker-compose-tab";
import { DockerRunTab } from "./custom-deploy/docker-run-tab";
import {
  serializeCapabilities,
  serializeDevices,
  serializeEnvVars,
  serializePorts,
  serializeVolumes,
  type RestartPolicy,
} from "./custom-deploy/docker-run-utils";
import { useDockerRunForm } from "./custom-deploy/use-docker-run-form";

export interface CustomDeployInitialData {
  appName?: string;
  dockerCompose?: string;
  dockerRun?: {
    image?: string;
    containerName?: string;
    ports?: string;
    volumes?: string;
    env?: string;
    webUIPort?: string;
    networkType?: "bridge" | "host" | "macvlan" | "none";
    devices?: string;
    command?: string;
    privileged?: boolean;
    memoryLimit?: string;
    cpuShares?: string;
    restartPolicy?: RestartPolicy;
    capabilities?: string;
    hostname?: string;
  };
  appIcon?: string;
  appTitle?: string;
}

interface CustomDeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CustomDeployInitialData;
  onDeploySuccess?: () => void;
}

export function CustomDeployDialog({
  open,
  onOpenChange,
  initialData,
  onDeploySuccess,
}: CustomDeployDialogProps) {
  const [loading, setLoading] = useState(false);
  const [appName, setAppName] = useState(initialData?.appName ?? "");
  const [dockerCompose, setDockerCompose] = useState(
    initialData?.dockerCompose ?? "",
  );
  const hasCompose = Boolean(initialData?.dockerCompose);
  const hasRun = Boolean(initialData?.dockerRun);
  const [deployMethod, setDeployMethod] = useState<"compose" | "run">(
    hasRun ? "run" : hasCompose ? "compose" : "compose",
  );

  const dockerRunForm = useDockerRunForm({
    open,
    dockerRun: initialData?.dockerRun,
    appIcon: initialData?.appIcon,
  });
  useEffect(() => {
    if (!open) return;
    setAppName(initialData?.appName ?? "");
    setDockerCompose(initialData?.dockerCompose ?? "");
    if (initialData?.dockerRun) {
      setDeployMethod("run");
      return;
    }
    if (initialData?.dockerCompose) {
      setDeployMethod("compose");
    }
  }, [open, initialData]);
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setDockerCompose(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };
  const handleDeploy = async () => {
    if (!appName.trim()) {
      toast.error("Please provide an app name");
      return;
    }

    if (deployMethod === "compose" && !dockerCompose.trim()) {
      toast.error("Please provide docker-compose configuration");
      return;
    }

    if (deployMethod === "run" && !dockerRunForm.imageName.trim()) {
      toast.error("Please provide a Docker image name");
      return;
    }

    setLoading(true);

    try {
      let result;

      if (deployMethod === "compose") {
        // Deploy using docker-compose
        result = await deployCustomCompose(appName, dockerCompose);
      } else {
        // Deploy using docker run
        const trimmedImage = dockerRunForm.imageName.trim();
        const trimmedTag = dockerRunForm.imageTag.trim();
        const fullImage = trimmedTag ? `${trimmedImage}:${trimmedTag}` : trimmedImage;
        const serializedPorts = serializePorts(dockerRunForm.portMappings);
        const serializedVolumes = serializeVolumes(dockerRunForm.volumeMounts);
        const serializedEnvVars = serializeEnvVars(dockerRunForm.envVarRows);
        const serializedDevices = serializeDevices(dockerRunForm.deviceMappings);
        const serializedCaps = serializeCapabilities(dockerRunForm.capabilities);
        result = await deployCustomRun({
          appName,
          imageName: fullImage,
          containerName: dockerRunForm.containerName || undefined,
          ports: serializedPorts || undefined,
          volumes: serializedVolumes || undefined,
          envVars: serializedEnvVars || undefined,
          iconUrl: dockerRunForm.iconUrl || undefined,
          networkType: dockerRunForm.networkType,
          webUIPort: dockerRunForm.webUIPort || undefined,
          devices: serializedDevices || undefined,
          command: dockerRunForm.containerCommand || undefined,
          privileged: dockerRunForm.privileged || undefined,
          memoryLimit: dockerRunForm.memoryLimit || undefined,
          cpuShares: dockerRunForm.cpuShares || undefined,
          restartPolicy: dockerRunForm.restartPolicy,
          capabilities: serializedCaps || undefined,
          hostname: dockerRunForm.containerHostname || undefined,
        });
      }

      if (result.success) {
        toast.success(`Successfully deployed ${appName}`);
        onOpenChange(false);

        // Reset form
        setAppName("");
        setDockerCompose("");
        dockerRunForm.reset();

        // Call success callback if provided
        onDeploySuccess?.();
      } else {
        toast.error(result.error || "Failed to deploy application");
      }
    } catch (error) {
      // Error handled by toast
      toast.error("Failed to deploy application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] bg-zinc-900/95 text-white border border-white/10 backdrop-blur-xl shadow-2xl p-0 gap-0 overflow-hidden"
        aria-describedby="custom-deploy-description"
        style={{
          boxShadow: `
            0 4px 16px rgba(0, 0, 0, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15),
            inset 0 -1px 0 rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        <CustomDeployHeader
          data={initialData}
          descriptionId="custom-deploy-description"
          onClose={() => onOpenChange(false)}
        />

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6 space-y-6">
            {/* App Name */}
            <div className="space-y-2">
              <Label htmlFor="app-name" className="text-zinc-200">
                App Name *
              </Label>
              <Input
                id="app-name"
                placeholder="my-custom-app"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="text-white placeholder:text-zinc-500"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
                disabled={loading}
              />
              <p className="text-xs text-zinc-400">
                This will be used as the container/app identifier
              </p>
            </div>

            {/* Deploy Method Tabs */}
            <Tabs
              value={deployMethod}
              onValueChange={(v) => setDeployMethod(v as "compose" | "run")}
            >
              <TabsList
                className="flex w-full gap-2 rounded-xl p-1"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {(hasCompose || !initialData) && (
                  <TabsTrigger
                    value="compose"
                    className="flex-1 flex items-center justify-center gap-2 text-white data-[state=active]:text-white rounded-lg"
                    style={{
                      background:
                        deployMethod === "compose"
                          ? "rgba(255, 255, 255, 0.15)"
                          : "transparent",
                    }}
                  >
                    <FileCode className="h-4 w-4" />
                    Docker Compose
                  </TabsTrigger>
                )}
                {(hasRun || !initialData) && (
                  <TabsTrigger
                    value="run"
                    className="flex-1 flex items-center justify-center gap-2 text-white data-[state=active]:text-white rounded-lg"
                    style={{
                      background:
                        deployMethod === "run"
                          ? "rgba(255, 255, 255, 0.15)"
                          : "transparent",
                    }}
                  >
                    <Upload className="h-4 w-4" />
                    Docker Run
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Docker Compose Tab */}
              {(hasCompose || !initialData) && (
                <TabsContent value="compose" className="space-y-4 mt-4">
                  <DockerComposeTab
                    loading={loading}
                    dockerCompose={dockerCompose}
                    onDockerComposeChange={setDockerCompose}
                    onFileUpload={handleFileUpload}
                  />
                </TabsContent>
              )}
              {/* Docker Run Tab */}
              {(hasRun || !initialData) && (
                <TabsContent value="run" className="space-y-4 mt-4">
                  <DockerRunTab
                    loading={loading}
                    imageName={dockerRunForm.imageName}
                    imageTag={dockerRunForm.imageTag}
                    onImageChange={dockerRunForm.handleImageChange}
                    onTagChange={dockerRunForm.handleTagChange}
                    iconUrl={dockerRunForm.iconUrl}
                    onIconUrlChange={dockerRunForm.setIconUrl}
                    onIconUrlPaste={dockerRunForm.handleIconPaste}
                    containerName={dockerRunForm.containerName}
                    onContainerNameChange={dockerRunForm.setContainerName}
                    networkType={dockerRunForm.networkType}
                    onNetworkTypeChange={dockerRunForm.setNetworkType}
                    webUIPort={dockerRunForm.webUIPort}
                    onWebUIPortChange={dockerRunForm.setWebUIPort}
                    portMappings={dockerRunForm.portMappings}
                    onAddPortMapping={dockerRunForm.addPortMapping}
                    onUpdatePortMapping={dockerRunForm.updatePortMapping}
                    onRemovePortMapping={dockerRunForm.removePortMapping}
                    volumeMounts={dockerRunForm.volumeMounts}
                    onAddVolumeMount={dockerRunForm.addVolumeMount}
                    onUpdateVolumeMount={dockerRunForm.updateVolumeMount}
                    onRemoveVolumeMount={dockerRunForm.removeVolumeMount}
                    envVarRows={dockerRunForm.envVarRows}
                    onAddEnvVarRow={dockerRunForm.addEnvVarRow}
                    onUpdateEnvVarRow={dockerRunForm.updateEnvVarRow}
                    onRemoveEnvVarRow={dockerRunForm.removeEnvVarRow}
                    deviceMappings={dockerRunForm.deviceMappings}
                    onAddDeviceMapping={dockerRunForm.addDeviceMapping}
                    onUpdateDeviceMapping={dockerRunForm.updateDeviceMapping}
                    onRemoveDeviceMapping={dockerRunForm.removeDeviceMapping}
                    capabilities={dockerRunForm.capabilities}
                    onAddCapability={dockerRunForm.addCapability}
                    onUpdateCapability={dockerRunForm.updateCapability}
                    onRemoveCapability={dockerRunForm.removeCapability}
                    restartPolicy={dockerRunForm.restartPolicy}
                    onRestartPolicyChange={dockerRunForm.setRestartPolicy}
                    privileged={dockerRunForm.privileged}
                    onPrivilegedChange={dockerRunForm.setPrivileged}
                    memoryLimit={dockerRunForm.memoryLimit}
                    onMemoryLimitChange={dockerRunForm.setMemoryLimit}
                    cpuShares={dockerRunForm.cpuShares}
                    onCpuSharesChange={dockerRunForm.setCpuShares}
                    containerHostname={dockerRunForm.containerHostname}
                    onContainerHostnameChange={dockerRunForm.setContainerHostname}
                    containerCommand={dockerRunForm.containerCommand}
                    onContainerCommandChange={dockerRunForm.setContainerCommand}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ScrollArea>

        <CustomDeployFooter
          loading={loading}
          onCancel={() => onOpenChange(false)}
          onDeploy={handleDeploy}
        />
      </DialogContent>
    </Dialog>
  );
}
