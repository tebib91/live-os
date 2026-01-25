"use client";

import { deployCustomCompose, deployCustomRun } from "@/app/actions/custom-deploy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, FileCode, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export interface CustomDeployInitialData {
  appName?: string;
  dockerCompose?: string;
  dockerRun?: {
    image?: string;
    containerName?: string;
    ports?: string;
    volumes?: string;
    env?: string;
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
    hasCompose ? "compose" : hasRun ? "run" : "compose",
  );

  // Update state when initialData changes (for customize install)
  useEffect(() => {
    if (open && initialData) {
      if (initialData.appName) setAppName(initialData.appName);
      if (initialData.dockerCompose) {
        setDockerCompose(initialData.dockerCompose);
        setDeployMethod("compose");
      } else if (initialData.dockerRun) {
        setDeployMethod("run");
      }
      if (initialData.dockerRun?.image)
        setImageName(initialData.dockerRun.image);
      if (initialData.dockerRun?.containerName)
        setContainerName(initialData.dockerRun.containerName);
      if (initialData.dockerRun?.ports) setPorts(initialData.dockerRun.ports);
      if (initialData.dockerRun?.volumes)
        setVolumes(initialData.dockerRun.volumes);
      if (initialData.dockerRun?.env) setEnvVars(initialData.dockerRun.env);
    }
  }, [open, initialData]);

  // Docker run fields
  const [imageName, setImageName] = useState(
    initialData?.dockerRun?.image ?? "",
  );
  const [containerName, setContainerName] = useState(
    initialData?.dockerRun?.containerName ?? "",
  );
  const [ports, setPorts] = useState(initialData?.dockerRun?.ports ?? "");
  const [volumes, setVolumes] = useState(initialData?.dockerRun?.volumes ?? "");
  const [envVars, setEnvVars] = useState(initialData?.dockerRun?.env ?? "");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (deployMethod === "run" && !imageName.trim()) {
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
        result = await deployCustomRun(
          appName,
          imageName,
          containerName || undefined,
          ports || undefined,
          volumes || undefined,
          envVars || undefined,
        );
      }

      if (result.success) {
        toast.success(`Successfully deployed ${appName}`);
        onOpenChange(false);

        // Reset form
        setAppName("");
        setDockerCompose("");
        setImageName("");
        setContainerName("");
        setPorts("");
        setVolumes("");
        setEnvVars("");

        // Trigger refresh of installed apps
        window.dispatchEvent(new CustomEvent("refreshInstalledApps"));

        // Call success callback if provided
        onDeploySuccess?.();
      } else {
        toast.error(result.error || "Failed to deploy application");
      }
    } catch (error) {
      console.error("Deploy error:", error);
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
        {/* Header */}
        <div
          className="relative px-6 py-5 border-b"
          style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {initialData?.appIcon && (
                <div className="relative w-12 h-12 flex-shrink-0">
                  <Image
                    src={initialData.appIcon}
                    alt={initialData.appTitle || "App"}
                    fill
                    className="object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/icons/default-app-icon.png";
                    }}
                  />
                </div>
              )}
              <div>
                <DialogTitle className="text-2xl font-semibold text-white">
                  {initialData?.appTitle
                    ? `Customize ${initialData.appTitle}`
                    : "Custom Docker Deploy"}
                </DialogTitle>
                <DialogDescription
                  id="custom-deploy-description"
                  className="text-sm text-zinc-300 mt-1"
                >
                  {initialData?.appTitle
                    ? "Modify the configuration before deploying"
                    : "Deploy your own Docker container or compose file"}
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-full text-white transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compose-file" className="text-zinc-200">
                        Docker Compose Configuration *
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          document.getElementById("file-upload")?.click()
                        }
                        disabled={loading}
                        className="h-8 text-white hover:text-white transition-all"
                        style={{
                          background: "rgba(255, 255, 255, 0.1)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255, 255, 255, 0.1)";
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload File
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        accept=".yml,.yaml"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <Textarea
                      id="compose-file"
                      placeholder="version: '3.8'
services:
  myapp:
    image: nginx:latest
    ports:
      - '8080:80'
    volumes:
      - ./data:/data"
                      value={dockerCompose}
                      onChange={(e) => setDockerCompose(e.target.value)}
                      className="min-h-[300px] font-mono text-sm text-white placeholder:text-zinc-500 whitespace-pre-wrap break-words break-all w-full max-w-full"
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                      }}
                      disabled={loading}
                    />
                    <p className="text-xs text-zinc-400">
                      Paste your docker-compose.yml content or upload a file
                    </p>
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "rgba(59, 130, 246, 0.1)",
                      border: "1px solid rgba(96, 165, 250, 0.3)",
                    }}
                  >
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-300 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-100/90">
                        <p className="font-medium mb-1 text-white">
                          Important Notes:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>
                            Ensure ports don&apos;t conflict with existing apps
                          </li>
                          <li>Use absolute paths for volume mounts</li>
                          <li>
                            Container will restart automatically unless
                            specified
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
              {/* Docker Run Tab */}
              {(hasRun || !initialData) && (
                <TabsContent value="run" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="image-name" className="text-zinc-200">
                        Docker Image *
                      </Label>
                      <Input
                        id="image-name"
                        placeholder="nginx:latest or ghcr.io/user/image:tag"
                        value={imageName}
                        onChange={(e) => setImageName(e.target.value)}
                        className="text-white placeholder:text-zinc-500"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="container-name" className="text-zinc-200">
                        Container Name (Optional)
                      </Label>
                      <Input
                        id="container-name"
                        placeholder="my-container"
                        value={containerName}
                        onChange={(e) => setContainerName(e.target.value)}
                        className="text-white placeholder:text-zinc-500"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ports" className="text-zinc-200">
                        Port Mappings
                      </Label>
                      <Input
                        id="ports"
                        placeholder="8080:80, 8443:443"
                        value={ports}
                        onChange={(e) => setPorts(e.target.value)}
                        className="text-white placeholder:text-zinc-500"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                        disabled={loading}
                      />
                      <p className="text-xs text-zinc-400">
                        Format: host:container, separated by commas
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="volumes" className="text-zinc-200">
                        Volume Mounts
                      </Label>
                      <Textarea
                        id="volumes"
                        placeholder="/host/path:/container/path&#10;./data:/app/data"
                        value={volumes}
                        onChange={(e) => setVolumes(e.target.value)}
                        className="min-h-[80px] font-mono text-sm text-white placeholder:text-zinc-500"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                        disabled={loading}
                      />
                      <p className="text-xs text-zinc-400">
                        One per line, format: host:container
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="env-vars" className="text-zinc-200">
                        Environment Variables
                      </Label>
                      <Textarea
                        id="env-vars"
                        placeholder="KEY=value&#10;API_KEY=your-key&#10;DEBUG=true"
                        value={envVars}
                        onChange={(e) => setEnvVars(e.target.value)}
                        className="min-h-[100px] font-mono text-sm text-white placeholder:text-zinc-500"
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                        }}
                        disabled={loading}
                      />
                      <p className="text-xs text-zinc-400">
                        One per line, format: KEY=value
                      </p>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: "rgba(255, 255, 255, 0.15)" }}
        >
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-white hover:text-white transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={loading}
            className="text-white hover:text-white transition-all"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!loading)
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
            }}
            onMouseLeave={(e) => {
              if (!loading)
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
            }}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deploying...
              </>
            ) : (
              "Deploy Application"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
