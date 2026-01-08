"use client";

const apiBase =
  (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787").replace(/\/$/, "");

const defaultInit: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { ...defaultInit, ...init });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.message ?? body?.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

export async function fetchMe() {
  return request<
    | { status: "ok"; user: { email: string }; csrf_token: string }
    | { status: "unauthenticated" }
  >("/auth/me");
}

export async function fetchChartData() {
  return request<{
    status: "ok";
    device_id: string;
    updated_at: string;
    series: { metric: string; label: string; unit: string; data: { ts: string; value: number }[] }[];
  }>("/v1/chart-data");
}

export async function login(email: string) {
  return request<{ status: "ok"; user: { email: string }; session_id: string; csrf_token: string }>(
    "/auth/login",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    }
  );
}

export async function logout() {
  return request<{ status: "ok" }>("/auth/logout", { method: "POST" });
}

// Open-Meteo types
export interface OpenMeteoCurrentResponse {
  status: "ok";
  source: string;
  cached: boolean;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  current: {
    time: string;
    temperature: number;
    temperature_unit: string;
    feels_like: number;
    humidity: number;
    humidity_unit: string;
    pressure: number;
    pressure_unit: string;
    wind_speed: number;
    wind_speed_unit: string;
    wind_direction: number;
    wind_gusts: number;
    cloud_cover: number;
    precipitation: number;
    weather_code: number;
    weather_description: string;
    weather_icon: string;
    is_day: boolean;
  };
}

export interface OpenMeteoForecastResponse {
  status: "ok";
  source: string;
  cached: boolean;
  location: {
    latitude: number;
    longitude: number;
    elevation: number;
    timezone: string;
  };
  hourly: Array<{
    time: string;
    temperature: number;
    humidity: number;
    precipitation_probability: number;
    precipitation: number;
    weather_code: number;
    weather_description: string;
    weather_icon: string;
    wind_speed: number;
  }>;
  daily: Array<{
    date: string;
    temperature_max: number;
    temperature_min: number;
    sunrise: string;
    sunset: string;
    precipitation_sum: number;
    precipitation_probability: number;
    weather_code: number;
    weather_description: string;
    weather_icon: string;
    wind_speed_max: number;
  }>;
}

// Default location
const DEFAULT_LAT = 50.01548560455507;
const DEFAULT_LON = 20.01632187262851;

export async function fetchOpenMeteoCurrent(lat = DEFAULT_LAT, lon = DEFAULT_LON) {
  return request<OpenMeteoCurrentResponse>(
    `/external/open-meteo/current?lat=${lat}&lon=${lon}`
  );
}

export async function fetchOpenMeteoForecast(lat = DEFAULT_LAT, lon = DEFAULT_LON, days = 7) {
  return request<OpenMeteoForecastResponse>(
    `/external/open-meteo/forecast?lat=${lat}&lon=${lon}&days=${days}`
  );
}

// Analytics types
export interface AnalyticsHourlyData {
  time: string;
  is_day: boolean;
  weather: { code: number; description: string; icon: string };
  temperature: { actual: number; feels_like: number; dewpoint: number };
  humidity: number;
  precipitation: { probability: number; total: number; rain: number; snowfall: number; snow_depth: number };
  pressure: { sea_level: number; surface: number };
  wind: { speed_10m: number; speed_80m: number; direction_10m: number; direction_80m: number; gusts: number };
  clouds: { total: number; low: number; mid: number; high: number };
  visibility: number;
  uv: { index: number; clear_sky: number; risk: { level: string; color: string } };
  solar: { shortwave: number; direct: number; diffuse: number; dni: number; terrestrial: number; sunshine_duration: number };
  soil: { temperature_surface: number; temperature_6cm: number; temperature_18cm: number; moisture_0_1cm: number; moisture_1_3cm: number; moisture_3_9cm: number };
  atmospheric: { evapotranspiration: number; vapour_pressure_deficit: number; cape: number; freezing_level: number };
  comfort: { level: string; score: number };
}

export interface AnalyticsDailyData {
  date: string;
  weather: { code: number; description: string; icon: string };
  temperature: { max: number; min: number; feels_like_max: number; feels_like_min: number };
  sun: { sunrise: string; sunset: string; daylight_duration: number; sunshine_duration: number };
  uv: { max: number; clear_sky_max: number; risk: { level: string; color: string } };
  precipitation: { sum: number; rain: number; snow: number; hours: number; probability_max: number };
  wind: { speed_max: number; gusts_max: number; direction_dominant: number };
  solar: { radiation_sum: number };
}

export interface OpenMeteoAnalyticsResponse {
  status: "ok";
  source: string;
  cached: boolean;
  generated_at: string;
  location: { latitude: number; longitude: number; elevation: number; timezone: string };
  summary: {
    temperature: { current: number; min: number; max: number; avg: number };
    uv: { current: number; max: number; max_risk: { level: string; color: string } };
    wind: { current: number; max: number; avg: number };
    solar: { current: number; max: number; total_today: number };
    comfort: { level: string; score: number };
    today: AnalyticsDailyData;
  };
  hourly: AnalyticsHourlyData[];
  daily: AnalyticsDailyData[];
  units: Record<string, string>;
}

export async function fetchOpenMeteoAnalytics(
  lat = DEFAULT_LAT,
  lon = DEFAULT_LON,
  days = 7,
  pastDays = 2
) {
  return request<OpenMeteoAnalyticsResponse>(
    `/external/open-meteo/analytics?lat=${lat}&lon=${lon}&days=${days}&past_days=${pastDays}`
  );
}
