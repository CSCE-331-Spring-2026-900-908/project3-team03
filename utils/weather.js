const COLLEGE_STATION = {
    latitude: 30.628,
    longitude: -96.3344,
    label: 'College Station, TX'
};

const WEATHER_CODE_LABELS = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    56: 'Freezing drizzle',
    57: 'Heavy freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Heavy freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Rain showers',
    81: 'Heavy showers',
    82: 'Violent showers',
    85: 'Snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm and hail',
    99: 'Severe thunderstorm'
};

let cachedWeather = null;
let cacheExpiresAt = 0;

function getWeatherLabel(code) {
    return WEATHER_CODE_LABELS[code] || 'Current weather';
}

async function fetchCollegeStationWeather() {
    const now = Date.now();

    if (cachedWeather && now < cacheExpiresAt) {
        return cachedWeather;
    }

    const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${COLLEGE_STATION.latitude}` +
        `&longitude=${COLLEGE_STATION.longitude}` +
        '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m' +
        '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FChicago';

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Weather request failed with ${response.status}`);
        }

        const payload = await response.json();
        const current = payload.current || {};

        cachedWeather = {
            available: true,
            location: COLLEGE_STATION.label,
            temperature: Math.round(current.temperature_2m),
            feelsLike: Math.round(current.apparent_temperature),
            windSpeed: Math.round(current.wind_speed_10m),
            summary: getWeatherLabel(current.weather_code),
            updatedAt: current.time || null
        };
        cacheExpiresAt = now + 10 * 60 * 1000;

        return cachedWeather;
    } catch (error) {
        console.error('Weather: Error fetching College Station weather:', error.message);

        return {
            available: false,
            location: COLLEGE_STATION.label,
            summary: 'Weather unavailable right now'
        };
    }
}

module.exports = {
    fetchCollegeStationWeather
};
