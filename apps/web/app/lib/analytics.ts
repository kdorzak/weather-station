// Analytics data module - separated from open-meteo.ts

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";

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

// Analytics utility functions
export function filterAnalyticsByTimeRange(
  data: AnalyticsData,
  startDate: Date,
  endDate: Date
): AnalyticsHourly[] {
  return data.hourly.filter(h => {
    const time = new Date(h.time);
    return time >= startDate && time <= endDate;
  });
}

export function getAnalyticsSummaryForPeriod(
  data: AnalyticsData,
  startDate: Date,
  endDate: Date
): Partial<AnalyticsData['summary']> {
  const periodData = filterAnalyticsByTimeRange(data, startDate, endDate);
  
  if (periodData.length === 0) {
    return {
      tempMin: 0,
      tempMax: 0,
      tempAvg: 0,
      uvMax: 0,
      windMax: 0,
      precipTotal: 0,
      sunshineHours: 0,
    };
  }

  const temps = periodData.map((h) => h.temperature);
  const uvs = periodData.map((h) => h.uvIndex).filter((v) => v > 0);
  const winds = periodData.map((h) => h.windSpeed);
  const precip = periodData.map((h) => h.precipitation);
  const solar = periodData.map((h) => h.solarRadiation).filter((v) => v > 0);

  return {
    tempMin: Math.min(...temps),
    tempMax: Math.max(...temps),
    tempAvg: temps.reduce((a, b) => a + b, 0) / temps.length,
    uvMax: uvs.length ? Math.max(...uvs) : 0,
    windMax: Math.max(...winds),
    precipTotal: precip.reduce((a, b) => a + b, 0),
    sunshineHours: solar.length / 2,
  };
}

export function findHourlyDataByTime(
  data: AnalyticsData,
  targetTime: Date
): AnalyticsHourly | null {
  const closest = data.hourly.reduce((closest, current) => {
    const closestDiff = Math.abs(new Date(closest.time).getTime() - targetTime.getTime());
    const currentDiff = Math.abs(new Date(current.time).getTime() - targetTime.getTime());
    return currentDiff < closestDiff ? current : closest;
  });

  return closest;
}
