"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getViewUrl } from "./types";
import type { FileViewerProps } from "./types";

/**
 * PDF viewer component using iframe embed.
 * Falls back to download link if embed fails.
 */
export function PdfViewer({ item }: Omit<FileViewerProps, "onClose">) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const pdfUrl = getViewUrl(item.path);

  const openInNewTab = () => {
    window.open(pdfUrl, "_blank");
  };

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
        <p className="text-white/60">Unable to preview PDF in browser</p>
        <Button onClick={openInNewTab} className="bg-white/10 hover:bg-white/20">
          <ExternalLink className="w-4 h-4 mr-2" />
          Open in new tab
        </Button>
      </div>
    );
  }

  return (
    <div className="relative w-[80vw] h-[80vh] max-w-5xl rounded-lg overflow-hidden bg-white shadow-2xl">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
        </div>
      )}

      <iframe
        src={pdfUrl}
        className="w-full h-full"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        title={item.name}
      />
    </div>
  );
}
