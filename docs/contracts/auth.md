# Authentication & Authorization Contract

This document defines how **devices (stations)** authenticate to the backend
and how requests are authorized.

The design goals are:
- strong device identity
- protection against spoofing and replay
- low implementation complexity on ESP32
- compatibility with HTTP now and MQTT later

---

## 1. Overview

Authentication answers:
> “Who is sending this request?”

Authorization answers:
> “Is this device allowed to do this?”

This contract defines **device-based authentication**, not user login.

---

## 2. Authentication Method (v1)

### 2.1 Chosen Method

**HMAC-based request signing** using a per-device secret.

Each device is provisioned with:
- `device_id` (public identifier)
- `device_secret` (shared secret, never transmitted)

All authenticated requests are signed using **HMAC-SHA256**.

---

## 3. Request Headers

Authenticated requests MUST include the following headers:

| Header | Required | Description |
|---|:---:|---|
| `X-Device-Id` | yes | Device identifier |
| `X-Timestamp` | yes | Request timestamp (UTC) |
| `X-Seq` | yes | Monotonic sequence number |
| `X-Signature` | yes | HMAC signature |

Example:
```
X-Device-Id: esp32-station-01
X-Timestamp: 2026-01-07T12:34:56Z
X-Seq: 18421
X-Signature: v1=8b1f4e...
```

---

## 4. Canonical String to Sign

To prevent tampering, a canonical string is built and signed.

### 4.1 Canonical String Format

```
v1
<HTTP_METHOD>
<REQUEST_PATH>
<TIMESTAMP>
<SEQ>
<BODY_SHA256>
```

Example:
```
v1
POST
/v1/ingest
2026-01-07T12:34:56Z
18421
6a9f2e3c4b...
```

Notes:
- Line breaks are `\n`
- `HTTP_METHOD` must be uppercase
- `REQUEST_PATH` excludes query parameters
- `BODY_SHA256` is hex-encoded SHA-256 of the raw request body

---

## 5. Signature Generation

### 5.1 Algorithm

```
signature = HMAC_SHA256(device_secret, canonical_string)
```

The final header value is:
```
X-Signature: v1=<hex_or_base64(signature)>
```

Encoding (hex vs base64) must be consistent between device and server.

---

## 6. Backend Verification Rules

Backend MUST verify:

1. `X-Device-Id` exists and is known
2. Signature is valid
3. `X-Timestamp` is within an acceptable window (recommended ±5 minutes)
4. `(device_id, seq)` has not been seen before

Backend SHOULD:
- reject requests with reused or decreasing `seq`
- rate-limit per `device_id`

---

## 7. Replay Protection

Replay protection is provided by **sequence numbers** and **timestamps**.

Rules:
- `X-Seq` MUST be strictly increasing per device
- Backend stores last accepted `seq` per device
- Requests with lower or equal `seq` are rejected

If a device reboots and loses state:
- it MAY resume with a higher `seq`
- or the backend MAY allow a reset via manual intervention

---

## 8. Authorization Rules

Authorization is intentionally simple:

- a device is authorized to ingest data **only for itself**
- backend MUST ignore any `device_id` in the JSON body
- identity is derived exclusively from authentication headers

This prevents one device impersonating another.

---

## 9. Provisioning

### 9.1 Initial Provisioning

For each device:
- generate a unique `device_id`
- generate a strong random `device_secret`
- flash both into the device firmware
- store both securely in the backend

The `device_secret` MUST NOT be logged or returned by any API.

---

## 10. Secret Rotation

Backend SHOULD support **two active secrets per device**:
- `current`
- `next`

Rotation procedure:
1. Provision new secret as `next`
2. Update device firmware
3. Promote `next` → `current`
4. Revoke old secret

This allows rotation without downtime.

---

## 11. Error Responses

Authentication failures MUST return:

```json
{
  "status": "error",
  "error": "unauthorized",
  "message": "Invalid signature"
}
```

HTTP status codes:
- `401 Unauthorized` – authentication failed
- `403 Forbidden` – authenticated but not allowed
- `429 Too Many Requests` – rate limiting

---

## 12. MQTT Compatibility (Future)

The same identity model applies to MQTT:

Options:
- reuse `device_id` as MQTT username + HMAC in payload
- or migrate to mTLS with client certificates

The telemetry payload schema remains unchanged.

---

## 13. Security Notes

- HTTPS is REQUIRED for all HTTP endpoints
- Secrets MUST be stored securely on the backend
- Devices SHOULD store secrets in flash with read protection enabled
- Logs MUST NOT include secrets or raw signatures

---

## 14. Versioning

This authentication scheme is versioned as `auth.v1`.

Breaking changes require:
- new signature version (e.g. `v2`)
- updated header format
