import { fetchWeatherApi } from "openmeteo";

const url = "https://api.open-meteo.com/v1/forecast";

const range = (start: number, stop: number, step: number) =>
    Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

export const fetchWeatherData = async (lat: string, long: string) => {
    const params = {
        latitude: parseFloat(lat),
        longitude: parseFloat(long),
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "weather_code",
        ],
        hourly: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
        ],
    };

    const responses = await fetchWeatherApi(url, params);

    const response = responses[0];

    const utcOffsetSeconds = response.utcOffsetSeconds();
    const timezone = response.timezone();
    const timezoneAbbreviation = response.timezoneAbbreviation();
    const latitude = response.latitude();
    const longitude = response.longitude();

    const current = response.current()!;
    const hourly = response.hourly()!;

    const weatherData = {
        current: {
            time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
            temperature2m: current.variables(0)!.value(),
            relativeHumidity2m: current.variables(1)!.value(),
            apparentTemperature: current.variables(2)!.value(),
            weatherCode: current.variables(3)!.value(),
        },
        hourly: {
            time: range(
                Number(hourly.time()),
                Number(hourly.timeEnd()),
                hourly.interval()
            ).map((t) => new Date((t + utcOffsetSeconds) * 1000)),
            temperature2m: hourly.variables(0)!.valuesArray()!,
            relativeHumidity2m: hourly.variables(1)!.valuesArray()!,
            apparentTemperature: hourly.variables(2)!.valuesArray()!,
            precipitationProbability: hourly.variables(3)!.valuesArray()!,
            precipitation: hourly.variables(4)!.valuesArray()!,
        },
    };

    return weatherData;
};