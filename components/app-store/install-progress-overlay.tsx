"use client";

import { progressBar, text, card } from "@/components/ui/design-tokens";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { InstallProgress } from "@/hooks/useSystemStatus";

interface InstallProgressOverlayProps {
  installs: InstallProgress[];
}

export function InstallProgressOverlay({ installs }: InstallProgressOverlayProps) {
  if (!installs.length) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex w-full max-w-xl flex-col gap-3 px-3">
      <AnimatePresence>
        {installs.map((install) => (
          <motion.div
            key={install.appId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              card.base,
              "flex items-center gap-3 rounded-2xl border border-white/15 bg-black/60 p-3 backdrop-blur-xl shadow-2xl"
            )}
          >
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <Image
                src={install.icon || "/default-application-icon.png"}
                alt={install.name}
                fill
                className="object-cover"
              />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {install.name}
                  </p>
                  <p className={cn(text.muted, "text-white/70")}>
                    {statusLabel(install)}
                  </p>
                </div>
                <span className="text-xs text-white/70">
                  {Math.round(clamp(install.progress) * 100)}%
                </span>
              </div>

              <div className={progressBar.track}>
                <div
                  className={cn(
                    progressBar.fill,
                    install.status === "error"
                      ? "bg-red-400"
                      : "bg-cyan-400"
                  )}
                  style={{ width: `${clamp(install.progress) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function statusLabel(install: InstallProgress) {
  if (install.status === "error") {
    return install.message || "Install failed";
  }
  if (install.status === "completed") {
    return "Completed";
  }
  return install.message || "Installing…";
}

function clamp(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
