/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { getAppWebUI } from "@/app/actions/docker";
import type { InstalledApp } from "@/components/app-store/types";
import { Card } from "@/components/ui/card";
import type { InstalledApp as WSInstalledApp } from "@/hooks/system-status-types";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppContextMenu } from "./app-context-menu";

export function InstalledAppsGrid() {
  const { installedApps: wsApps, connected } = useSystemStatus();
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});

  // Convert WebSocket app format to component format
  const apps: InstalledApp[] = wsApps.map((wsApp: WSInstalledApp) => ({
    id: wsApp.id,
    appId: wsApp.appId,
    name: wsApp.name,
    icon: wsApp.icon || "/default-application-icon.png",
    status: wsApp.status,
    webUIPort: wsApp.webUIPort,
    containerName: wsApp.containerName,
    containers: wsApp.containers,
    installedAt: wsApp.installedAt,
  }));

  // Update icons when apps change (and replace placeholder with real icon if it arrives later)
  useEffect(() => {
    setAppIcons((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const app of apps) {
        if (app.icon && next[app.id] !== app.icon) {
          next[app.id] = app.icon;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [apps]);

  // Show loading state if not connected yet
  if (!connected && apps.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <p className="text-center text-sm text-white/80">
          Connecting to server...
        </p>
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="w-full max-w-5xl px-4">
        <p className="text-center text-sm text-white/80">
          No apps installed yet. Install apps from the App Store in the dock!
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl px-4">
      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
          },
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 sm:gap-5 max-h-[420px]"
      >
        {apps.map((app) => (
          <motion.div
            key={app.id}
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              show: { opacity: 1, scale: 1 },
            }}
          >
            <AppContextMenu app={app}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 18 }}
                className="relative"
                onClick={async () => {
                  try {
                    const url = await getAppWebUI(app.appId);
                    if (url) {
                      window.open(url, "_blank", "noopener,noreferrer");
                    } else {
                      toast.error(
                        "Unable to determine app URL. Ensure the app is running.",
                      );
                    }
                  } catch {
                    toast.error("Failed to open app");
                  }
                }}
              >
                <Card className="aspect-square flex flex-col items-center justify-center p-3 sm:p-4 gap-2 bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/15 transition-all cursor-pointer shadow-lg shadow-black/30">
                  {/* Status Indicator */}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-block w-3 h-3 rounded-full ring-2 ring-white/40 shadow ${
                        app.status === "running"
                          ? "bg-emerald-400 shadow-emerald-500/40"
                          : app.status === "stopped"
                            ? "bg-rose-400 shadow-rose-500/40"
                            : "bg-amber-300 shadow-amber-400/40"
                      }`}
                      title={app.status}
                    />
                  </div>

                  {/* App Icon */}
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                    <Image
                      src={appIcons[app.id] || "/default-application-icon.png"}
                      alt={app.name}
                      fill
                      className="object-contain rounded-2xl"
                      onError={() =>
                        setAppIcons((prev) => ({
                          ...prev,
                          [app.id]: "/default-application-icon.png",
                        }))
                      }
                    />
                  </div>

                  {/* App Name */}
                  <span className="text-xs sm:text-sm font-medium text-center truncate w-full text-white">
                    {app.name}
                  </span>
                </Card>
              </motion.div>
            </AppContextMenu>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
