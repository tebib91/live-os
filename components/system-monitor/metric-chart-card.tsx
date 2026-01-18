"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { card, text, statusDot } from "@/components/ui/design-tokens";
import type { ChartDataPoint } from "./types";

interface MetricChartCardProps {
  label: string;
  value: string;
  unit?: string;
  subtitle?: string;
  color: string;
  gradientId: string;
  data: ChartDataPoint[];
  selected?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function MetricChartCard({
  label,
  value,
  unit,
  subtitle,
  color,
  gradientId,
  data,
  selected = false,
  clickable = false,
  onClick,
}: MetricChartCardProps) {
  const baseClass = `${card.base} ${card.padding.md}`;
  const clickableClass = clickable
    ? `cursor-pointer transition-all ${card.hover}`
    : "";
  const selectedClass = selected ? card.selected : "";

  return (
    <div
      className={`${baseClass} ${clickableClass} ${selectedClass}`}
      onClick={clickable ? onClick : undefined}
    >
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className={text.labelUppercase}>{label}</div>
          <div className="flex items-center gap-1">
            <div className={statusDot.base} style={{ backgroundColor: color }} />
            <span className={text.label}>Live</span>
          </div>
        </div>

        {/* Value */}
        <div className={text.valueLarge}>
          {value}
          {unit && (
            <span className="text-sm font-normal text-white/40"> {unit}</span>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && <div className={text.label}>{subtitle}</div>}

        {/* Mini Chart */}
        <div className="h-12 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
