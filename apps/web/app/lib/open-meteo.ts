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

// MeteoAlarm weather alerts
export type AlertSeverity = "minor" | "moderate" | "severe" | "extreme";

export interface MeteoAlarmAlert {
  id: string;
  title: string;
  event: string;
  severity: AlertSeverity;
  certainty: string;
  urgency: string;
  areaDesc: string;
  onset: string;
  expires: string;
  effective: string;
  description?: string;
  instruction?: string;
  color: string;
  bgColor: string;
  icon: string;
}

const SEVERITY_COLORS: Record<AlertSeverity, { color: string; bgColor: string }> = {
  minor: { color: "#ca8a04", bgColor: "#fef9c3" },
  moderate: { color: "#ea580c", bgColor: "#fed7aa" },
  severe: { color: "#dc2626", bgColor: "#fecaca" },
  extreme: { color: "#7f1d1d", bgColor: "#ef4444" },
};

const EVENT_ICONS: Record<string, string> = {
  wind: "💨",
  rain: "🌧️",
  snow: "❄️",
  thunderstorm: "⛈️",
  fog: "🌫️",
  heat: "🔥",
  cold: "🥶",
  ice: "🧊",
  flood: "🌊",
  avalanche: "⛰️",
  default: "⚠️",
};

function getEventIcon(event: string): string {
  const eventLower = event.toLowerCase();
  if (eventLower.includes("wind") || eventLower.includes("wiatr")) return EVENT_ICONS.wind;
  if (eventLower.includes("rain") || eventLower.includes("deszcz") || eventLower.includes("opady")) return EVENT_ICONS.rain;
  if (eventLower.includes("snow") || eventLower.includes("śnieg")) return EVENT_ICONS.snow;
  if (eventLower.includes("thunder") || eventLower.includes("burz")) return EVENT_ICONS.thunderstorm;
  if (eventLower.includes("fog") || eventLower.includes("mgł")) return EVENT_ICONS.fog;
  if (eventLower.includes("heat") || eventLower.includes("upał")) return EVENT_ICONS.heat;
  if (eventLower.includes("cold") || eventLower.includes("mróz") || eventLower.includes("temperature")) return EVENT_ICONS.cold;
  if (eventLower.includes("ice") || eventLower.includes("lód") || eventLower.includes("gołoledź")) return EVENT_ICONS.ice;
  if (eventLower.includes("flood") || eventLower.includes("powódź")) return EVENT_ICONS.flood;
  if (eventLower.includes("avalanche") || eventLower.includes("lawina")) return EVENT_ICONS.avalanche;
  return EVENT_ICONS.default;
}

function mapSeverityToLevel(capSeverity: string): AlertSeverity {
  const sev = capSeverity.toLowerCase();
  if (sev === "extreme") return "extreme";
  if (sev === "severe") return "severe";
  if (sev === "moderate") return "moderate";
  return "minor";
}

export async function fetchMeteoAlarmAlerts(country: string = "poland"): Promise<MeteoAlarmAlert[]> {
  try {
    const response = await fetch(`https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${country}`);
    
    if (!response.ok) {
      console.error(`MeteoAlarm API error: ${response.status}`);
      return [];
    }
    
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const entries = xmlDoc.querySelectorAll("entry");
    const alerts: MeteoAlarmAlert[] = [];
    
    entries.forEach((entry) => {
      const id = entry.querySelector("id")?.textContent || "";
      const title = entry.querySelector("title")?.textContent || "";
      const event = entry.querySelector("cap\\:event, event")?.textContent || "";
      const areaDesc = entry.querySelector("cap\\:areaDesc, areaDesc")?.textContent || "";
      const severity = entry.querySelector("cap\\:severity, severity")?.textContent || "Minor";
      const certainty = entry.querySelector("cap\\:certainty, certainty")?.textContent || "";
      const urgency = entry.querySelector("cap\\:urgency, urgency")?.textContent || "";
      const onset = entry.querySelector("cap\\:onset, onset")?.textContent || "";
      const expires = entry.querySelector("cap\\:expires, expires")?.textContent || "";
      const effective = entry.querySelector("cap\\:effective, effective")?.textContent || "";
      
      const severityLevel = mapSeverityToLevel(severity);
      const colors = SEVERITY_COLORS[severityLevel];
      const icon = getEventIcon(event);
      
      alerts.push({
        id,
        title,
        event,
        severity: severityLevel,
        certainty,
        urgency,
        areaDesc,
        onset,
        expires,
        effective,
        ...colors,
        icon,
      });
    });
    
    // Sort by severity (most severe first)
    const severityOrder: Record<AlertSeverity, number> = {
      extreme: 0,
      severe: 1,
      moderate: 2,
      minor: 3,
    };
    
    return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  } catch (error) {
    console.error("Error fetching MeteoAlarm alerts:", error);
    return [];
  }
}

