"use client";

export const formatNumber = (v: number | undefined, digits = 1) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

export const formatTime = (ts: string, opts?: Intl.DateTimeFormatOptions) =>
  new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
