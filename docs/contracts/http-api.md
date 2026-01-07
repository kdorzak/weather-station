# HTTP API Contract (v1)

This document defines the HTTP API used by stations (devices) to send telemetry
to the backend.

It is aligned with the Telemetry Payload Contract:
- schema: `measurements.v1`
- batch-based ingestion
- forward compatible (unknown fields ignored)

Transport note:
- HTTP is used initially
- MQTT may be added later with the same payload shape

---

## 1. Conventions

### 1.1 Content Type
Requests MUST use:

- `Content-Type: application/json`

### 1.2 Timestamps
- All timestamps MUST be UTC.
- Timestamps MUST be RFC3339 / ISO-8601 (e.g. `2026-01-07T12:34:56Z`).

### 1.3 Forward Compatibility
- Backend MUST ignore unknown fields.
- Devices SHOULD NOT rely on backend rejecting unknown fields.

### 1.4 Idempotency and Retries
Devices MAY retry sending the same batch.

Recommendations:
- include a monotonic `seq` per `device_id`
- backend should tolerate duplicates (e.g. by deduplication key)

---

## 2. Ingest Measurements

### Endpoint

```
POST /v1/ingest
```

### Request Body

Body MUST be a `measurements.v1` telemetry batch.

```json
{
  "schema": "measurements.v1",
  "device_id": "esp32-station-01",
  "sent_at": "2026-01-07T12:34:56Z",
  "seq": 18421,
  "fw": { "name": "esp32-sensors", "version": "0.6.3" },
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

### Required Validation (Backend)

Backend MUST validate at least:
- `schema` is present and supported (`measurements.v1`)
- `device_id` is present
- `sent_at` is a valid timestamp
- `readings` is a non-empty array
- each reading has `ts`, `sensor_key`, `metric`, `unit`, `value`

Backend SHOULD:
- accept batches even if some readings are invalid (partial ingest), but MUST report it
- store invalid readings as `quality: "error"` if you want to preserve them for debugging

---

## 3. Responses

### 3.1 Success (All ingested)

```json
{
  "status": "ok",
  "ingested": 12
}
```

### 3.2 Partial Success (Some rejected)

```json
{
  "status": "partial",
  "ingested": 10,
  "rejected": 2,
  "rejections": [
    {
      "index": 5,
      "error": "invalid_timestamp",
      "message": "ts must be RFC3339"
    },
    {
      "index": 9,
      "error": "unknown_metric",
      "message": "metric not allowed"
    }
  ]
}
```

`index` refers to the index of the reading in `readings[]`.

### 3.3 Error (Nothing ingested)

```json
{
  "status": "error",
  "error": "invalid_payload",
  "message": "Missing device_id"
}
```

---

## 4. Optional Metadata Endpoints (Recommended)

These endpoints keep the telemetry payload lightweight.
They are optional for prototypes but recommended once you have multiple devices/sensors.

### 4.1 Upsert Device

```
PUT /v1/devices/{device_id}
```

```json
{
  "name": "Balcony Station",
  "location_id": "balcony",
  "tags": { "site": "home", "floor": "2" }
}
```

Recommended fields:
- `name` (string)
- `location_id` (string)
- `tags` (object)

### 4.2 Upsert Sensor

```
PUT /v1/devices/{device_id}/sensors/{sensor_key}
```

```json
{
  "type": "ds18b20",
  "model": "DS18B20",
  "metric_capabilities": ["temperature"],
  "interface": { "kind": "onewire", "bus": "onewire-1", "address": "28ff641d2c3a91" },
  "install": { "position": "ambient", "notes": "near window" },
  "calibration": { "version": 1, "offset": 0.0, "scale": 1.0 }
}
```

Recommended fields:
- `type`, `model`
- `metric_capabilities[]`
- `interface` (i2c/onewire/uart/adc details)
- `install` (human meaning: ambient/soil/outdoor)
- `calibration` (keep calibration history via `version`)

### 4.3 Upsert Location (Optional)

```
PUT /v1/locations/{location_id}
```

```json
{
  "name": "Balcony",
  "tags": { "site": "home" },
  "geo": { "lat": 52.2297, "lon": 21.0122, "elevation_m": 100 }
}
```

---

## 5. Versioning

- Telemetry payload schema is versioned via `schema` (e.g. `measurements.v1`).
- API endpoints are versioned via the URL prefix (`/v1/...`).
- Additive changes are allowed within v1.
- Breaking changes require a new schema and/or `/v2` endpoints.

---

## 6. Notes on Duplicates

To support retries safely, the backend SHOULD deduplicate.

Recommended deduplication key:
- (`device_id`, `seq`) if `seq` is present

Fallback (if no `seq`):
- (`device_id`, `sent_at`, hash(payload))
