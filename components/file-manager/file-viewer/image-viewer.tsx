"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { getViewUrl } from "./types";
import type { FileViewerProps } from "./types";

/**
 * Image viewer component.
 * Displays images with zoom and loading states.
 */
export function ImageViewer({ item }: Omit<FileViewerProps, "onClose">) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const imageUrl = getViewUrl(item.path);

  return (
    <div className="relative flex items-center justify-center">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      )}

      {error ? (
        <div className="text-white/60 text-center p-8">
          <p>Failed to load image</p>
          <p className="text-sm text-white/40 mt-2">{item.name}</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={item.name}
          className={`
            max-w-[calc(100vw-80px)] max-h-[calc(100vh-120px)]
            object-contain rounded-lg shadow-2xl
            transition-transform duration-200
            ${zoomed ? "scale-150 cursor-zoom-out" : "cursor-zoom-in"}
            ${loading ? "opacity-0" : "opacity-100"}
          `}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          onClick={() => setZoomed(!zoomed)}
          draggable={false}
        />
      )}
    </div>
  );
}
