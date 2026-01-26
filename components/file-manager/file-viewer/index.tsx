"use client";

import type { FileSystemItem } from "@/app/actions/filesystem";
import { useMemo, useCallback } from "react";
import { ViewerWrapper } from "./viewer-wrapper";
import { ImageViewer } from "./image-viewer";
import { getViewerType, getDownloadUrl } from "./types";

export { isFileViewable, getViewerType } from "./types";

interface FileViewerProps {
  /** The file to view */
  item: FileSystemItem;
  /** Close the viewer */
  onClose: () => void;
  /** All items in the current directory (for navigation) */
  allItems?: FileSystemItem[];
  /** Callback when navigating to another file */
  onNavigate?: (item: FileSystemItem) => void;
}

/**
 * Main file viewer component.
 * Automatically selects the appropriate viewer based on file type.
 */
export function FileViewer({
  item,
  onClose,
  allItems = [],
  onNavigate,
}: FileViewerProps) {
  const viewerType = getViewerType(item.name);

  // Get viewable items for navigation
  const viewableItems = useMemo(() => {
    return allItems.filter(
      (i) => i.type === "file" && getViewerType(i.name) === "image",
    );
  }, [allItems]);

  // Find current index and navigation state
  const currentIndex = viewableItems.findIndex((i) => i.path === item.path);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < viewableItems.length - 1;

  const handlePrevious = useCallback(() => {
    if (hasPrevious && onNavigate) {
      onNavigate(viewableItems[currentIndex - 1]);
    }
  }, [hasPrevious, onNavigate, viewableItems, currentIndex]);

  const handleNext = useCallback(() => {
    if (hasNext && onNavigate) {
      onNavigate(viewableItems[currentIndex + 1]);
    }
  }, [hasNext, onNavigate, viewableItems, currentIndex]);

  const handleDownload = () => {
    window.open(getDownloadUrl(item.path), "_blank");
  };

  // Only images should render in the fullscreen viewer; others are handled elsewhere
  if (viewerType !== "image") return null;

  // Determine if spacebar should close (not for video/audio)
  const disableSpacebarClose = false;

  return (
    <ViewerWrapper
      fileName={item.name}
      onClose={onClose}
      onDownload={handleDownload}
      onPrevious={hasPrevious ? handlePrevious : undefined}
      onNext={hasNext ? handleNext : undefined}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      disableSpacebarClose={disableSpacebarClose}
    >
      <ImageViewer item={item} />
    </ViewerWrapper>
  );
}

/**
 * Fallback for unsupported file types.
 */
// intentionally removed; non-image types are handled elsewhere
