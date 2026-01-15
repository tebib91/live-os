"use client";

import Image from "next/image";
import { useState } from "react";

interface WallpaperLayoutProps {
  children: React.ReactNode;
  className?: string;
  wallpaper?: string;
}

export function WallpaperLayout({
  children,
  className = "",
  wallpaper: externalWallpaper,
}: WallpaperLayoutProps) {
  const fallbackWallpaper = "/wallpapers/pexels-philippedonn.jpg";
  const nextWallpaper = externalWallpaper || fallbackWallpaper;
  const [activeWallpaper, setActiveWallpaper] = useState(nextWallpaper);

  const transitionWallpaper =
    nextWallpaper !== activeWallpaper ? nextWallpaper : null;
  const isTransitioning = Boolean(transitionWallpaper);

  const handleTransitionComplete = () => {
    if (!transitionWallpaper) return;
    setActiveWallpaper(transitionWallpaper);
  };

  const isLocalWallpaper = (path: string) => path.startsWith("/wallpapers/");

  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Dynamic Background Image */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0">
          <Image
            src={activeWallpaper}
            alt="LiveOS Background"
            priority
            fill
            sizes="100vw"
            className={`object-cover transition-all duration-700 ${
              isTransitioning ? "opacity-0 scale-[1.02]" : "opacity-100"
            }`}
            quality={100}
            unoptimized={isLocalWallpaper(activeWallpaper)}
          />
        </div>

        {transitionWallpaper && (
          <div className="absolute inset-0">
            <Image
              src={transitionWallpaper}
              alt="LiveOS Background"
              fill
              sizes="100vw"
              priority
              className="object-cover opacity-100 transition-all duration-700"
              quality={100}
              unoptimized={isLocalWallpaper(transitionWallpaper)}
              onLoadingComplete={handleTransitionComplete}
            />
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
