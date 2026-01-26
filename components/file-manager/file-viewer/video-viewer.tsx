"use client";

import { useRef, useCallback, useEffect } from "react";
import { getViewUrl } from "./types";
import type { FileViewerProps } from "./types";

/**
 * Video viewer component with native HTML5 video player.
 * Supports keyboard controls (spacebar for play/pause).
 */
export function VideoViewer({ item }: Omit<FileViewerProps, "onClose">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = getViewUrl(item.path);

  // Handle spacebar for play/pause
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === " " && videoRef.current) {
      event.preventDefault();
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      autoPlay
      className="max-w-[calc(100vw-80px)] max-h-[calc(100vh-120px)] rounded-lg shadow-2xl bg-black"
      style={{ outline: "none" }}
    >
      Your browser does not support video playback.
    </video>
  );
}
