'use client';

import { weatherCodes } from '@/constants';
import { useWeatherData } from '@/hooks/useWeatherData';
import { Cloud } from 'lucide-react';

export function WeatherInfo() {
    // Get weather data (San Francisco coordinates as default)
    // You can make this dynamic with user's location later
    const { currentTemp, weatherCode, loading, error } = useWeatherData('37.7749', '-122.4194');

    const weatherInfo = weatherCode !== undefined && weatherCodes[weatherCode];

    if (loading || error || !weatherInfo) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 mt-1.5">
            <Cloud className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 drop-shadow-sm">
                {Math.round(currentTemp)}°C · {weatherInfo.label}
            </span>
        </div>
    );
}
