"use client";

import { StatText } from "../shared";
import type { ThreeStatsData } from "../types";

interface ThreeStatsProps {
  data: ThreeStatsData;
}

export function ThreeStatsWidget({ data }: ThreeStatsProps) {
  const { stats } = data;

  return (
    <div className="flex h-full items-center justify-between gap-4 p-3">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="flex-1 flex flex-col items-center text-center"
        >
          <StatText
            label={stat.label}
            value={stat.value}
            subtext={stat.subtext}
            color={stat.color}
            size="md"
            className="items-center"
          />
        </div>
      ))}
    </div>
  );
}
