"use client";

import { ProgressArc } from "../shared";
import { colors } from "@/components/ui/design-tokens";
import type { TwoStatsGaugeData } from "../types";

interface TwoStatsGaugeProps {
  data: TwoStatsGaugeData;
}

const defaultColors = [colors.cpu, colors.memory];

export function TwoStatsGaugeWidget({ data }: TwoStatsGaugeProps) {
  const { stats } = data;

  return (
    <div className="flex h-full items-center justify-around p-3">
      {stats.map((stat, index) => (
        <ProgressArc
          key={index}
          value={stat.value}
          displayValue={stat.displayValue}
          label={stat.label}
          color={stat.color || defaultColors[index]}
          size={90}
          strokeWidth={7}
        />
      ))}
    </div>
  );
}
