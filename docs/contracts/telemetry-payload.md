# Telemetry Payload Contract

This document defines the **canonical telemetry payload** used to transmit
measurements from stations (devices) to the backend.

This contract is intentionally:
- simple on the hot path (measurements)
- extensible (new metrics, sensors, stations)
- transport-agnostic (HTTP now, MQTT later)

---

## 1. Scope and Principles

- One **device (station)** may have many sensors.
- One sensor may produce one or more metrics.
- Devices send measurements in **batches**.
- Metadata (sensor details, calibration, location) is handled separately.
- Payloads must be forward-compatible.

---

## 2. Schema Identification

Every telemetry payload **MUST** include a schema identifier:

```
schema = "measurements.v1"
```

Breaking changes require a new schema (e.g. `measurements.v2`).

---

## 3. Batch Payload Structure (measurements.v1)

A device sends a batch of measurements collected over a short period.

```json
{
  "schema": "measurements.v1",
  "device_id": "esp32-station-01",
  "sent_at": "2026-01-07T12:34:56Z",
  "seq": 18421,
  "fw": {
    "name": "esp32-sensors",
    "version": "0.6.3"
  },
  "readings": [
    {
      "ts": "2026-01-07T12:34:50Z",
      "sensor_key": "temp_ambient_1",
      "metric": "temperature",
      "unit": "C",
      "value": 22.84,
      "quality": "ok"
    }
  ]
}
```

### 3.1 Top-level Fields

| Field | Type | Required | Description |
|---|---|:---:|---|
| schema | string | yes | Must be `measurements.v1` |
| device_id | string | yes | Stable identifier of the station |
| sent_at | RFC3339 timestamp | yes | Time the batch was sent |
| seq | integer | no | Monotonic counter per device (detect drops) |
| fw | object | no | Firmware metadata |
| readings | array | yes | List of measurement readings |

---

## 4. Reading Object

Each entry in `readings[]` represents **one measured value**.

| Field | Type | Required | Description |
|---|---|:---:|---|
| ts | RFC3339 timestamp | yes | Time of measurement (UTC) |
| sensor_key | string | yes | Sensor identity, unique within device |
| metric | string | yes | What is being measured |
| unit | string | yes | Canonical unit |
| value | any | yes | Measured value |
| value_type | string | no | `number` (default), `bool`, `string`, `object` |
| window_ms | integer | no | Aggregation window for derived values |
| quality | string | no | `ok`, `suspect`, `error` |
| error_code | string | no | Optional machine-readable detail |

---

## 5. Value Types

### 5.1 Numeric (default)

```json
{
  "metric": "temperature",
  "unit": "C",
  "value": 22.8
}
```

### 5.2 Boolean

Used for presence/absence signals.

```json
{
  "metric": "precip_detected",
  "unit": "bool",
  "value_type": "bool",
  "value": true
}
```

### 5.3 Object (rare)

Only when a sensor produces an inseparable multi-component value.

```json
{
  "metric": "wind",
  "unit": "mixed",
  "value_type": "object",
  "value": {
    "speed_mps": 3.2,
    "direction_deg": 250
  }
}
```

**Recommendation:** Prefer separate scalar metrics whenever possible.

---

## 6. Identifier Semantics

### 6.1 device_id

Represents a physical station.

Rules:
- MUST be globally unique.
- MUST remain stable for the lifetime of the station.

Examples:
- `esp32-station-01`
- `station-balcony`
- `aa:bb:cc:dd:ee:ff`

### 6.2 sensor_key

Logical sensor identifier, unique within a device.

Rules:
- MUST be stable once data exists.
- SHOULD represent role/location, not wiring details.

Examples:
- `temp_ambient_1`
- `temp_soil_1`
- `bme280_internal`
- `pms5003_1`

---

## 7. Metric Naming

Rules:
- Use `snake_case`.
- Do not encode units in metric names.
- New custom metrics SHOULD be namespaced: `custom.my_metric`.

---

## 8. Recommended Metric Set

This is a **recommended** (not exhaustive) registry.

### Environmental
- `temperature`
- `humidity`
- `pressure`
- `light`

### Wind
- `wind_speed`
- `wind_gust`
- `wind_direction`

### Precipitation
- `precip_detected`
- `precip_rate`
- `precip_total`

### Soil
- `soil_moisture`

### Air Quality
- `co2`
- `pm2_5`
- `pm10`
- `aqi`
- `voc`

New metrics may be added without schema changes.

---

## 9. Canonical Units

One canonical unit MUST be chosen per metric.

| Metric | Unit | Notes |
|---|---|---|
| temperature | C | Celsius |
| humidity | %RH | Relative humidity |
| pressure | Pa | Prefer Pa over hPa unless standardized |
| light | lx | Lux |
| wind_speed | m/s | |
| wind_gust | m/s | |
| wind_direction | deg | 0–360, meteorological |
| soil_moisture | % | Calibrated value |
| precip_detected | bool | Boolean |
| precip_rate | mm/h | |
| precip_total | mm | Since last reset |
| co2 | ppm | |
| pm2_5 | ug/m3 | |
| pm10 | ug/m3 | |
| aqi | index | Define standard in metadata |
| voc | ppb | Sensor-dependent |

---

## 10. Timestamping Rules

- All timestamps MUST be UTC.
- `ts` is the time the measurement was taken.
- `sent_at` is the transmission time.
- If time is unreliable, mark readings as `quality: "suspect"`.

---

## 11. Aggregation Window

For values computed over time (averages, gusts, rolling filters):

- include `window_ms`

Example:
```json
{
  "metric": "wind_gust",
  "unit": "m/s",
  "value": 7.8,
  "window_ms": 10000
}
```

---

## 12. MQTT Compatibility (Future)

Recommended topic:

```
v1/measurements/{device_id}
```

Payload is **identical** to the HTTP batch payload.

---

## 13. Forward Compatibility Rules

- Consumers MUST ignore unknown fields.
- Fields may be added but not redefined in v1.
- Breaking changes require `measurements.v2`.