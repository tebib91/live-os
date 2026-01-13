'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getSettings } from '@/app/actions/settings';

interface WallpaperLayoutProps {
  children: React.ReactNode;
  className?: string;
  wallpaper?: string;
  onWallpaperLoaded?: (wallpaper: string) => void;
}

export function WallpaperLayout({
  children,
  className = '',
  wallpaper: externalWallpaper,
  onWallpaperLoaded
}: WallpaperLayoutProps) {
  const [internalWallpaper, setInternalWallpaper] = useState('/wallpapers/pexels-philippedonn.jpg');

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
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();

    // Listen for wallpaper change events
    const handleWallpaperChange = (event: CustomEvent<{ wallpaper: string }>) => {
      if (active) {
        setInternalWallpaper(event.detail.wallpaper);
      }
    };

    window.addEventListener('wallpaperChange', handleWallpaperChange as EventListener);

    return () => {
      active = false;
      window.removeEventListener('wallpaperChange', handleWallpaperChange as EventListener);
    };
  }, [externalWallpaper, onWallpaperLoaded]);

  return (
    <div className={`relative min-h-screen overflow-hidden ${className}`}>
      {/* Dynamic Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src={wallpaper}
          alt="LiveOS Background"
          priority
          fill
          sizes="100vw"
          className="object-cover"
          quality={100}
          unoptimized={wallpaper.startsWith('/wallpapers/')}
        />
      </div>

      {children}
    </div>
  );
}

// Utility function to trigger wallpaper change across all WallpaperLayout instances
export function changeWallpaper(wallpaper: string) {
  window.dispatchEvent(
    new CustomEvent('wallpaperChange', { detail: { wallpaper } })
  );
}
