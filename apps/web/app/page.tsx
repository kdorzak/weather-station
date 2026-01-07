import Link from "next/link";
import type { TelemetryBatchEnvelope, Reading } from "@weathera/contracts";

const mockBatch: TelemetryBatchEnvelope = {
  schema: "measurements.v1",
  device_id: "device-nyc",
  sent_at: "2025-01-01T00:00:10.000Z",
  seq: 1234,
  fw: { name: "esp32-sensors", version: "0.6.3" },
  readings: [
    { ts: "2025-01-01T00:00:00.000Z", sensor_key: "temp_ambient_1", metric: "temperature", unit: "C", value: 21.4 },
    { ts: "2025-01-01T00:00:00.000Z", sensor_key: "temp_ambient_1", metric: "humidity", unit: "%RH", value: 42.1 },
    { ts: "2025-01-01T00:00:00.000Z", sensor_key: "temp_ambient_1", metric: "pressure", unit: "hPa", value: 1012.3 },
    { ts: "2025-01-01T00:00:00.000Z", sensor_key: "power_main", metric: "battery_voltage", unit: "V", value: 3.78 },
    { ts: "2024-12-31T23:59:00.000Z", sensor_key: "temp_ambient_1", metric: "temperature", unit: "C", value: 21.1 },
    { ts: "2024-12-31T23:59:00.000Z", sensor_key: "temp_ambient_1", metric: "humidity", unit: "%RH", value: 43.5 },
    { ts: "2024-12-31T23:59:00.000Z", sensor_key: "temp_ambient_1", metric: "pressure", unit: "hPa", value: 1012.1 },
    { ts: "2024-12-31T23:59:00.000Z", sensor_key: "power_main", metric: "battery_voltage", unit: "V", value: 3.77 },
    { ts: "2024-12-31T23:58:00.000Z", sensor_key: "temp_ambient_1", metric: "temperature", unit: "C", value: 20.9 },
    { ts: "2024-12-31T23:58:00.000Z", sensor_key: "temp_ambient_1", metric: "humidity", unit: "%RH", value: 44 },
    { ts: "2024-12-31T23:58:00.000Z", sensor_key: "temp_ambient_1", metric: "pressure", unit: "hPa", value: 1011.9 },
    { ts: "2024-12-31T23:58:00.000Z", sensor_key: "power_main", metric: "battery_voltage", unit: "V", value: 3.77 },
  ],
};

const latestReadingsByMetric = (readings: Reading[]) => {
  const sorted = [...readings].sort(
    (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
  );
  const map = new Map<string, Reading>();
  for (const r of sorted) {
    if (!map.has(r.metric)) {
      map.set(r.metric, r);
    }
  }
  return map;
};

const latestByMetric = latestReadingsByMetric(mockBatch.readings as Reading[]);

const historyRows = (() => {
  const grouped = new Map<string, Reading[]>();
  for (const r of mockBatch.readings as Reading[]) {
    const key = r.ts;
    grouped.set(key, [...(grouped.get(key) ?? []), r]);
  }
  return Array.from(grouped.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([ts, readings]) => ({ ts, readings }));
})();

const formatNumber = (v: unknown, digits = 1) =>
  typeof v === "number" ? v.toFixed(digits) : "—";
const findMetric = (readings: Reading[], metric: string) =>
  readings.find((r) => r.metric === metric);

const Home = () => {
  return (
    <>
      <section className="grid" aria-label="Latest snapshot">
        <article className="card" aria-labelledby="latest">
          <h2 id="latest">Latest reading</h2>
          <p className="sub">
            {new Date(mockBatch.sent_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            <div>
              <div className="sub">Temperature</div>
              <div className="reading">
                {formatNumber(latestByMetric.get("temperature")?.value)}°C
              </div>
            </div>
            <div>
              <div className="sub">Humidity</div>
              <div className="reading">
                {formatNumber(latestByMetric.get("humidity")?.value, 0)}%
              </div>
            </div>
            <div>
              <div className="sub">Pressure</div>
              <div className="reading">
                {formatNumber(latestByMetric.get("pressure")?.value, 1)} hPa
              </div>
            </div>
            <div>
              <div className="sub">Battery</div>
              <div className="reading">
                {formatNumber(latestByMetric.get("battery_voltage")?.value, 2)} V
              </div>
            </div>
          </div>
        </article>
        <article className="card" aria-labelledby="device-meta">
          <h2 id="device-meta">Device</h2>
          <p className="sub">Station metadata</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            <div>
              <div className="sub">Device ID</div>
              <div className="reading" style={{ fontSize: 18 }}>{mockBatch.device_id}</div>
            </div>
            <div>
              <div className="sub">Location</div>
              <div className="reading" style={{ fontSize: 18 }}>
                40.713, -74.006
              </div>
            </div>
          </div>
          <p className="sub" style={{ marginTop: 12 }}>
            <Link href="/about">About this project →</Link>
          </p>
        </article>
      </section>

      <section className="card" style={{ marginTop: 16 }} aria-label="Recent readings">
        <h2>Recent readings</h2>
        <p className="sub">Static demo data — replace with API once available.</p>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Temp</th>
                <th>Humidity</th>
                <th>Pressure</th>
                <th>Battery</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map(({ ts, readings }) => {
                const temp = findMetric(readings, "temperature");
                const hum = findMetric(readings, "humidity");
                const press = findMetric(readings, "pressure");
                const batt = findMetric(readings, "battery_voltage");
                return (
                  <tr key={ts}>
                    <td>
                      {new Date(ts).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{formatNumber(temp?.value)}°C</td>
                    <td>{formatNumber(hum?.value, 0)}%</td>
                    <td>{formatNumber(press?.value, 1)} hPa</td>
                    <td>{formatNumber(batt?.value, 2)} V</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default Home;
