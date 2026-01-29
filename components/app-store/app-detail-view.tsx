"use client";

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
import { AppScreenshots } from "./app-screenshots";
import type { App } from "./types";

type AppDetailViewProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app: App;
  isInstalled: boolean;
  screenshots: string[];
  loadingMedia: boolean;
  loadingCompose: boolean;
  installing: boolean;
  isProgressActive: boolean;
  progressPercent: number | null;
  onCustomInstall: () => void;
  onQuickInstall: () => void;
  onOpen: () => void;
};

export function AppDetailView({
  open,
  onOpenChange,
  app,
  isInstalled,
  screenshots,
  loadingMedia,
  loadingCompose,
  installing,
  isProgressActive,
  progressPercent,
  onCustomInstall,
  onQuickInstall,
  onOpen,
}: AppDetailViewProps) {
  return (
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
                <p className="text-xs sm:text-sm break-words">{app.developer}</p>
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
                      <span className="font-medium">Version:</span> {app.version}
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
                onClick={onCustomInstall}
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
              onClick={isInstalled ? onOpen : onQuickInstall}
              disabled={
                isInstalled ? false : installing || Boolean(isProgressActive)
              }
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
  );
}
