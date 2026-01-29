"use client";

import { ViewerWrapper } from "@/components/file-manager/file-viewer/viewer-wrapper";
import Image from "next/image";
import { useMemo, useState } from "react";

interface AppScreenshotsProps {
  images: string[];
  loading?: boolean;
}

export function AppScreenshots({ images, loading = false }: AppScreenshotsProps) {
  const validImages = useMemo(
    () => images.filter((img) => typeof img === "string" && img.length > 0),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const clampedActiveIndex = useMemo(() => {
    if (activeIndex === null) return null;
    if (validImages.length === 0) return null;
    if (activeIndex > validImages.length - 1) return validImages.length - 1;
    return activeIndex;
  }, [activeIndex, validImages.length]);

  if (validImages.length === 0) {
    return loading ? (
      <p className="text-xs text-white/60">Loading previews…</p>
    ) : null;
  }

  return (
    <div>
      <h3 className="text-base sm:text-lg font-semibold mb-2">Screenshots</h3>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2">
        {validImages.map((screenshot, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="relative w-32 h-20 sm:w-48 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
            title="Open preview"
          >
            <Image
              src={screenshot}
              alt={`Screenshot ${index + 1}`}
              fill
              className="object-cover"
              sizes="200px"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/icons/default-app-icon.png";
              }}
              unoptimized
            />
          </button>
        ))}
      </div>

      {clampedActiveIndex !== null && (
        <ViewerWrapper
          fileName={`Screenshot ${clampedActiveIndex + 1}`}
          onClose={() => setActiveIndex(null)}
          disableSpacebarClose
          onPrevious={
            clampedActiveIndex > 0
              ? () =>
                setActiveIndex((idx) => {
                  if (idx === null) return 0;
                  return idx > 0 ? idx - 1 : idx;
                })
              : undefined
          }
          onNext={
            clampedActiveIndex < validImages.length - 1
              ? () =>
                setActiveIndex((idx) => {
                  if (idx === null) return 0;
                  return idx < validImages.length - 1 ? idx + 1 : idx;
                })
              : undefined
          }
          hasPrevious={clampedActiveIndex > 0}
          hasNext={clampedActiveIndex < validImages.length - 1}
        >
          <div className="relative w-screen max-w-[96vw] h-[80vh]">
            <Image
              src={validImages[clampedActiveIndex]}
              alt={`Screenshot ${clampedActiveIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/icons/default-app-icon.png";
              }}
            />
          </div>
        </ViewerWrapper>
      )}
    </div>
  );
}
