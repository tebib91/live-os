"use client";

import { text } from "@/components/ui/design-tokens";
import { weatherCodes } from "@/constants";
import { useWeatherData } from "@/hooks/useWeatherData";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import type { WeatherWidgetData } from "../types";

type WeatherIconKey =
  | "sun"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

interface WeatherWidgetProps {
  data: WeatherWidgetData;
}

export function WeatherWidget({ data }: WeatherWidgetProps) {
  const { location, latitude, longitude } = data;
  const {
    currentTemp,
    currentApparentTemp,
    currentHumidity,
    weatherCode,
    loading,
    error,
  } = useWeatherData(latitude, longitude);

  const code = Number.isFinite(weatherCode) ? Math.round(weatherCode) : undefined;
  const weatherInfo = code !== undefined ? weatherCodes[code] : undefined;
  const iconKey = useMemo(() => getWeatherIconKey(code), [code]);
  const Icon = WEATHER_ICONS[iconKey];

  const isUnavailable = loading || !!error;
  const tempDisplay = isUnavailable ? "--" : Math.round(currentTemp);
  const feelsDisplay = isUnavailable ? "--" : Math.round(currentApparentTemp);
  const humidityDisplay = isUnavailable ? "--" : Math.round(currentHumidity);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent" />
      <div className="absolute -left-10 -bottom-10 h-24 w-24 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/5 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-black/20"
            >
              <Icon className="h-7 w-7 text-cyan-100 drop-shadow-md" />
            </motion.div>
            <div className="flex flex-col">
              <span className={cn(text.label, "uppercase tracking-wider")}>
                Weather
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-white">
                  {tempDisplay}
                  {tempDisplay === "--" ? "" : "°C"}
                </span>
                <span className={cn(text.muted, "text-sm text-white/70")}>
                  {weatherInfo?.label ?? (loading ? "Updating..." : "Unavailable")}
                </span>
              </div>
              <span className="text-sm text-white/70">{location}</span>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 px-3 py-2 text-right">
            <p className={text.label}>Feels like</p>
            <p className="text-xl font-semibold text-white/90">
              {feelsDisplay === "--" ? "—" : `${feelsDisplay}°`}
            </p>
            <p className={cn(text.muted, "text-xs")}>
              Humidity {humidityDisplay === "--" ? "—" : `${humidityDisplay}%`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <p className={text.labelUppercase}>Condition</p>
            <p className="text-sm font-semibold text-white">
              {weatherInfo?.label ?? (isUnavailable ? "Waiting for data" : "Updating...")}
            </p>
          </div>
          <div className="rounded-lg bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Live update
              </span>
              <span>{weatherInfo ? "Now" : "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getWeatherIconKey(code?: number): WeatherIconKey {
  if (code === undefined) return "cloud";

  if (code === 0 || code === 1) return "sun";
  if (code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";

  return "cloud";
}
