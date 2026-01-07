# Telemetry Payload Contract (Protobuf)

This document defines the canonical telemetry payload used to transmit measurements
from stations (devices) to the backend.

**Canonical wire format (v1): Protobuf**
- Schema file: `proto/weathera/telemetry/v1/telemetry.proto`
- Message: `weathera.telemetry.v1.TelemetryBatch`

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
- Consumers MUST ignore unknown fields (forward compatibility).

---

## 2. Schema Identification

Every batch MUST include:
- `schema = "measurements.v1"`

Breaking changes require `measurements.v2`.

---

## 3. Protobuf Messages (v1)

### 3.1 TelemetryBatch

Fields (from `TelemetryBatch`):

| Field | Type | Required | Description |
|---|---|:---:|---|
| schema | string | yes | Must be `measurements.v1` |
| device_id | string | yes | Stable station identifier |
| sent_at_ms | uint64 | yes | Unix epoch milliseconds (UTC) when batch sent |
| seq | uint64 | yes | Monotonic per device (dedupe/replay protection) |
| fw | message | no | Firmware metadata |
| readings | repeated Reading | yes | Measurement readings |

### 3.2 Reading

Fields (from `Reading`):

| Field | Type | Required | Description |
|---|---|:---:|---|
| ts_ms | uint64 | yes | Unix epoch milliseconds (UTC) when measured |
| sensor_key | string | yes | Sensor identifier (unique within device) |
| metric | string | yes | What is being measured |
| unit | string | yes | Canonical unit |
| value | oneof | yes | Exactly one of: number/bool/string |
| window_ms | uint32 | no | Aggregation window for derived values |
| quality | enum | no | OK / SUSPECT / ERROR |
| error_code | string | no | Optional machine-readable detail |

---

## 4. Value Types (oneof)

Protobuf enforces a single value type via `oneof`:
- `number_value` (double)
- `bool_value` (bool)
- `string_value` (string)

Recommendation:
- Prefer numeric metrics for measurements.
- Use boolean for presence/absence signals (e.g., precipitation detected).
- Avoid complex object values in v1 (represent complex phenomena as multiple scalar metrics).

---

## 5. Identifier Semantics

### 5.1 device_id
Represents a physical station.

Rules:
- MUST be globally unique.
- MUST remain stable for the lifetime of the station.

Examples:
- `esp32-station-01`
- `station-balcony`
- `aa:bb:cc:dd:ee:ff`

### 5.2 sensor_key
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

## 6. Metric Naming

Rules:
- Use `snake_case`.
- Do not encode units in metric names.
- New custom metrics SHOULD be namespaced: `custom.my_metric`.

---

## 7. Recommended Metric Set

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

## 8. Canonical Units

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

## 9. Timestamping Rules

- All times MUST be UTC.
- `ts_ms` is the time the measurement was taken.
- `sent_at_ms` is the transmission time.
- If time is unreliable, set `quality = SUSPECT`.

---

## 10. Aggregation Window

For values computed over time (averages, gusts, rolling filters), include:
- `window_ms`

---

## 11. Compatibility Rules (Protobuf)

- Never change field numbers for existing fields.
- Only add new optional fields with new field numbers.
- If removing a field, reserve its field number (in future schema versions).
- Do not change a field’s type in-place; add a new field instead.