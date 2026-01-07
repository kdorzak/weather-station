var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/lib/http.ts
var json = /* @__PURE__ */ __name((data, init) => new Response(JSON.stringify(data), {
  headers: { "content-type": "application/json" },
  ...init
}), "json");

// src/routes/health.ts
var health = /* @__PURE__ */ __name(async () => json({ status: "ok", service: "weather-station-api" }), "health");

// src/routes/ingest.ts
var isNonEmptyString = /* @__PURE__ */ __name((v) => typeof v === "string" && v.trim().length > 0, "isNonEmptyString");
var isNonNegativeInt = /* @__PURE__ */ __name((v) => typeof v === "number" && Number.isInteger(v) && v >= 0, "isNonNegativeInt");
var isRFC3339 = /* @__PURE__ */ __name((v) => !Number.isNaN(Date.parse(v)), "isRFC3339");
var validateEnvelope = /* @__PURE__ */ __name((body) => {
  const errors = [];
  if (typeof body !== "object" || body === null) {
    return { success: false, errors: [{ path: "", message: "Expected object" }] };
  }
  const obj = body;
  if (obj.schema !== "measurements.v1") {
    errors.push({ path: "schema", message: "schema must be measurements.v1" });
  }
  if (!isNonEmptyString(obj.device_id)) {
    errors.push({ path: "device_id", message: "device_id is required" });
  }
  if (!isNonEmptyString(obj.sent_at) || !isRFC3339(String(obj.sent_at))) {
    errors.push({ path: "sent_at", message: "sent_at must be RFC3339 string" });
  }
  if (obj.seq !== void 0 && !isNonNegativeInt(obj.seq)) {
    errors.push({ path: "seq", message: "seq must be a non-negative integer" });
  }
  if (!Array.isArray(obj.readings) || obj.readings.length === 0) {
    errors.push({ path: "readings", message: "readings must be a non-empty array" });
  }
  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true, data: obj };
}, "validateEnvelope");
var validateReading = /* @__PURE__ */ __name((value) => {
  const errors = [];
  if (typeof value !== "object" || value === null) {
    return { success: false, errors: [{ path: "", message: "Expected object" }] };
  }
  const r = value;
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
  if (r.value_type && r.value_type !== "number" && r.value_type !== "bool" && r.value_type !== "string" && r.value_type !== "object") {
    errors.push({ path: "value_type", message: "invalid value_type" });
  }
  if (r.window_ms !== void 0 && !isNonNegativeInt(r.window_ms)) {
    errors.push({
      path: "window_ms",
      message: "window_ms must be a non-negative integer"
    });
  }
  if (r.quality && r.quality !== "ok" && r.quality !== "suspect" && r.quality !== "error") {
    errors.push({ path: "quality", message: "quality must be ok|suspect|error" });
  }
  if (errors.length > 0) {
    return { success: false, errors };
  }
  return { success: true, data: r };
}, "validateReading");
var ingest = /* @__PURE__ */ __name(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  let body;
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
        details: envelope.errors
      },
      { status: 400 }
    );
  }
  const readings = envelope.data.readings;
  const rejections = [];
  const accepted = [];
  readings.forEach((reading, index) => {
    const result = validateReading(reading);
    if (result.success) accepted.push(result.data);
    else {
      rejections.push({
        index,
        error: "invalid_reading",
        message: result.errors.map((i) => `${i.path}: ${i.message}`).join("; ")
      });
    }
  });
  if (accepted.length === 0) {
    return json(
      {
        status: "error",
        error: "invalid_payload",
        message: "All readings invalid",
        rejections
      },
      { status: 400 }
    );
  }
  if (rejections.length > 0) {
    return json(
      {
        status: "partial",
        ingested: accepted.length,
        rejected: rejections.length,
        rejections
      },
      { status: 207 }
    );
  }
  return json({ status: "ok", ingested: accepted.length });
}, "ingest");

// src/routes/chart-data.ts
var chartData = /* @__PURE__ */ __name(async () => {
  const now = Date.now();
  const stepMs = 60 * 1e3;
  const points = Array.from({ length: 12 }, (_, i) => {
    const ts = new Date(now - i * stepMs).toISOString();
    return {
      ts,
      temperature: 20.5 + Math.sin(i / 3) * 1.2,
      humidity: 55 + Math.cos(i / 4) * 3,
      pressure: 1013 + Math.sin(i / 2) * 0.6,
      battery_voltage: 3.8 - i * 2e-3
    };
  }).reverse();
  const series = [
    {
      metric: "temperature",
      label: "Temperature",
      unit: "C",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.temperature.toFixed(2)) }))
    },
    {
      metric: "humidity",
      label: "Humidity",
      unit: "%RH",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.humidity.toFixed(1)) }))
    },
    {
      metric: "pressure",
      label: "Pressure",
      unit: "hPa",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.pressure.toFixed(1)) }))
    },
    {
      metric: "battery_voltage",
      label: "Battery",
      unit: "V",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.battery_voltage.toFixed(3)) }))
    }
  ];
  return json({
    status: "ok",
    device_id: "device-demo-01",
    updated_at: new Date(now).toISOString(),
    series
  });
}, "chartData");

// src/index.ts
var notFound = /* @__PURE__ */ __name(async () => json({ error: "Not Found" }, { status: 404 }), "notFound");
var route = /* @__PURE__ */ __name((pathname) => {
  if (pathname === "/health") return health;
  if (pathname === "/v1/ingest") return ingest;
  if (pathname === "/v1/chart-data") return chartData;
  return notFound;
}, "route");
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    return route(url.pathname)(request, env);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-4MJQWo/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-4MJQWo/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
