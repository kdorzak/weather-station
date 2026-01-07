type Reading = {
  ts: string;
  sensor_key: string;
  metric: string;
  unit: string;
  value: unknown;
  value_type?: "number" | "bool" | "string" | "object";
  window_ms?: number;
  quality?: "ok" | "suspect" | "error";
  error_code?: string;
  [key: string]: unknown;
};

type TelemetryBatchEnvelope = {
  schema: "measurements.v1";
  device_id: string;
  sent_at: string;
  seq?: number;
  fw?: { name?: string; version?: string; [key: string]: unknown };
  readings: unknown[];
  [key: string]: unknown;
};

type ValidationError = {
  path: string;
  message: string;
};

type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] };

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;
const isNonNegativeInt = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0;
const isRFC3339 = (v: string) => !Number.isNaN(Date.parse(v));

const validateEnvelope = (
  body: unknown
): ValidationResult<TelemetryBatchEnvelope> => {
  const errors: ValidationError[] = [];
  if (typeof body !== "object" || body === null) {
    return { success: false, errors: [{ path: "", message: "Expected object" }] };
  }
  const obj = body as Record<string, unknown>;

  if (obj.schema !== "measurements.v1") {
    errors.push({ path: "schema", message: "schema must be measurements.v1" });
  }
  if (!isNonEmptyString(obj.device_id)) {
    errors.push({ path: "device_id", message: "device_id is required" });
  }
  if (!isNonEmptyString(obj.sent_at) || !isRFC3339(String(obj.sent_at))) {
    errors.push({ path: "sent_at", message: "sent_at must be RFC3339 string" });
  }
  if (obj.seq !== undefined && !isNonNegativeInt(obj.seq)) {
    errors.push({ path: "seq", message: "seq must be a non-negative integer" });
  }
  if (!Array.isArray(obj.readings) || obj.readings.length === 0) {
    errors.push({ path: "readings", message: "readings must be a non-empty array" });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: obj as TelemetryBatchEnvelope };
};

const validateReading = (value: unknown): ValidationResult<Reading> => {
  const errors: ValidationError[] = [];
  if (typeof value !== "object" || value === null) {
    return { success: false, errors: [{ path: "", message: "Expected object" }] };
  }
  const r = value as Record<string, unknown>;
  if (!isNonEmptyString(r.ts) || !isRFC3339(String(r.ts))) {
    errors.push({ path: "ts", message: "ts must be RFC3339 string" });
  }
  if (!isNonEmptyString(r.sensor_key)) {
    errors.push({ path: "sensor_key", message: "sensor_key is required" });
  }
  if (!isNonEmptyString(r.metric)) {
    errors.push({ path: "metric", message: "metric is required" });
  }
  if (!isNonEmptyString(r.unit)) {
    errors.push({ path: "unit", message: "unit is required" });
  }

  if (
    r.value_type &&
    r.value_type !== "number" &&
    r.value_type !== "bool" &&
    r.value_type !== "string" &&
    r.value_type !== "object"
  ) {
    errors.push({ path: "value_type", message: "invalid value_type" });
  }
  if (r.window_ms !== undefined && !isNonNegativeInt(r.window_ms)) {
    errors.push({
      path: "window_ms",
      message: "window_ms must be a non-negative integer",
    });
  }
  if (
    r.quality &&
    r.quality !== "ok" &&
    r.quality !== "suspect" &&
    r.quality !== "error"
  ) {
    errors.push({ path: "quality", message: "quality must be ok|suspect|error" });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: r as Reading };
};

export interface Env {
  DATABASE_URL: string;
}

type Handler = (request: Request, env: Env) => Promise<Response>;

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const health: Handler = async () =>
  json({ status: "ok", service: "weather-station-api" });

const ingest: Handler = async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ status: "error", error: "invalid_payload", message: "Invalid JSON" }, { status: 400 });
  }

  const envelope = validateEnvelope(body);
  if (!envelope.success) {
    return json(
      {
        status: "error",
        error: "invalid_payload",
        message: "Envelope validation failed",
        details: envelope.errors,
      },
      { status: 400 }
    );
  }

  const readings = envelope.data.readings;
  const rejections: { index: number; error: string; message: string }[] = [];
  const accepted: Reading[] = [];

  readings.forEach((reading, index) => {
    const result = validateReading(reading);
    if (result.success) accepted.push(result.data);
    else {
      rejections.push({
        index,
        error: "invalid_reading",
        message: result.errors.map((i) => `${i.path}: ${i.message}`).join("; "),
      });
    }
  });

  if (accepted.length === 0) {
    return json(
      {
        status: "error",
        error: "invalid_payload",
        message: "All readings invalid",
        rejections,
      },
      { status: 400 }
    );
  }

  // Persistence + idempotency guard would live here.
  if (rejections.length > 0) {
    return json(
      {
        status: "partial",
        ingested: accepted.length,
        rejected: rejections.length,
        rejections,
      },
      { status: 207 }
    );
  }

  return json({ status: "ok", ingested: accepted.length });
};

const notFound: Handler = async () =>
  json({ error: "Not Found" }, { status: 404 });

const route = (pathname: string): Handler => {
  if (pathname === "/health") return health;
  if (pathname === "/v1/ingest") return ingest;
  return notFound;
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    return route(url.pathname)(request, env);
  },
};