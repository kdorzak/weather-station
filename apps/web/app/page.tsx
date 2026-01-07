import Link from "next/link";

type ChartPoint = { ts: string; value: number };
type ChartSeries = { metric: string; label: string; unit: string; data: ChartPoint[] };
type ChartResponse = {
  status: "ok";
  device_id: string;
  updated_at: string;
  series: ChartSeries[];
};

const formatNumber = (v: number | undefined, digits = 1) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

const getChartData = async (): Promise<ChartResponse | null> => {
  const base =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ?? "http://localhost:8787";
  try {
    const res = await fetch(`${base}/v1/chart-data`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as ChartResponse;
    if (json?.status !== "ok") return null;
    return json;
  } catch {
    return null;
  }
};

const latestByMetric = (series: ChartSeries[]) => {
  const map = new Map<string, { value: number; ts: string; unit: string; label: string }>();
  for (const s of series) {
    const latest = [...s.data].sort(
      (a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()
    )[0];
    if (latest) map.set(s.metric, { value: latest.value, ts: latest.ts, unit: s.unit, label: s.label });
  }
  return map;
};

const historyRows = (series: ChartSeries[]) => {
  const grouped = new Map<string, Record<string, number>>();
  for (const s of series) {
    for (const point of s.data) {
      grouped.set(point.ts, { ...(grouped.get(point.ts) ?? {}), [s.metric]: point.value });
    }
  }
  return Array.from(grouped.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([ts, metrics]) => ({ ts, metrics }));
};

const Home = async () => {
  const data = await getChartData();

  if (!data) {
    return (
      <section className="card" aria-label="API unavailable">
        <h2>Data unavailable</h2>
        <p className="sub">Could not load demo data from the API.</p>
      </section>
    );
  }

  const latest = latestByMetric(data.series);
  const rows = historyRows(data.series);

  return (
    <>
      <section className="grid" aria-label="Latest snapshot">
        <article className="card" aria-labelledby="latest">
          <h2 id="latest">Latest reading</h2>
          <p className="sub">
            {new Date(data.updated_at).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            <div>
              <div className="sub">Temperature</div>
              <div className="reading">
                {formatNumber(latest.get("temperature")?.value)}°C
              </div>
            </div>
            <div>
              <div className="sub">Humidity</div>
              <div className="reading">
                {formatNumber(latest.get("humidity")?.value, 0)}%
              </div>
            </div>
            <div>
              <div className="sub">Pressure</div>
              <div className="reading">
                {formatNumber(latest.get("pressure")?.value, 1)} hPa
              </div>
            </div>
            <div>
              <div className="sub">Battery</div>
              <div className="reading">
                {formatNumber(latest.get("battery_voltage")?.value, 3)} V
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
              <div className="reading" style={{ fontSize: 18 }}>{data.device_id}</div>
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
        <p className="sub">Dummy data served from the API.</p>
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
              {rows.map(({ ts, metrics }) => (
                <tr key={ts}>
                  <td>
                    {new Date(ts).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>{formatNumber(metrics.temperature)}°C</td>
                  <td>{formatNumber(metrics.humidity, 0)}%</td>
                  <td>{formatNumber(metrics.pressure, 1)} hPa</td>
                  <td>{formatNumber(metrics.battery_voltage, 3)} V</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default Home;
