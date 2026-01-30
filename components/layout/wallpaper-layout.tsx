"use client";

import { AnimatePresence, motion } from "framer-motion";
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
  const handleTransitionComplete = () => {
    if (!transitionWallpaper) return;
    setActiveWallpaper(transitionWallpaper);
  };

  const isLocalWallpaper = (path: string) => path.startsWith("/wallpapers/");

  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Dynamic Background Image */}
      <div className="fixed inset-0 -z-10">
        <AnimatePresence mode="sync">
          <motion.div
            key={activeWallpaper}
            initial={{ opacity: 0.8, scale: 1.05, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0.4, scale: 1.05, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={activeWallpaper}
              alt="LiveOS Background"
              priority
              fill
              sizes="100vw"
              className="object-cover"
              unoptimized={isLocalWallpaper(activeWallpaper)}
            />
          </motion.div>
        </AnimatePresence>

        {transitionWallpaper && (
          <motion.div
            key={transitionWallpaper}
            initial={{ opacity: 0.4, scale: 1.05, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0.4, scale: 1.05, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <Image
              src={transitionWallpaper}
              alt="LiveOS Background"
              fill
              sizes="100vw"
              priority
              className="object-cover"
              unoptimized={isLocalWallpaper(transitionWallpaper)}
              onLoadingComplete={handleTransitionComplete}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/30 animate-pulse pointer-events-none" />
          </motion.div>
        )}
      </div>

      {children}
    </div>
  );
}
