import { Handler, json } from "../lib/http";
import { getSession, getSessionIdFromRequest } from "../lib/session";

const sessionCookieName = "ws_session";

export const chartData: Handler = async (request) => {
  const sessionId = getSessionIdFromRequest(request, sessionCookieName);
  const session = getSession(sessionId);
  if (!session) return json({ error: "unauthorized" }, { status: 401 });

  // Dummy chart/demo data — replace with real persistence later.
  const now = Date.now();
  const stepMs = 60 * 1000;
  const points = Array.from({ length: 12 }, (_, i) => {
    const ts = new Date(now - i * stepMs).toISOString();
    return {
      ts,
      temperature: 20.5 + Math.sin(i / 3) * 1.2,
      humidity: 55 + Math.cos(i / 4) * 3,
      pressure: 1013 + Math.sin(i / 2) * 0.6,
      battery_voltage: 3.8 - i * 0.002,
    };
  }).reverse();

  const series = [
    {
      metric: "temperature",
      label: "Temperature",
      unit: "C",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.temperature.toFixed(2)) })),
    },
    {
      metric: "humidity",
      label: "Humidity",
      unit: "%RH",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.humidity.toFixed(1)) })),
    },
    {
      metric: "pressure",
      label: "Pressure",
      unit: "hPa",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.pressure.toFixed(1)) })),
    },
    {
      metric: "battery_voltage",
      label: "Battery",
      unit: "V",
      data: points.map((p) => ({ ts: p.ts, value: Number(p.battery_voltage.toFixed(3)) })),
    },
  ];

  return json({
    status: "ok",
    device_id: "device-demo-01",
    updated_at: new Date(now).toISOString(),
    series,
  });
};
