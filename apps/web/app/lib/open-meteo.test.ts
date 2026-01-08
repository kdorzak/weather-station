import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchWeatherData, getWeatherInfo } from "./open-meteo";

describe("open-meteo", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getWeatherInfo", () => {
    it("returns clear sky for code 0 during day", () => {
      const result = getWeatherInfo(0, true);
      expect(result.description).toBe("Clear sky");
      expect(result.icon).toBe("☀️");
    });

    it("returns moon icon for code 0 at night", () => {
      const result = getWeatherInfo(0, false);
      expect(result.icon).toBe("🌙");
    });

    it("returns rain for code 63", () => {
      const result = getWeatherInfo(63);
      expect(result.description).toBe("Rain");
      expect(result.icon).toBe("🌧️");
    });

    it("returns snow for code 73", () => {
      const result = getWeatherInfo(73);
      expect(result.description).toBe("Snow");
      expect(result.icon).toBe("🌨️");
    });

    it("returns thunderstorm for code 95", () => {
      const result = getWeatherInfo(95);
      expect(result.description).toBe("Thunderstorm");
      expect(result.icon).toBe("⛈️");
    });

    it("returns unknown for invalid code", () => {
      const result = getWeatherInfo(999);
      expect(result.description).toBe("Unknown");
    });
  });

  describe("fetchWeatherData", () => {
    it("fetches and transforms weather data correctly", async () => {
      const mockResponse = {
        latitude: 50.015,
        longitude: 20.016,
        elevation: 200,
        timezone: "Europe/Warsaw",
        current: {
          time: "2024-01-15T12:00",
          temperature_2m: 5.5,
          apparent_temperature: 3.2,
          relative_humidity_2m: 75,
          pressure_msl: 1013,
          wind_speed_10m: 15,
          wind_direction_10m: 180,
          wind_gusts_10m: 25,
          cloud_cover: 50,
          precipitation: 0,
          weather_code: 2,
          is_day: 1,
        },
        hourly: {
          time: ["2024-01-15T12:00", "2024-01-15T13:00"],
          temperature_2m: [5.5, 6.0],
          relative_humidity_2m: [75, 72],
          precipitation_probability: [10, 15],
          precipitation: [0, 0],
          weather_code: [2, 2],
          wind_speed_10m: [15, 12],
        },
        daily: {
          time: ["2024-01-15"],
          temperature_2m_max: [8],
          temperature_2m_min: [2],
          sunrise: ["2024-01-15T07:30"],
          sunset: ["2024-01-15T16:30"],
          precipitation_sum: [0],
          precipitation_probability_max: [20],
          weather_code: [2],
          wind_speed_10m_max: [20],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await fetchWeatherData(50.015, 20.016);

      expect(result.location.latitude).toBe(50.015);
      expect(result.location.longitude).toBe(20.016);
      expect(result.current.temperature).toBe(5.5);
      expect(result.current.weatherDescription).toBe("Partly cloudy");
      expect(result.daily).toHaveLength(1);
      expect(result.daily[0].temperatureMax).toBe(8);
    });

    it("throws error on API failure", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      await expect(fetchWeatherData()).rejects.toThrow("Open-Meteo API error: 500");
    });
  });
});
