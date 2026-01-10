export const weatherCodes: {
    [key: number]: {
        icon: string;
        label: string;
    };
} = {
    0: {
        icon: "c01d",
        label: "Clear sky",
    },
    1: {
        icon: "c02d",
        label: "Mainly clear",
    },
    2: {
        icon: "c03d",
        label: "Partly cloudy",
    },
    3: {
        icon: "c04d",
        label: "Overcast",
    },
    45: {
        icon: "s05d",
        label: "Fog",
    },
    48: {
        icon: "s05d",
        label: "Deposite rime fog",
    },
    51: {
        icon: "d01d",
        label: "Drizzle",
    },
    53: {
        icon: "d01d",
        label: "Drizzle",
    },
    55: {
        icon: "d01d",
        label: "Drizzle",
    },
    56: {
        icon: "d01d",
        label: "Freezing Drizzle",
    },
    57: {
        icon: "d01d",
        label: "Freezing Drizzle",
    },
    61: {
        icon: "r01d",
        label: "Rain",
    },
    63: {
        icon: "r01d",
        label: "Rain",
    },
    65: {
        icon: "r01d",
        label: "Rain",
    },
    66: {
        icon: "f01d",
        label: "Freezing Rain",
    },
    67: {
        icon: "f01d",
        label: "Freezing Rain",
    },
    71: {
        icon: "s02d",
        label: "Snow",
    },
    73: {
        icon: "s02d",
        label: "Snow",
    },
    75: {
        icon: "s02d",
        label: "Snow",
    },
    77: {
        icon: "s02d",
        label: "Snow Grains",
    },
    80: {
        icon: "r02d",
        label: "Rain Showers",
    },
    81: {
        icon: "r02d",
        label: "Rain Showers",
    },
    82: {
        icon: "r02d",
        label: "Rain Showers",
    },
    85: {
        icon: "s01d",
        label: "Snow Showers",
    },
    86: {
        icon: "s01d",
        label: "Snow Showers",
    },
    95: {
        icon: "t04d",
        label: "Thunderstorm",
    },
    96: {
        icon: "t04d",
        label: "Thunderstorm",
    },
    99: {
        icon: "t04d",
        label: "Thunderstorm",
    },
};

export const humidityLevels = [
    {
        max: 20,
        message:
            "🏜️ The air is quite dry today with very low humidity. You might experience dry skin and irritation.",
    },
    {
        max: 40,
        message:
            "🌵 The humidity level is low. It's a relatively dry day, but comfortable for most activities.",
    },
    {
        max: 60,
        message:
            "🌤️ The humidity level is moderate. The air feels comfortable and pleasant.",
    },
    {
        max: 80,
        message:
            "🌧️ The humidity level is high. It might feel a bit muggy and sticky outside.",
        color: "#87CEEB",
    },
    {
        max: 100,
        message:
            "💧 The air is very humid today. Expect a heavy, damp feeling, and possible discomfort due to high moisture levels.",
    },
];