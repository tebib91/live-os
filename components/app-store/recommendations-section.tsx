"use client";

import Image from "next/image";
import { useState } from "react";
import type { App } from "./types";

interface RecommendationsSectionProps {
  recommendations: App[];
  onAppClick: (app: App) => void;
}

/**
 * Displays recommended apps based on category matching.
 * Shows up to 4 apps in a horizontal row.
 */
export function RecommendationsSection({
  recommendations,
  onAppClick,
}: RecommendationsSectionProps) {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-white/80">You might also like</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {recommendations.map((app) => (
          <RecommendationCard
            key={app.id}
            app={app}
            onClick={() => onAppClick(app)}
          />
        ))}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  app: App;
  onClick: () => void;
}

function RecommendationCard({ app, onClick }: RecommendationCardProps) {
  const [iconSrc, setIconSrc] = useState(app.icon);

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-24 flex flex-col items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-center"
    >
      <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
        <Image
          src={iconSrc}
          alt={app.title}
          fill
          className="object-cover"
          onError={() => setIconSrc("/default-application-icon.png")}
        />
      </div>
      <span className="text-xs text-white/80 font-medium line-clamp-2 leading-tight">
        {app.title}
      </span>
    </button>
  );
}
