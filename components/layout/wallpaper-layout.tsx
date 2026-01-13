/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { getSettings } from "@/app/actions/settings";
import Image from "next/image";
import { useEffect, useState } from "react";

interface WallpaperLayoutProps {
  children: React.ReactNode;
  className?: string;
  wallpaper?: string;
  onWallpaperLoaded?: (wallpaper: string) => void;
}

export function WallpaperLayout({
  children,
  className = "",
  wallpaper: externalWallpaper,
  onWallpaperLoaded,
}: WallpaperLayoutProps) {
  const [internalWallpaper, setInternalWallpaper] = useState(
    "/wallpapers/pexels-philippedonn.jpg"
  );
  const [activeWallpaper, setActiveWallpaper] = useState(
    externalWallpaper || internalWallpaper
  );
  const [transitionWallpaper, setTransitionWallpaper] = useState<string | null>(
    null
  );
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Use external wallpaper if provided, otherwise use internal
  const wallpaper = externalWallpaper || internalWallpaper;

  useEffect(() => {
    // Only load settings if no external wallpaper is provided
    if (externalWallpaper) return;

    let active = true;

    const loadSettings = async () => {
      try {
        const settings = await getSettings();
        if (active && settings.currentWallpaper) {
          setInternalWallpaper(settings.currentWallpaper);
          onWallpaperLoaded?.(settings.currentWallpaper);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    };

    loadSettings();

    // Listen for wallpaper change events
    const handleWallpaperChange = (
      event: CustomEvent<{ wallpaper: string }>
    ) => {
      if (active) {
        setInternalWallpaper(event.detail.wallpaper);
      }
    };

    window.addEventListener(
      "wallpaperChange",
      handleWallpaperChange as EventListener
    );

    return () => {
      active = false;
      window.removeEventListener(
        "wallpaperChange",
        handleWallpaperChange as EventListener
      );
    };
  }, [externalWallpaper, onWallpaperLoaded]);

  // Trigger crossfade when wallpaper changes
  useEffect(() => {
    if (wallpaper === activeWallpaper || transitionWallpaper === wallpaper) {
      return;
    }

    setTransitionWallpaper(wallpaper);
    setIsTransitioning(true);
  }, [activeWallpaper, transitionWallpaper, wallpaper]);

  const handleTransitionComplete = () => {
    if (!transitionWallpaper) return;
    setActiveWallpaper(transitionWallpaper);
    setTransitionWallpaper(null);
    setIsTransitioning(false);
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

// Utility function to trigger wallpaper change across all WallpaperLayout instances
export function changeWallpaper(wallpaper: string) {
  window.dispatchEvent(
    new CustomEvent("wallpaperChange", { detail: { wallpaper } })
  );
}
