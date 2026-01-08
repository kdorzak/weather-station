# Open-Meteo Integration

## Purpose

Open-Meteo is used as an **external weather data provider** to complement data collected by the local weather station (ESP32-based devices).

The integration provides:
- weather forecasts
- model-based current conditions
- air quality and environmental context
- fallback data when local devices are offline
- reference data for comparison and validation

Open-Meteo was selected to keep the system:
- low-cost (free at low and medium scale)
- simple to operate
- independent from commercial lock-in
- suitable for long-running personal projects

---

## Why Open-Meteo

Open-Meteo was chosen over alternatives such as OpenWeather due to:

- no API key required
- no authentication or secret management
- generous and transparent rate limits
- high-quality data sources (ECMWF, NOAA, MeteoFrance)
- strong coverage in Europe
- permissive usage terms

This makes it particularly well-suited for serverless platforms such as Cloudflare Workers.

---

## Data Characteristics

- **Model-based data**, not direct station observations
- Suitable for:
  - forecasts
  - regional weather trends
  - comparison with local sensor readings
- Not intended to replace physical sensors, but to enrich them

---

## Intended Use in the Project

Open-Meteo data is used for:

1. **Forecasting**
   - short-term and multi-day forecasts
   - temperature, precipitation, wind, pressure

2. **Contextual Data**
   - air quality indices
   - environmental conditions beyond sensor capabilities

3. **Fallback**
   - providing approximate data when devices are offline
   - allowing the UI to remain functional

4. **Comparison**
   - validating local sensor readings
   - detecting anomalies or sensor drift

---

## Integration Architecture

Open-Meteo is accessed **only from the backend API**.

Web App -> API (Cloudflare Worker) -> Open-Meteo API

Clients never call Open-Meteo directly.

This allows:
- centralized caching
- consistent API contracts
- easy provider replacement in the future

---

## API Usage Pattern

The API will expose internal endpoints such as:

GET /external/open-meteo/forecast  
GET /external/open-meteo/current  

These endpoints:
- accept geographic coordinates
- call Open-Meteo
- normalize responses
- optionally merge with local sensor data
- apply caching

---

## Example Open-Meteo Request

https://api.open-meteo.com/v1/forecast  
?latitude=52.2297  
&longitude=21.0122  
&current=temperature_2m,relative_humidity_2m,pressure_msl  
&hourly=temperature_2m,precipitation  
&forecast_days=3  

---

## Caching Strategy

Because Open-Meteo data is model-based and updated periodically:

- responses SHOULD be cached
- cache TTL depends on endpoint:
  - current conditions: short TTL (5–10 minutes)
  - forecast: longer TTL (30–60 minutes)

Cloudflare Workers Cache API is the preferred mechanism.

---

## Error Handling

If Open-Meteo is unavailable:
- API should return a partial response when possible
- UI should indicate data source unavailability
- local sensor data should still be returned if available

Failures in Open-Meteo must not block the system.

---

## Future Considerations

Potential future enhancements:
- switching models (ECMWF vs NOAA)
- supporting historical data (via Meteostat)
- advanced comparison between model and sensor data
- alerting based on forecast vs observed conditions

The integration is intentionally designed to be **replaceable** without affecting clients.

---

## Summary

Open-Meteo provides a high-quality, free, and low-friction external weather data source that aligns well with the project goals:

- low operational cost
- minimal complexity
- long-term sustainability
- clean separation from core device data

It complements, rather than replaces, local weather station measurements.
