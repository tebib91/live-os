"use client";

import { getComposeForApp } from "@/app/actions/appstore";
import {
  getAppWebUI,
  restartApp,
  startApp,
  stopApp,
  uninstallApp,
} from "@/app/actions/docker";
import { getInstallConfig } from "@/app/actions/docker/db";
import {
  CustomDeployDialog,
  type CustomDeployInitialData,
} from "@/components/app-store/custom-deploy-dialog";
import type { InstalledApp } from "@/components/app-store/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ExternalLink,
  FileText,
  Loader2,
  Play,
  RotateCw,
  Square,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { LogsDialog } from "./logs-dialog";

type ComposePort = {
  published?: number | string;
  host?: number | string;
  container?: number | string;
  target?: number | string;
};

type ComposeVolume = {
  source?: string;
  container?: string;
  target?: string;
};

type ComposeEnv = string | { key?: string; value?: string };

type ComposeContainer = {
  image?: string;
  ports?: ComposePort[];
  volumes?: ComposeVolume[];
  environment?: ComposeEnv[];
};

interface AppContextMenuProps {
  app: InstalledApp;
  children: React.ReactNode;
}

export function AppContextMenu({ app, children }: AppContextMenuProps) {
  const [loading, setLoading] = useState(false);
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showCustomDeploy, setShowCustomDeploy] = useState(false);
  const [customData, setCustomData] = useState<CustomDeployInitialData | null>(
    null,
  );
  const [customLoading, setCustomLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastOpenedViaContext = useRef(false);

  const handleOpen = async () => {
    try {
      const url = await getAppWebUI(app.appId);
      if (url) {
        window.open(url, "_blank");
      } else {
        toast.error(
          "Unable to determine app URL. Ensure the container exposes a port and is running.",
        );
      }
    } catch {
      toast.error("Failed to open app");
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const success = await stopApp(app.containerName || app.appId);
      if (success) {
        toast.success(`${app.name} stopped`);
      } else {
        toast.error("Failed to stop app");
      }
    } catch {
      toast.error("Failed to stop app");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const success = await startApp(app.containerName);
      if (success) {
        toast.success(`${app.name} started`);
      } else {
        toast.error("Failed to start app");
      }
    } catch {
      toast.error("Failed to start app");
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    try {
      const success = await restartApp(app.containerName);
      if (success) {
        toast.success(`${app.name} restarted`);
      } else {
        toast.error("Failed to restart app");
      }
    } catch {
      toast.error("Failed to restart app");
    } finally {
      setLoading(false);
    }
  };

  const handleEditDeploy = async () => {
    setCustomLoading(true);
    try {
      const [result, installConfig] = await Promise.all([
        getComposeForApp(app.appId),
        getInstallConfig(app.appId),
      ]);
      if (!result.success) {
        toast.error(result.error || "App config not found");
        return;
      }

      const container = result.container as ComposeContainer | undefined;

      // Prefer saved installConfig (user's customizations) over store defaults
      const savedPorts = installConfig?.ports as string | undefined;
      const savedVolumes = installConfig?.volumes as string | undefined;
      const savedEnv = installConfig?.env as string | undefined;
      const savedImage = installConfig?.image as string | undefined;
      const savedWebUIPort = installConfig?.webUIPort as string | undefined;
      const savedNetworkType = installConfig?.networkType as
        | "bridge"
        | "host"
        | "macvlan"
        | "none"
        | undefined;
      const savedDevices = installConfig?.devices as string | undefined;
      const savedCommand = installConfig?.command as string | undefined;
      const savedPrivileged = installConfig?.privileged as boolean | undefined;
      const savedMemoryLimit = installConfig?.memoryLimit as string | undefined;
      const savedCpuShares = installConfig?.cpuShares as string | undefined;
      const savedRestartPolicy = installConfig?.restartPolicy as
        | "no"
        | "always"
        | "unless-stopped"
        | "on-failure"
        | undefined;
      const savedCapabilities = installConfig?.capabilities as string | undefined;
      const savedHostname = installConfig?.hostname as string | undefined;

      // Build dockerRun data: use installConfig first, fall back to store container metadata
      const fallbackPorts = (container?.ports || [])
        .map((p) =>
          [p.published ?? p.host, p.container ?? p.target]
            .filter(Boolean)
            .join(":"),
        )
        .filter(Boolean)
        .join(",");
      const fallbackVolumes = (container?.volumes || [])
        .map((v) =>
          [v.source, v.container || v.target].filter(Boolean).join(":"),
        )
        .filter(Boolean)
        .join(",");
      const fallbackEnv = (container?.environment || [])
        .map((e) => (typeof e === "string" ? e : `${e.key}=${e.value}`))
        .filter(Boolean)
        .join(",");

      const hasRunConfig = installConfig?.deployMethod === "run";
      const hasContainer = Boolean(container);

      setCustomData({
        appName: app.appId,
        dockerCompose: result.content,
        dockerRun:
          hasRunConfig || hasContainer
            ? {
                image: savedImage || container?.image || "",
                containerName: app.appId,
                ports: savedPorts ?? fallbackPorts,
                volumes: savedVolumes ?? fallbackVolumes,
                env: savedEnv ?? fallbackEnv,
                webUIPort: savedWebUIPort ?? "",
                networkType: savedNetworkType ?? "bridge",
                devices: savedDevices ?? "",
                command: savedCommand ?? "",
                privileged: savedPrivileged ?? false,
                memoryLimit: savedMemoryLimit ?? "",
                cpuShares: savedCpuShares ?? "",
                restartPolicy: savedRestartPolicy ?? "unless-stopped",
                capabilities: savedCapabilities ?? "",
                hostname: savedHostname ?? "",
              }
            : undefined,
        appIcon: result.appIcon,
        appTitle: result.appTitle,
      });
      setShowCustomDeploy(true);
    } catch (error) {
      console.error("Failed to load app config for edit:", error);
      toast.error("Failed to load app config");
    } finally {
      setCustomLoading(false);
    }
  };

  const handleUninstall = async () => {
    setLoading(true);
    try {
      const success = await uninstallApp(app.containerName);
      if (success) {
        toast.success(`${app.name} uninstalled`);
        setShowUninstallConfirm(false);
      } else {
        toast.error("Failed to uninstall app");
      }
    } catch {
      toast.error("Failed to uninstall app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(next) => {
          // Only allow opens triggered explicitly by context menu
          if (next && !lastOpenedViaContext.current) return;
          setMenuOpen(next);
          if (!next) lastOpenedViaContext.current = false;
        }}
      >
        <DropdownMenuTrigger
          asChild
          onContextMenu={(e) => {
            e.preventDefault();
            lastOpenedViaContext.current = true;
            setMenuOpen(true);
          }}
          onPointerDown={(e) => {
            if (e.button !== 2) {
              // Prevent left-click from toggling the menu; let parent handle navigation
              e.preventDefault();
            }
          }}
        >
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="bg-white/90 dark:bg-black/90 backdrop-blur-md border-white/20 dark:border-white/10"
          align="start"
        >
          <DropdownMenuItem onClick={handleOpen} disabled={loading}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>

          {app.status === "running" ? (
            <DropdownMenuItem onClick={handleStop} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Square className="mr-2 h-4 w-4" />
              )}
              Stop
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleStart} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start
            </DropdownMenuItem>
          )}

          <DropdownMenuItem onClick={handleRestart} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCw className="mr-2 h-4 w-4" />
            )}
            Restart
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowLogs(true)}
            disabled={loading}
          >
            <FileText className="mr-2 h-4 w-4" />
            View Logs
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleEditDeploy}
            disabled={loading || customLoading}
          >
            {customLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Edit / Redeploy
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowUninstallConfirm(true)}
            disabled={loading}
            className="text-red-600 dark:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Uninstall
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Uninstall Confirmation Dialog */}
      <Dialog
        open={showUninstallConfirm}
        onOpenChange={setShowUninstallConfirm}
      >
        <DialogContent className="bg-white/90 dark:bg-black/90 backdrop-blur-md border-white/20 dark:border-white/10">
          <DialogHeader>
            <DialogTitle>Uninstall {app.name}?</DialogTitle>
            <DialogDescription>
              This will remove the app. Data will be moved to trash and can be
              recovered later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUninstallConfirm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUninstall}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Uninstall
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logs Dialog */}
      <LogsDialog open={showLogs} onOpenChange={setShowLogs} app={app} />

      <CustomDeployDialog
        open={showCustomDeploy}
        onOpenChange={setShowCustomDeploy}
        initialData={customData || undefined}
        onDeploySuccess={() => {
          setShowCustomDeploy(false);
        }}
      />
    </>
  );
}
