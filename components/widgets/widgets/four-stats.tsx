"use client";

import { StatText } from "../shared";
import type { FourStatsData } from "../types";

interface FourStatsProps {
  data: FourStatsData;
}

export function FourStatsWidget({ data }: FourStatsProps) {
  const { stats } = data;

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col justify-center">
          <StatText
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            color={stat.color}
            size="sm"
          />
        </div>
      ))}
    </div>
  );
}
