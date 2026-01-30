/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";

import { fetchWeatherData } from "@/lib/fetchWeatherData";

export function useWeatherData(lat: string, long: string) {
  const [temperatureChartData, setTemperatureChartData] = useState<any>(null);
  const [humidityChartData, setHumidityChartData] = useState<any>(null);
  const [precipitationSumChartData, setPrecipitationSumChartData] =
    useState<any>(null);
  const [
    precipitationProbabilityChartData,
    setPrecipitationProbabilityChartData,
  ] = useState<any>(null);

  const [weatherCode, setWeatherCode] = useState<number>(0);
  const [currentTemp, setCurrentTemp] = useState<number>(0);
  const [currentApparentTemp, setCurrentApparentTemp] = useState<number>(0);
  const [currentHumidity, setCurrentHumidity] = useState<number>(0);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchWeatherData(lat, long);

        const now = new Date();

        // Next 3 hours
        const next6Hours = data.hourly.time
          .map((t) => new Date(t))
          .filter(
            (t: Date) =>
              t > now && t <= new Date(now.getTime() + 3 * 60 * 60 * 1000),
          );

        // Next 24 hours
        const next24Hours = data.hourly.time
          .map((t) => new Date(t))
          .filter(
            (t: Date) =>
              t > now && t <= new Date(now.getTime() + 24 * 60 * 60 * 1000),
          );

        //   Temperature
        const currentTemp = data.current.temperature2m;
        const currentApparentTemp = data.current.apparentTemperature;
        const weatherCode = data.current.weatherCode;

        const temperatureData = data.hourly.temperature2m.slice(
          0,
          next24Hours.length,
        );
        const apparentTemperatureData = data.hourly.apparentTemperature.slice(
          0,
          next24Hours.length,
        );

        const temperatureChartData = next24Hours.map((t, index) => {
          const temperature = temperatureData[index].toFixed(1);
          const apparentTemperature = apparentTemperatureData[index].toFixed(1);

          return {
            date: t.toString(),
            temperature: temperature,
            apparent_temperature: apparentTemperature,
          };
        });

        setCurrentTemp(currentTemp);
        setWeatherCode(weatherCode);
        setCurrentApparentTemp(currentApparentTemp);
        setTemperatureChartData(temperatureChartData);

        //   Humidity
        const currentHumidity = data.current.relativeHumidity2m;

        const humidityData = Object.values(
          data.hourly.relativeHumidity2m,
        ).slice(0, next24Hours.length);

        const humidityChartData = next24Hours.map((t, index) => {
          const humidity = Math.round(humidityData[index]);

          return {
            date: t.toString(),
            humidity: humidity,
          };
        });

        setHumidityChartData(humidityChartData);
        setCurrentHumidity(currentHumidity);

        //   Precipitation Probability
        const precipitationData = Object.values(
          data.hourly.precipitationProbability,
        ).slice(0, next6Hours.length);

        const precipitationProbabilityChartData = next6Hours.map((t, index) => {
          const precipitationProbability = Math.round(precipitationData[index]);

          return {
            date: t.toString(),
            precipitationProbability: precipitationProbability,
          };
        });

        setPrecipitationProbabilityChartData(precipitationProbabilityChartData);

        // Precipitation Sum
        const precipitationSumData = Object.values(
          data.hourly.precipitation,
        ).slice(0, next24Hours.length);

        const precipitationSumChartData = next24Hours.map((t, index) => {
          const precipitationSum = precipitationSumData[index].toFixed(2);

          return {
            date: t.toString(),
            precipitation: precipitationSum,
          };
        });

        setPrecipitationSumChartData(precipitationSumChartData);
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lat, long]);

  return {
    temperatureChartData,
    humidityChartData,
    precipitationSumChartData,
    precipitationProbabilityChartData,
    weatherCode,
    currentTemp,
    currentApparentTemp,
    currentHumidity,
    error,
    loading,
  };
}