// Extended analytics data types
export interface AnalyticsHourly {
  time: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  dewpoint: number;
  pressure: number;
  cloudCover: number;
  visibility: number;
  windSpeed: number;
  windGusts: number;
  uvIndex: number;
  precipitation: number;
  precipitationProbability: number;
  solarRadiation: number;
  soilTemperature: number;
  soilMoisture: number;
  // Biomet data
  wetBulbTemp: number;
  vapourPressureDeficit: number;
}

export interface AnalyticsData {
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  hourly: AnalyticsHourly[];
  summary: {
    tempMin: number;
    tempMax: number;
    tempAvg: number;
    uvMax: number;
    windMax: number;
    precipTotal: number;
    sunshineHours: number;
  };
}

interface OpenMeteoAnalyticsResponse {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    dewpoint_2m: number[];
    pressure_msl: number[];
    cloud_cover: number[];
    visibility: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    uv_index: number[];
    precipitation: number[];
    precipitation_probability: number[];
    shortwave_radiation: number[];
    soil_temperature_0cm: number[];
    soil_moisture_0_to_1cm: number[];
    wet_bulb_temperature_2m: number[];
    vapour_pressure_deficit: number[];
  };
}

export async function fetchAnalyticsData(
  lat: number,
  lon: number,
  days = 3,
  pastDays = 1
): Promise<AnalyticsData> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "dewpoint_2m",
      "pressure_msl",
      "cloud_cover",
      "visibility",
      "wind_speed_10m",
      "wind_gusts_10m",
      "uv_index",
      "precipitation",
      "precipitation_probability",
      "shortwave_radiation",
      "soil_temperature_0cm",
      "soil_moisture_0_to_1cm",
      "wet_bulb_temperature_2m",
      "vapour_pressure_deficit",
    ].join(","),
    timezone: "auto",
    forecast_days: days.toString(),
    past_days: pastDays.toString(),
  });

  const response = await fetch(`${OPEN_METEO_BASE}/forecast?${params}`);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data: OpenMeteoAnalyticsResponse = await response.json();
  const h = data.hourly;

  const hourlyData: AnalyticsHourly[] = h.time.map((time, i) => ({
    time,
    temperature: h.temperature_2m[i],
    feelsLike: h.apparent_temperature[i],
    humidity: h.relative_humidity_2m[i],
    dewpoint: h.dewpoint_2m[i],
    pressure: h.pressure_msl[i],
    cloudCover: h.cloud_cover[i],
    visibility: h.visibility[i],
    windSpeed: h.wind_speed_10m[i],
    windGusts: h.wind_gusts_10m[i],
    uvIndex: h.uv_index[i],
    precipitation: h.precipitation[i],
    precipitationProbability: h.precipitation_probability[i],
    solarRadiation: h.shortwave_radiation[i],
    soilTemperature: h.soil_temperature_0cm[i],
    soilMoisture: h.soil_moisture_0_to_1cm[i],
    wetBulbTemp: h.wet_bulb_temperature_2m[i],
    vapourPressureDeficit: h.vapour_pressure_deficit[i],
  }));

  // Calculate summary stats
  const temps = hourlyData.map((h) => h.temperature);
  const uvs = hourlyData.map((h) => h.uvIndex).filter((v) => v > 0);
  const winds = hourlyData.map((h) => h.windSpeed);
  const precip = hourlyData.map((h) => h.precipitation);
  const solar = hourlyData.map((h) => h.solarRadiation).filter((v) => v > 0);

  return {
    location: {
      latitude: data.latitude,
      longitude: data.longitude,
      elevation: data.elevation,
      timezone: data.timezone,
    },
    hourly: hourlyData,
    summary: {
      tempMin: Math.min(...temps),
      tempMax: Math.max(...temps),
      tempAvg: temps.reduce((a, b) => a + b, 0) / temps.length,
      uvMax: uvs.length ? Math.max(...uvs) : 0,
      windMax: Math.max(...winds),
      precipTotal: precip.reduce((a, b) => a + b, 0),
      sunshineHours: solar.length / 2, // Rough estimate (hours with radiation)
    },
  };
}
