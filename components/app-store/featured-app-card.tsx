"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { App } from "./types";

interface FeaturedAppCardProps {
  app: App;
  index?: number;
  onClick?: () => void;
}

/**
 * Extract dominant colors from an image using canvas.
 * Returns [primary, secondary] colors as hex strings.
 */
function extractColors(img: HTMLImageElement): [string, string] {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return ["#3b82f6", "#8b5cf6"];

    canvas.width = 64;
    canvas.height = 64;
    ctx.drawImage(img, 0, 0, 64, 64);

    const imageData = ctx.getImageData(0, 0, 64, 64).data;
    const colorCounts: Record<string, number> = {};

    for (let i = 0; i < imageData.length; i += 16) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];

      if (a < 128) continue;
      if (r + g + b < 30 || r + g + b > 730) continue;

      const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    const sorted = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    const toHex = (rgb: string) => {
      const [r, g, b] = rgb.split(",").map(Number);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    };

    const primary = sorted[0] ? toHex(sorted[0][0]) : "#3b82f6";
    const secondary = sorted[1] ? toHex(sorted[1][0]) : "#8b5cf6";

    return [primary, secondary];
  } catch {
    return ["#3b82f6", "#8b5cf6"];
  }
}

export function FeaturedAppCard({ app, index = 0, onClick }: FeaturedAppCardProps) {
  const [iconSrc, setIconSrc] = useState(app.icon);
  const [colors, setColors] = useState<[string, string]>(["#24242499", "#18181899"]);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = app.icon;
    img.onload = () => {
      const extracted = extractColors(img);
      setColors(extracted);
    };
  }, [app.icon]);

  const gradientStyle = {
    background: `
      radial-gradient(circle farthest-side at 30% 10%, rgba(255,255,255,0.13), transparent),
      linear-gradient(135deg, ${colors[0]}dd 0%, ${colors[1]}cc 100%)
    `,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      className="group relative flex h-[180px] w-[280px] flex-shrink-0 cursor-pointer flex-col justify-end overflow-hidden rounded-3xl p-5 transition-transform hover:scale-[1.02]"
      style={gradientStyle}
    >
      {/* Subtle overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* App Icon - positioned at top */}
      <div className="absolute top-4 left-5 z-10">
        <div className="relative h-16 w-16 rounded-2xl overflow-hidden shadow-lg shadow-black/30 ring-1 ring-white/20">
          <Image
            ref={imgRef}
            src={iconSrc}
            alt={app.title}
            fill
            className="object-cover"
            onError={() => setIconSrc("/default-application-icon.png")}
          />
        </div>
      </div>
      {/* Store text */}
      {app.storeName && (
        <div className="absolute bottom-3 right-4 z-10">
          <span className="text-[9px] leading-none text-white/65">
            {app.storeName}
          </span>
        </div>
      )}

      {/* App Info - positioned at bottom */}
      <div className="relative z-10 space-y-1">
        <h3 className="text-lg font-bold text-white drop-shadow-md">
          {app.title}
        </h3>
        <p className="text-sm text-white/80 line-clamp-2 drop-shadow">
          {app.tagline || app.overview}
        </p>
      </div>
    </motion.div>
  );
}
