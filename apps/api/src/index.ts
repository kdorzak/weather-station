import {
  ReadingSchema,
  TelemetryBatchEnvelopeSchema,
} from "@weathera/contracts";

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

  const envelope = TelemetryBatchEnvelopeSchema.safeParse(body);
  if (!envelope.success) {
    return json(
      {
        status: "error",
        error: "invalid_payload",
        message: "Envelope validation failed",
        details: envelope.error.flatten(),
      },
      { status: 400 }
    );
  }

  const readings = envelope.data.readings;
  const rejections: { index: number; error: string; message: string }[] = [];
  const accepted: typeof readings = [];

  readings.forEach((reading, index) => {
    const result = ReadingSchema.safeParse(reading);
    if (result.success) {
      accepted.push(result.data);
    } else {
      rejections.push({
        index,
        error: "invalid_reading",
        message: result.error.issues.map((i) => i.message).join("; "),
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