/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { getAppComposeContent, getAppMedia } from "@/app/actions/appstore";
import { getAppWebUI, installApp } from "@/app/actions/docker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLink, Loader2, Settings2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getDefaultInstallConfig } from "./app-install-dialog";
import {
  CustomDeployDialog,
  type CustomDeployInitialData,
} from "./custom-deploy-dialog";
import { AppScreenshots } from "./app-screenshots";
import type { App, InstalledApp } from "./types";
import type { InstallProgress } from "@/hooks/system-status-types";
import { useSystemStatus } from "@/hooks/useSystemStatus";

interface AppDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: App;
  onInstallSuccess?: () => void;
  installedApp?: InstalledApp;
  installProgress?: InstallProgress | null;
}

export function AppDetailDialog({
  open,
  onOpenChange,
  app,
  onInstallSuccess,
  installedApp,
  installProgress,
}: AppDetailDialogProps) {
  const [installing, setInstalling] = useState(false);
  const [loadingCompose, setLoadingCompose] = useState(false);
  const [customDeployOpen, setCustomDeployOpen] = useState(false);
  const [customDeployData, setCustomDeployData] =
    useState<CustomDeployInitialData | null>(null);
  const [mediaScreens, setMediaScreens] = useState<string[]>(
    app.screenshots ?? [],
  );
  const [mediaThumb, setMediaThumb] = useState<string | undefined>(undefined);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const { pushInstallProgress } = useSystemStatus({ fast: true });
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInstalled = Boolean(installedApp);
  const activeProgress =
    installProgress && installProgress.appId === app.id
      ? installProgress
      : null;
  const progressValue =
    activeProgress && typeof activeProgress.progress === "number"
      ? clamp(activeProgress.progress)
      : null;
  const progressPercent =
    progressValue !== null ? Math.round(progressValue * 100) : null;
  const isProgressActive = Boolean(
    activeProgress &&
      activeProgress.status !== "completed" &&
      activeProgress.status !== "error",
  );

  const handleQuickInstall = async () => {
    setInstalling(true);
    pushInstallProgress({
      appId: app.id,
      name: app.title || app.name,
      icon: app.icon,
      progress: 0,
      status: "starting",
      message: "Starting install…",
    });
    // Optimistic ticker while compose runs
    let optimistic = 0.08;
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      optimistic = Math.min(0.9, optimistic + 0.05);
      pushInstallProgress({
        appId: app.id,
        name: app.title || app.name,
        icon: app.icon,
        progress: optimistic,
        status: "running",
        message: "Installing…",
      });
    }, 1200);
    try {
      const config = getDefaultInstallConfig(app);
      const result = await installApp(app.id, config, {
        name: app.title || app.name,
        icon: app.icon,
      });

      if (result.success) {
        toast.success("Application installed successfully!");
        onInstallSuccess?.();
        await handleOpen();
        onOpenChange(false);
        pushInstallProgress({
          appId: app.id,
          name: app.title || app.name,
          icon: app.icon,
          progress: 1,
          status: "completed",
          message: "Installation complete",
        });
      } else {
        toast.error(result.error || "Failed to install application");
        pushInstallProgress({
          appId: app.id,
          name: app.title || app.name,
          icon: app.icon,
          progress: 1,
          status: "error",
          message: result.error || "Install failed",
        });
      }
    } catch (err: unknown) {
      // Error handled by toast
      toast.error("Failed to install application");
      pushInstallProgress({
        appId: app.id,
        name: app.title || app.name,
        icon: app.icon,
        progress: 1,
        status: "error",
        message: "Install failed",
      });
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setInstalling(false);
    }
  };

  const handleOpen = async () => {
    const url = await getAppWebUI(app.id);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error("Unable to determine app URL. Ensure the app is running.");
  };

  const handleCustomInstall = async () => {
    setLoadingCompose(true);
    try {
      let composeContent: string | undefined;

      if (app.composePath) {
        const result = await getAppComposeContent(app.composePath);
        if (result.success && result.content) {
          composeContent = result.content;
        }
      }

      setCustomDeployData({
        appName: app.id,
        dockerCompose: composeContent,
        dockerRun: app.container
          ? {
              image: app.container.image || "",
              containerName: app.id,
              ports: (app.container.ports || [])
                .map((p: any) =>
                  [p.published ?? p.host, p.container ?? p.target]
                    .filter(Boolean)
                    .join(":"),
                )
                .filter(Boolean)
                .join(","),
              volumes: (app.container.volumes || [])
                .map((v: any) =>
                  [v.source, v.container || v.target].filter(Boolean).join(":"),
                )
                .filter(Boolean)
                .join(","),
              env: (app.container.environment || [])
                .map((e: any) =>
                  typeof e === "string" ? e : `${e.key}=${e.value}`,
                )
                .filter(Boolean)
                .join(","),
            }
          : undefined,
        appIcon: app.icon,
        appTitle: app.title,
      });

      setCustomDeployOpen(true);
    } catch (error) {
      // Error handled by toast
      toast.error("Failed to load compose file");
    } finally {
      setLoadingCompose(false);
    }
  };

  useEffect(() => {
    const baseScreens = app.screenshots ?? [];
    setMediaScreens(baseScreens);
    setMediaThumb(undefined);

    // If we already have screenshots, no need to refetch unless dialog is opened
    if (!open) return;
    if (baseScreens.length > 0) return;

    setLoadingMedia(true);
    getAppMedia(app.id)
      .then((result) => {
        if (result.success) {
          setMediaScreens(result.screenshots ?? baseScreens);
          if (result.thumbnail) setMediaThumb(result.thumbnail);
        }
      })
      .catch(() => {
        // non-blocking, keep silent
      })
      .finally(() => setLoadingMedia(false));
  }, [app, open]);

  const screenshots = mediaScreens;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl md:max-w-fit w-full max-h-[90vh] bg-zinc-900/95 text-white border border-white/10 backdrop-blur-xl shadow-2xl p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 mb-4 max-w-full">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
                <Image
                  src={app.icon}
                  alt={app.title}
                  fill
                  className="object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/icons/default-app-icon.png";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0 w-full overflow-hidden">
                <DialogTitle className="text-xl sm:text-2xl font-bold mb-2 break-words">
                  {app.title}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base break-words">
                  {app.tagline}
                </DialogDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  {app.category.map((cat) => (
                    <Badge
                      key={cat}
                      variant="secondary"
                      className="bg-white/20 dark:bg-black/20 backdrop-blur-sm text-xs"
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[45vh] sm:max-h-[50vh] pr-2 sm:pr-4">
            <div className="space-y-4 max-w-full">
              {/* Description */}
              {app.overview && (
                <div className="max-w-full overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">
                    About
                  </h3>
                  <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">
                    {app.overview}
                  </p>
                </div>
              )}

              {/* Developer */}
              {app.developer && (
                <div className="max-w-full overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">
                    Developer
                  </h3>
                  <p className="text-xs sm:text-sm break-words">
                    {app.developer}
                  </p>
                </div>
              )}

              <AppScreenshots images={screenshots} loading={loadingMedia} />

              {/* Container Info (if available) */}
              {app.container && (
                <div className="max-w-full overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold mb-2">
                    Technical Details
                  </h3>
                  <div className="text-xs sm:text-sm space-y-1">
                    <p className="break-all overflow-wrap-anywhere">
                      <span className="font-medium">Image:</span>{" "}
                      {app.container.image}
                    </p>
                    {app.version && (
                      <p className="break-words">
                        <span className="font-medium">Version:</span>{" "}
                        {app.version}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-3 sm:mt-4">
            <div className="flex w-full items-center gap-2">
              {!isInstalled && (
                <Button
                  onClick={handleCustomInstall}
                  variant="outline"
                  size="icon"
                  className="border-white/30 bg-white/10 hover:bg-white/20"
                  title="Custom install"
                  disabled={loadingCompose}
                >
                  {loadingCompose ? (
                    <span className="h-4 w-4 block animate-spin border-2 border-white/60 border-t-transparent rounded-full" />
                  ) : (
                    <Settings2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                onClick={isInstalled ? handleOpen : handleQuickInstall}
                disabled={isInstalled ? false : installing || Boolean(isProgressActive)}
                variant="outline"
                className={`flex-1 bg-transparent shadow-none text-sm sm:text-base ${isInstalled
                  ? "border-emerald-300/40 text-emerald-100 hover:bg-emerald-500/10 hover:text-emerald-50"
                  : "border-white/20 text-white hover:bg-white/10 hover:text-white"
                }`}
              >
                {isInstalled ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </>
                ) : installing || isProgressActive ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {progressPercent !== null
                      ? `Installing ${progressPercent}%`
                      : "Installing..."}
                  </>
                ) : (
                  "Install"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {customDeployData && (
        <CustomDeployDialog
          open={customDeployOpen}
          onOpenChange={setCustomDeployOpen}
          initialData={customDeployData}
          onDeploySuccess={() => {
            setCustomDeployOpen(false);
            onOpenChange(false);
            onInstallSuccess?.();
          }}
        />
      )}
    </>
  );
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
