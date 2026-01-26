"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, ExternalLink, Sparkles } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AppDetailDialog } from "./app-detail-dialog";
import type { App, InstalledApp } from "./types";
import { getAppWebUI } from "@/app/actions/docker";
import { toast } from "sonner";

interface AppCardProps {
  app: App;
  installedApp?: InstalledApp | null;
  onInstallSuccess?: () => void;
}

export function AppCard({ app, installedApp, onInstallSuccess }: AppCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [iconSrc, setIconSrc] = useState(app.icon);

  const handleOpen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = await getAppWebUI(app.id);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Unable to determine app URL. Ensure the app is running.");
    }
  };

  return (
    <>
      <Card className="group relative overflow-hidden border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/0 text-white backdrop-blur-xl shadow-2xl shadow-black/30 transition-all hover:-translate-y-1 hover:border-white/30 hover:shadow-black/50 h-full flex flex-col">
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-blue-500/10 via-cyan-400/10 to-transparent" />

        <div
          onClick={() => setIsDetailOpen(true)}
          className="relative p-5 space-y-4 cursor-pointer flex-1"
        >
          <div className="flex items-start gap-4">
            {/* App Icon */}
            <div className="relative w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden border border-white/15 bg-white/10 shadow-inner shadow-black/30">
              <Image
                src={iconSrc}
                alt={app.title}
                fill
                className="object-cover"
                onError={() => setIconSrc("/default-application-icon.png")}
              />
            </div>

            {/* App Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-white">
                  {app.title}
                </h3>
                {app.version && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide border border-white/10 text-white/70">
                    v{app.version}
                  </span>
                )}
              </div>

              <p className="text-sm text-zinc-200/90 line-clamp-2 leading-relaxed">
                {app.tagline || app.overview || "No description available"}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {app.category?.slice(0, 2).map((cat, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-white/80"
                  >
                    <Sparkles className="h-3 w-3 text-blue-200" />
                    {cat}
                  </span>
                ))}
                {app.developer && (
                  <span className="text-xs text-white/60 truncate">
                    by {app.developer}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Install Button */}
          <div className="flex items-center justify-between gap-3 pt-1 px-5 pb-4">
            <Button
              onClick={
                installedApp
                  ? handleOpen
                  : (e) => {
                      e.stopPropagation();
                      setIsDetailOpen(true);
                    }
              }
              className="w-full bg-white/15 hover:bg-white/25 text-white border border-white/20 shadow-lg shadow-black/20"
              size="sm"
            >
              {installedApp ? (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Install
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      <AppDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        app={app}
        installedApp={installedApp ?? undefined}
        onInstallSuccess={() => {
          onInstallSuccess?.();
        }}
      />
    </>
  );
}
