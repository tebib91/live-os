"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import type { ViewerWrapperProps } from "./types";

/**
 * Wrapper component for file viewers.
 * Provides a dark overlay, close button, and navigation controls.
 */
export function ViewerWrapper({
  children,
  fileName,
  onClose,
  onDownload,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  disableSpacebarClose = false,
}: ViewerWrapperProps) {
  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (hasPrevious && onPrevious) {
            event.preventDefault();
            onPrevious();
          }
          break;
        case "ArrowRight":
          if (hasNext && onNext) {
            event.preventDefault();
            onNext();
          }
          break;
        case " ":
          if (!disableSpacebarClose) {
            event.preventDefault();
            onClose();
          }
          break;
      }
    },
    [onClose, onPrevious, onNext, hasPrevious, hasNext, disableSpacebarClose]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Handle click outside to close
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const overlay = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      {/* Header with file name and controls */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <h3 className="text-white font-medium truncate max-w-[60%]">
          {fileName}
        </h3>
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDownload}
              className="h-10 w-10 rounded-full text-white/80 hover:text-white hover:bg-white/10"
            >
              <Download className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation buttons */}
      {hasPrevious && onPrevious && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full text-white/80 hover:text-white hover:bg-white/10"
        >
          <ChevronLeft className="h-8 w-8" />
        </Button>
      )}

      {hasNext && onNext && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full text-white/80 hover:text-white hover:bg-white/10"
        >
          <ChevronRight className="h-8 w-8" />
        </Button>
      )}

      {/* Content */}
      <div
        className="max-w-[calc(100vw-80px)] max-h-[calc(100vh-120px)] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        Press ESC to close{hasPrevious || hasNext ? " • Arrow keys to navigate" : ""}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
