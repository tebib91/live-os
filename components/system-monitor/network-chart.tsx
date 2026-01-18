"use client";

import { card, colors, statusDot, text } from "@/components/ui/design-tokens";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import type { ChartDataPoint } from "./types";
import { formatMbps } from "./utils";

interface NetworkChartProps {
  uploadHistory: ChartDataPoint[];
  downloadHistory: ChartDataPoint[];
  currentUpload: number;
  currentDownload: number;
}

export function NetworkChart({
  uploadHistory,
  downloadHistory,
  currentUpload,
  currentDownload,
}: NetworkChartProps) {
  const chartData = (() => {
    const length = Math.max(uploadHistory.length, downloadHistory.length);
    return Array.from({ length }, (_, idx) => ({
      upload: uploadHistory[idx]?.value ?? 0,
      download: downloadHistory[idx]?.value ?? 0,
    }));
  })();

  const maxValue =
    chartData.reduce(
      (max, point) => Math.max(max, point.upload, point.download),
      0
    ) || 0;
  const yMax = Math.max(1, Math.ceil(maxValue * 1.1));
  const yTicks = [0, yMax / 2, yMax];

  return (
    <div className={`${card.base} ${card.padding.md}`}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className={text.valueSmall}>Network Activity</h3>
          <p className={text.label}>Real-time bandwidth usage</p>
        </div>
        <div className="flex gap-4 text-xs text-white/60">
          {/* Upload */}
          <div className="flex items-center gap-1.5">
            <div
              className={statusDot.base}
              style={{ backgroundColor: colors.network.upload }}
            />
            <span>Upload</span>
            <span className="text-white/80 font-semibold">
              {formatMbps(currentUpload)}
            </span>
            <span className="text-white/50">Mbit/s</span>
          </div>
          {/* Download */}
          <div className="flex items-center gap-1.5">
            <div
              className={statusDot.base}
              style={{ backgroundColor: colors.network.download }}
            />
            <span>Download</span>
            <span className="text-white/80 font-semibold">
              {formatMbps(currentDownload)}
            </span>
            <span className="text-white/50">Mbit/s</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 12, right: 0, left: 2, bottom: 8 }}
          >
            <defs>
              <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colors.network.upload}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={colors.network.upload}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="downloadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colors.network.download}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={colors.network.download}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <YAxis
              orientation="left"
              tick={{
                fill: "rgba(255,255,255,0.8)",
                fontSize: 11,
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              width={40}
              domain={[0, yMax]}
              ticks={yTicks}
              tickFormatter={(v) => `${formatMbps(v)} `}
            />
            <Area
              type="monotone"
              dataKey="upload"
              stroke={colors.network.upload}
              fill="url(#uploadGradient)"
              strokeWidth={2}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="download"
              stroke={colors.network.download}
              fill="url(#downloadGradient)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
