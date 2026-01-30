"use client";

import { getAppWebUI } from "@/app/actions/docker";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Download, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import type { App, InstalledApp } from "./types";

interface AppListItemProps {
  app: App;
  installedApp?: InstalledApp | null;
  index?: number;
  onClick?: () => void;
}

/**
 * Minimal app list item for 3-column grid layout.
 * UmbrelOS-style: icon + name + tagline, no card borders.
 */
export function AppListItem({ app, installedApp, index = 0, onClick }: AppListItemProps) {
  const [iconSrc, setIconSrc] = useState(app.icon);
  const isInstalled = Boolean(installedApp);

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-white/5"
    >
      {/* App Icon */}
      <div className="relative h-12 w-12 flex-shrink-0 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
        <Image
          src={iconSrc}
          alt={app.title}
          fill
          className="object-cover"
          onError={() => setIconSrc("/default-application-icon.png")}
        />
        {/* Installed indicator */}
        {installedApp && (
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center ring-2 ring-zinc-900">
            <Check className="h-3 w-3 text-white" />
          </div>
        )}
      </div>

      {/* App Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white text-sm truncate group-hover:text-white/90">
          {app.title}
        </h4>
        <p className="text-xs text-white/50 line-clamp-1 mt-0.5">
          {app.tagline || app.overview || "No description"}
        </p>
      </div>

      {/* CTA + Store badge */}
      <div className="flex flex-col items-end gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={isInstalled ? handleOpen : onClick}
          className={`h-8 px-3 text-xs bg-transparent shadow-none ${isInstalled
            ? "border-emerald-300/40 text-emerald-100 hover:bg-emerald-500/10 hover:text-emerald-50"
            : "border-white/20 text-white hover:bg-white/10 hover:text-white"
          }`}
        >
          {isInstalled ? (
            <>
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Open
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5 mr-1" />
              Install
            </>
          )}
        </Button>
        {app.storeName && (
          <span className="text-[9px] leading-none text-white/50">
            {app.storeName}
          </span>
        )}
      </div>
    </motion.div>
  );
}
