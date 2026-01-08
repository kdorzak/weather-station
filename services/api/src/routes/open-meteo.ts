import { Handler, json, Env } from "../lib/http";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

// Default location: 50.01548560455507, 20.01632187262851
const DEFAULT_LAT = 50.01548560455507;
const DEFAULT_LON = 20.01632187262851;

// Cache TTLs in seconds
const CURRENT_CACHE_TTL = 5 * 60; // 5 minutes for current conditions
const FORECAST_CACHE_TTL = 30 * 60; // 30 minutes for forecast
const ANALYTICS_CACHE_TTL = 15 * 60; // 15 minutes for analytics

interface OpenMeteoCurrentResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: Record<string, string>;
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
}

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily_units: Record<string, string>;
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

// Weather code descriptions based on WMO standard
const weatherCodeDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

const getWeatherDescription = (code: number): string =>
  weatherCodeDescriptions[code] ?? "Unknown";

const getWeatherIcon = (code: number, isDay: boolean): string => {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 3) return isDay ? "⛅" : "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
};

// Cloudflare Workers cache type declaration
declare const caches: CacheStorage & { default: Cache };

async function fetchFromOpenMeteo<T>(
  endpoint: string,
  params: URLSearchParams,
  cacheSeconds: number
): Promise<{ data: T | null; error: string | null; cached: boolean }> {
  const url = `${OPEN_METEO_BASE}/${endpoint}?${params.toString()}`;

  try {
    // Check cache first (Cloudflare Workers Cache API)
    const cache = caches.default;
    const cacheKey = new Request(url);
    const cachedResponse = await cache.match(cacheKey);

    if (cachedResponse) {
      const data = (await cachedResponse.json()) as T;
      return { data, error: null, cached: true };
    }

    // Fetch from Open-Meteo
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return {
        data: null,
        error: `Open-Meteo returned ${response.status}: ${response.statusText}`,
        cached: false,
      };
    }

    const data = (await response.json()) as T;

    // Store in cache
    const cacheResponse = new Response(JSON.stringify(data), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${cacheSeconds}`,
      },
    });
    await cache.put(cacheKey, cacheResponse);

    return { data, error: null, cached: false };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Unknown error fetching Open-Meteo data",
      cached: false,
    };
  }
}

export const openMeteoCurrent: Handler = async (request, env) => {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? String(DEFAULT_LAT));
  const lon = parseFloat(url.searchParams.get("lon") ?? String(DEFAULT_LON));

  if (isNaN(lat) || isNaN(lon)) {
    return json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "rain",
      "showers",
      "snowfall",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "surface_pressure",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    timezone: "auto",
  });

  const { data, error, cached } = await fetchFromOpenMeteo<OpenMeteoCurrentResponse>(
    "forecast",
    params,
    CURRENT_CACHE_TTL
  );

  if (error || !data) {
    return json(
      { status: "error", error: error ?? "Failed to fetch current weather", source: "open-meteo" },
      { status: 502 }
    );
  }

  const current = data.current;
  const isDay = current.is_day === 1;

  return json({
    status: "ok",
    source: "open-meteo",
    cached,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
      timezone: data.timezone,
    },
    current: {
      time: current.time,
      temperature: current.temperature_2m,
      temperature_unit: "°C",
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      humidity_unit: "%",
      pressure: current.pressure_msl,
      pressure_unit: "hPa",
      wind_speed: current.wind_speed_10m,
      wind_speed_unit: "km/h",
      wind_direction: current.wind_direction_10m,
      wind_gusts: current.wind_gusts_10m,
      cloud_cover: current.cloud_cover,
      precipitation: current.precipitation,
      weather_code: current.weather_code,
      weather_description: getWeatherDescription(current.weather_code),
      weather_icon: getWeatherIcon(current.weather_code, isDay),
      is_day: isDay,
    },
  });
};

export const openMeteoForecast: Handler = async (request, env) => {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? String(DEFAULT_LAT));
  const lon = parseFloat(url.searchParams.get("lon") ?? String(DEFAULT_LON));
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "7", 10), 1), 16);

  if (isNaN(lat) || isNaN(lon)) {
    return json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "sunrise",
      "sunset",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    forecast_days: days.toString(),
  });

  const { data, error, cached } = await fetchFromOpenMeteo<OpenMeteoForecastResponse>(
    "forecast",
    params,
    FORECAST_CACHE_TTL
  );

  if (error || !data) {
    return json(
      { status: "error", error: error ?? "Failed to fetch forecast", source: "open-meteo" },
      { status: 502 }
    );
  }

  // Transform hourly data (next 24 hours)
  const hourlyData = data.hourly.time.slice(0, 24).map((time, i) => ({
    time,
    temperature: data.hourly.temperature_2m[i],
    humidity: data.hourly.relative_humidity_2m[i],
    precipitation_probability: data.hourly.precipitation_probability[i],
    precipitation: data.hourly.precipitation[i],
    weather_code: data.hourly.weather_code[i],
    weather_description: getWeatherDescription(data.hourly.weather_code[i]),
    weather_icon: getWeatherIcon(data.hourly.weather_code[i], true),
    wind_speed: data.hourly.wind_speed_10m[i],
  }));

  // Transform daily data
  const dailyData = data.daily.time.map((time, i) => ({
    date: time,
    temperature_max: data.daily.temperature_2m_max[i],
    temperature_min: data.daily.temperature_2m_min[i],
    sunrise: data.daily.sunrise[i],
    sunset: data.daily.sunset[i],
    precipitation_sum: data.daily.precipitation_sum[i],
    precipitation_probability: data.daily.precipitation_probability_max[i],
    weather_code: data.daily.weather_code[i],
    weather_description: getWeatherDescription(data.daily.weather_code[i]),
    weather_icon: getWeatherIcon(data.daily.weather_code[i], true),
    wind_speed_max: data.daily.wind_speed_10m_max[i],
  }));

  return json({
    status: "ok",
    source: "open-meteo",
    cached,
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
      timezone: data.timezone,
    },
    hourly: hourlyData,
    daily: dailyData,
  });
};

// Extended analytics response type
interface OpenMeteoAnalyticsResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  hourly_units: Record<string, string>;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    dewpoint_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    rain: number[];
    snowfall: number[];
    snow_depth: number[];
    weather_code: number[];
    pressure_msl: number[];
    surface_pressure: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
    evapotranspiration: number[];
    vapour_pressure_deficit: number[];
    wind_speed_10m: number[];
    wind_speed_80m: number[];
    wind_direction_10m: number[];
    wind_direction_80m: number[];
    wind_gusts_10m: number[];
    uv_index: number[];
    uv_index_clear_sky: number[];
    sunshine_duration: number[];
    shortwave_radiation: number[];
    direct_radiation: number[];
    diffuse_radiation: number[];
    direct_normal_irradiance: number[];
    terrestrial_radiation: number[];
    soil_temperature_0cm: number[];
    soil_temperature_6cm: number[];
    soil_temperature_18cm: number[];
    soil_moisture_0_to_1cm: number[];
    soil_moisture_1_to_3cm: number[];
    soil_moisture_3_to_9cm: number[];
    cape: number[];
    freezing_level_height: number[];
    is_day: number[];
  };
  daily_units: Record<string, string>;
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
    daylight_duration: number[];
    sunshine_duration: number[];
    uv_index_max: number[];
    uv_index_clear_sky_max: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    snowfall_sum: number[];
    precipitation_hours: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    shortwave_radiation_sum: number[];
    evapotranspiration: number[];
  };
}

// UV Index risk levels
const getUVRiskLevel = (uv: number): { level: string; color: string } => {
  if (uv < 3) return { level: "Low", color: "#4ade80" };
  if (uv < 6) return { level: "Moderate", color: "#facc15" };
  if (uv < 8) return { level: "High", color: "#fb923c" };
  if (uv < 11) return { level: "Very High", color: "#ef4444" };
  return { level: "Extreme", color: "#7c3aed" };
};

// Air quality comfort based on humidity and temperature
const getComfortIndex = (temp: number, humidity: number): { level: string; score: number } => {
  // Heat index approximation
  if (temp < 10) return { level: "Cold", score: 30 };
  if (temp > 35) return { level: "Hot", score: 20 };
  if (humidity > 80 && temp > 25) return { level: "Muggy", score: 40 };
  if (humidity < 30 && temp > 20) return { level: "Dry", score: 60 };
  if (temp >= 18 && temp <= 26 && humidity >= 30 && humidity <= 60) return { level: "Ideal", score: 100 };
  return { level: "Comfortable", score: 80 };
};

export const openMeteoAnalytics: Handler = async (request, env) => {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") ?? String(DEFAULT_LAT));
  const lon = parseFloat(url.searchParams.get("lon") ?? String(DEFAULT_LON));
  const days = Math.min(Math.max(parseInt(url.searchParams.get("days") ?? "7", 10), 1), 16);
  const pastDays = Math.min(Math.max(parseInt(url.searchParams.get("past_days") ?? "2", 10), 0), 7);

  if (isNaN(lat) || isNaN(lon)) {
    return json({ error: "Invalid coordinates" }, { status: 400 });
  }

  // Comprehensive hourly variables
  const hourlyVars = [
    "temperature_2m",
    "relative_humidity_2m",
    "dewpoint_2m",
    "apparent_temperature",
    "precipitation_probability",
    "precipitation",
    "rain",
    "snowfall",
    "snow_depth",
    "weather_code",
    "pressure_msl",
    "surface_pressure",
    "cloud_cover",
    "cloud_cover_low",
    "cloud_cover_mid",
    "cloud_cover_high",
    "visibility",
    "evapotranspiration",
    "vapour_pressure_deficit",
    "wind_speed_10m",
    "wind_speed_80m",
    "wind_direction_10m",
    "wind_direction_80m",
    "wind_gusts_10m",
    "uv_index",
    "uv_index_clear_sky",
    "sunshine_duration",
    "shortwave_radiation",
    "direct_radiation",
    "diffuse_radiation",
    "direct_normal_irradiance",
    "terrestrial_radiation",
    "soil_temperature_0cm",
    "soil_temperature_6cm",
    "soil_temperature_18cm",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
    "soil_moisture_3_to_9cm",
    "cape",
    "freezing_level_height",
    "is_day",
  ];

  // Comprehensive daily variables
  const dailyVars = [
    "weather_code",
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "daylight_duration",
    "sunshine_duration",
    "uv_index_max",
    "uv_index_clear_sky_max",
    "precipitation_sum",
    "rain_sum",
    "snowfall_sum",
    "precipitation_hours",
    "precipitation_probability_max",
    "wind_speed_10m_max",
    "wind_gusts_10m_max",
    "wind_direction_10m_dominant",
    "shortwave_radiation_sum",
    "et0_fao_evapotranspiration",
  ];

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: hourlyVars.join(","),
    daily: dailyVars.join(","),
    timezone: "auto",
    forecast_days: days.toString(),
    past_days: pastDays.toString(),
  });

  const { data, error, cached } = await fetchFromOpenMeteo<OpenMeteoAnalyticsResponse>(
    "forecast",
    params,
    ANALYTICS_CACHE_TTL
  );

  if (error || !data) {
    return json(
      { status: "error", error: error ?? "Failed to fetch analytics data", source: "open-meteo" },
      { status: 502 }
    );
  }

  const h = data.hourly;
  const d = data.daily;

  // Transform hourly data with all metrics
  const hourlyData = h.time.map((time, i) => ({
    time,
    is_day: h.is_day[i] === 1,
    weather: {
      code: h.weather_code[i],
      description: getWeatherDescription(h.weather_code[i]),
      icon: getWeatherIcon(h.weather_code[i], h.is_day[i] === 1),
    },
    temperature: {
      actual: h.temperature_2m[i],
      feels_like: h.apparent_temperature[i],
      dewpoint: h.dewpoint_2m[i],
    },
    humidity: h.relative_humidity_2m[i],
    precipitation: {
      probability: h.precipitation_probability[i],
      total: h.precipitation[i],
      rain: h.rain[i],
      snowfall: h.snowfall[i],
      snow_depth: h.snow_depth[i],
    },
    pressure: {
      sea_level: h.pressure_msl[i],
      surface: h.surface_pressure[i],
    },
    wind: {
      speed_10m: h.wind_speed_10m[i],
      speed_80m: h.wind_speed_80m[i],
      direction_10m: h.wind_direction_10m[i],
      direction_80m: h.wind_direction_80m[i],
      gusts: h.wind_gusts_10m[i],
    },
    clouds: {
      total: h.cloud_cover[i],
      low: h.cloud_cover_low[i],
      mid: h.cloud_cover_mid[i],
      high: h.cloud_cover_high[i],
    },
    visibility: h.visibility[i],
    uv: {
      index: h.uv_index[i],
      clear_sky: h.uv_index_clear_sky[i],
      risk: getUVRiskLevel(h.uv_index[i]),
    },
    solar: {
      shortwave: h.shortwave_radiation[i],
      direct: h.direct_radiation[i],
      diffuse: h.diffuse_radiation[i],
      dni: h.direct_normal_irradiance[i],
      terrestrial: h.terrestrial_radiation[i],
      sunshine_duration: h.sunshine_duration[i],
    },
    soil: {
      temperature_surface: h.soil_temperature_0cm[i],
      temperature_6cm: h.soil_temperature_6cm[i],
      temperature_18cm: h.soil_temperature_18cm[i],
      moisture_0_1cm: h.soil_moisture_0_to_1cm[i],
      moisture_1_3cm: h.soil_moisture_1_to_3cm[i],
      moisture_3_9cm: h.soil_moisture_3_to_9cm[i],
    },
    atmospheric: {
      evapotranspiration: h.evapotranspiration[i],
      vapour_pressure_deficit: h.vapour_pressure_deficit[i],
      cape: h.cape[i],
      freezing_level: h.freezing_level_height[i],
    },
    comfort: getComfortIndex(h.temperature_2m[i], h.relative_humidity_2m[i]),
  }));

  // Transform daily data
  const dailyData = d.time.map((date, i) => ({
    date,
    weather: {
      code: d.weather_code[i],
      description: getWeatherDescription(d.weather_code[i]),
      icon: getWeatherIcon(d.weather_code[i], true),
    },
    temperature: {
      max: d.temperature_2m_max[i],
      min: d.temperature_2m_min[i],
      feels_like_max: d.apparent_temperature_max[i],
      feels_like_min: d.apparent_temperature_min[i],
    },
    sun: {
      sunrise: d.sunrise[i],
      sunset: d.sunset[i],
      daylight_duration: d.daylight_duration[i],
      sunshine_duration: d.sunshine_duration[i],
    },
    uv: {
      max: d.uv_index_max[i],
      clear_sky_max: d.uv_index_clear_sky_max[i],
      risk: getUVRiskLevel(d.uv_index_max[i]),
    },
    precipitation: {
      sum: d.precipitation_sum[i],
      rain: d.rain_sum[i],
      snow: d.snowfall_sum[i],
      hours: d.precipitation_hours[i],
      probability_max: d.precipitation_probability_max[i],
    },
    wind: {
      speed_max: d.wind_speed_10m_max[i],
      gusts_max: d.wind_gusts_10m_max[i],
      direction_dominant: d.wind_direction_10m_dominant[i],
    },
    solar: {
      radiation_sum: d.shortwave_radiation_sum[i],
    },
  }));

  // Compute summary statistics
  const currentHour = hourlyData.find((h) => new Date(h.time) >= new Date()) ?? hourlyData[0];
  const todayData = dailyData[pastDays] ?? dailyData[0];

  // Find extremes in the dataset
  const temps = hourlyData.map((h) => h.temperature.actual).filter((v) => v != null);
  const uvValues = hourlyData.map((h) => h.uv.index).filter((v) => v != null && v > 0);
  const windSpeeds = hourlyData.map((h) => h.wind.speed_10m).filter((v) => v != null);
  const solarValues = hourlyData.map((h) => h.solar.shortwave).filter((v) => v != null && v > 0);

  const summary = {
    temperature: {
      current: currentHour?.temperature.actual,
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((a, b) => a + b, 0) / temps.length,
    },
    uv: {
      current: currentHour?.uv.index,
      max: uvValues.length ? Math.max(...uvValues) : 0,
      max_risk: getUVRiskLevel(uvValues.length ? Math.max(...uvValues) : 0),
    },
    wind: {
      current: currentHour?.wind.speed_10m,
      max: Math.max(...windSpeeds),
      avg: windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length,
    },
    solar: {
      current: currentHour?.solar.shortwave,
      max: solarValues.length ? Math.max(...solarValues) : 0,
      total_today: todayData?.solar.radiation_sum ?? 0,
    },
    comfort: currentHour?.comfort,
    today: todayData,
  };

  return json({
    status: "ok",
    source: "open-meteo",
    cached,
    generated_at: new Date().toISOString(),
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
      timezone: data.timezone,
    },
    summary,
    hourly: hourlyData,
    daily: dailyData,
    units: {
      temperature: "°C",
      humidity: "%",
      precipitation: "mm",
      pressure: "hPa",
      wind_speed: "km/h",
      visibility: "m",
      radiation: "W/m²",
      soil_moisture: "m³/m³",
      uv_index: "index",
    },
  });
};
