# HTTP API Contract (v1)

This document defines the HTTP API used by stations (devices) to send telemetry.

Canonical payload encoding:
- Protobuf message `weathera.telemetry.v1.TelemetryBatch`
- Schema file: `proto/weathera/telemetry/v1/telemetry.proto`

---

## 1. Conventions

### 1.1 Content Types
Telemetry ingest SHOULD use:
- `Content-Type: application/x-protobuf`

(Optional for debugging only — may be disabled in production):
- `Content-Type: application/json`

### 1.2 Timestamps
- Protobuf uses Unix epoch milliseconds: `sent_at_ms`, `ts_ms` (UTC).

### 1.3 Forward Compatibility
- Backend MUST ignore unknown protobuf fields.

### 1.4 Idempotency and Retries
Devices MAY retry sending the same batch.

Backend should deduplicate using:
- (`device_id`, `seq`)

---

## 2. Ingest Measurements

### Endpoint

```
POST /v1/ingest
```

### Request Body

### Request (Protobuf)

Body is serialized `TelemetryBatch`.

Headers:
- `Content-Type: application/x-protobuf`

Example (sending a prepared binary file):
```bash
curl -X POST https://api.example.com/v1/ingest \
  -H "Content-Type: application/x-protobuf" \
  --data-binary "@batch.bin"
```

### Request (JSON debug mode, optional)

If enabled, the backend MAY accept a JSON representation for debugging.
(If you use this, document the exact JSON mapping separately.)

---

## 3. Responses

Responses are JSON for simplicity.

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
      "message": "ts_ms must be a positive unix epoch (ms)"
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

### 4. Validation Rules (Backend)

Backend MUST validate at least:
- `schema == "measurements.v1"`
- `device_id` is non-empty
- `readings` is non-empty
- each reading has:
  - `ts_ms > 0`
  - `sensor_key` non-empty
  - `metric` non-empty
  - `unit` non-empty
  - exactly one `oneof value` is set

Backend SHOULD:
- allow unknown metric values if namespaced (e.g. `custom.*`)
- optionally enforce canonical units for known metrics

## 5. Optional Metadata Endpoints (Recommended)

These endpoints keep the telemetry payload lightweight.
They are optional for prototypes but recommended once you have multiple devices/sensors.

### 5.1 Upsert Device

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

### 5.2 Upsert Sensor

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

### 5.3 Upsert Location (Optional)

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

## 6. Versioning

- Telemetry payload schema is versioned via `schema` (e.g. `measurements.v1`).
- API endpoints are versioned via the URL prefix (`/v1/...`).
- Additive changes are allowed within v1.
- Breaking changes require a new schema and/or `/v2` endpoints.

---

## 7. Notes on Duplicates

To support retries safely, the backend SHOULD deduplicate.

Recommended deduplication key:
- (`device_id`, `seq`) if `seq` is present

Fallback (if no `seq`):
- (`device_id`, `sent_at`, hash(payload))
