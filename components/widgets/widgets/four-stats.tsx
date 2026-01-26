"use client";

import { StatText } from "../shared";
import type { FourStatsData } from "../types";

interface FourStatsProps {
  data: FourStatsData;
}

export function FourStatsWidget({ data }: FourStatsProps) {
  const { stats } = data;

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-2 h-full items-start p-3">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col justify-start gap-1">
          <StatText
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            color={stat.color}
            size="sm"
            className="gap-0.5"
          />
        </div>
      ))}
    </div>
  );
}
