"use client";

import { WallpaperLayout } from "@/components/layout/wallpaper-layout";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AuthShellProps = {
  badge: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
};

export function AuthShell({
  badge,
  title,
  subtitle,
  icon,
  children,
  footer,
  widthClass = "max-w-3xl",
}: AuthShellProps) {
  return (
    <WallpaperLayout>
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div
          className={cn(
            "w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl shadow-black/50",
            widthClass,
          )}
        >
          <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-gradient-to-r from-white/10 via-white/5 to-transparent">
            <div className="flex items-center gap-4">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-white/70">
                {badge}
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  {icon}
                  <h1 className="text-2xl font-semibold text-white drop-shadow-sm">
                    {title}
                  </h1>
                </div>
                {subtitle && (
                  <p className="text-sm text-white/60">{subtitle}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-8">{children}</div>

          {footer && (
            <div className="border-t border-white/5 bg-white/5 px-8 py-5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </WallpaperLayout>
  );
}
