import { z } from "zod";

// Base schemas
export const FirmwareSchema = z
  .object({
    name: z.string().min(1),
    version: z.string().min(1),
  })
  .partial({ version: true })
  .passthrough();

export const ReadingSchema = z
  .object({
    ts: z.string().datetime(),
    sensor_key: z.string().min(1),
    metric: z.string().min(1),
    unit: z.string().min(1),
    value: z.any(),
    value_type: z.enum(["number", "bool", "string", "object"]).optional(),
    window_ms: z.number().int().nonnegative().optional(),
    quality: z.enum(["ok", "suspect", "error"]).optional(),
    error_code: z.string().min(1).optional(),
  })
  .passthrough();

// Envelope schema: validate top-level + ensure readings array exists.
export const TelemetryBatchEnvelopeSchema = z
  .object({
    schema: z.literal("measurements.v1"),
    device_id: z.string().min(1),
    sent_at: z.string().datetime(),
    seq: z.number().int().nonnegative().optional(),
    fw: FirmwareSchema.optional(),
    readings: z.array(z.any()).min(1),
  })
  .passthrough();

// Full batch schema validates every reading; useful when you want strict failure.
export const TelemetryBatchSchema = TelemetryBatchEnvelopeSchema.extend({
  readings: z.array(ReadingSchema),
});

export type Firmware = z.infer<typeof FirmwareSchema>;
export type Reading = z.infer<typeof ReadingSchema>;
export type TelemetryBatchEnvelope = z.infer<typeof TelemetryBatchEnvelopeSchema>;
export type TelemetryBatch = z.infer<typeof TelemetryBatchSchema>;
