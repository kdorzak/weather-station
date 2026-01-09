"use client";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const DEFAULT_LAT = 50.01548560455507;
const DEFAULT_LON = 20.01632187262851;

// Weather code descriptions (WMO standard)
const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: "Clear sky", icon: "☀️" },
  1: { description: "Mainly clear", icon: "🌤️" },
  2: { description: "Partly cloudy", icon: "⛅" },
  3: { description: "Overcast", icon: "☁️" },
  45: { description: "Fog", icon: "🌫️" },
  48: { description: "Rime fog", icon: "🌫️" },
  51: { description: "Light drizzle", icon: "🌧️" },
  53: { description: "Drizzle", icon: "🌧️" },
  55: { description: "Dense drizzle", icon: "🌧️" },
  61: { description: "Slight rain", icon: "🌧️" },
  63: { description: "Rain", icon: "🌧️" },
  65: { description: "Heavy rain", icon: "🌧️" },
  71: { description: "Slight snow", icon: "🌨️" },
  73: { description: "Snow", icon: "🌨️" },
  75: { description: "Heavy snow", icon: "❄️" },
  77: { description: "Snow grains", icon: "❄️" },
  80: { description: "Rain showers", icon: "🌦️" },
  81: { description: "Rain showers", icon: "🌦️" },
  82: { description: "Heavy showers", icon: "⛈️" },
  85: { description: "Snow showers", icon: "🌨️" },
  86: { description: "Heavy snow showers", icon: "🌨️" },
  95: { description: "Thunderstorm", icon: "⛈️" },
  96: { description: "Thunderstorm with hail", icon: "⛈️" },
  99: { description: "Heavy thunderstorm", icon: "⛈️" },
};

export const getWeatherInfo = (code: number, isDay = true) => {
  const info = WEATHER_CODES[code] ?? { description: "Unknown", icon: "🌡️" };
  // Adjust icon for night
  if (!isDay && code === 0) return { ...info, icon: "🌙" };
  if (!isDay && code <= 3) return { ...info, icon: "☁️" };
  return info;
};

export interface CurrentWeather {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  cloudCover: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  isDay: boolean;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  humidity: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  windSpeed: number;
}

export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  sunrise: string;
  sunset: string;
  precipitationSum: number;
  precipitationProbability: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  windSpeedMax: number;
}

export interface WeatherData {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    pressure_msl: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    cloud_cover: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
}

export async function fetchWeatherData(
  lat = DEFAULT_LAT,
  lon = DEFAULT_LON
): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
      "cloud_cover",
      "precipitation",
      "weather_code",
      "is_day",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "precipitation_sum",
      "precipitation_probability_max",
      "weather_code",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
  });

  const response = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoResponse = await response.json();

  const current = data.current!;
  const isDay = current.is_day === 1;
  const currentWeather = getWeatherInfo(current.weather_code, isDay);

  // Get next 24 hours of hourly data
  const now = new Date();
  const hourlyData = data.hourly!.time
    .map((time, i) => ({
      time,
      temperature: data.hourly!.temperature_2m[i],
      humidity: data.hourly!.relative_humidity_2m[i],
      precipitationProbability: data.hourly!.precipitation_probability[i],
      precipitation: data.hourly!.precipitation[i],
      weatherCode: data.hourly!.weather_code[i],
      ...getWeatherInfo(data.hourly!.weather_code[i]),
      weatherDescription: getWeatherInfo(data.hourly!.weather_code[i]).description,
      weatherIcon: getWeatherInfo(data.hourly!.weather_code[i]).icon,
      windSpeed: data.hourly!.wind_speed_10m[i],
    }))
    .filter((h) => new Date(h.time) >= now)
    .slice(0, 24);

  const dailyData = data.daily!.time.map((date, i) => {
    const weather = getWeatherInfo(data.daily!.weather_code[i]);
    return {
      date,
      temperatureMax: data.daily!.temperature_2m_max[i],
      temperatureMin: data.daily!.temperature_2m_min[i],
      sunrise: data.daily!.sunrise[i],
      sunset: data.daily!.sunset[i],
      precipitationSum: data.daily!.precipitation_sum[i],
      precipitationProbability: data.daily!.precipitation_probability_max[i],
      weatherCode: data.daily!.weather_code[i],
      weatherDescription: weather.description,
      weatherIcon: weather.icon,
      windSpeedMax: data.daily!.wind_speed_10m_max[i],
    };
  });

  return {
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
      timezone: data.timezone,
    },
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      pressure: current.pressure_msl,
      windSpeed: current.wind_speed_10m,
      windDirection: current.wind_direction_10m,
      windGusts: current.wind_gusts_10m,
      cloudCover: current.cloud_cover,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
      weatherDescription: currentWeather.description,
      weatherIcon: currentWeather.icon,
      isDay,
    },
    hourly: hourlyData,
    daily: dailyData,
  };
}

export { DEFAULT_LAT, DEFAULT_LON };

