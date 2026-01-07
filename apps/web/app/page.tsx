"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboardData } from "./lib/hooks/useDashboardData";
import { Skeleton } from "./components/Skeleton";
import { formatNumber } from "./lib/format";

type ChartPoint = { ts: string; value: number };
type ChartSeries = { metric: string; label: string; unit: string; data: ChartPoint[] };

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

const Home = () => {
  const router = useRouter();
  const { userEmail, data, loading, error, reload, logout } = useDashboardData();

  // Redirect if unauthenticated once loading finishes.
  if (!loading && !userEmail) {
    router.replace("/login");
    return null;
  }

  if (loading) {
    return (
      <section className="card">
        <h2>Loading…</h2>
        <div className="grid" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginTop: 12 }}>
          <Skeleton height={22} />
          <Skeleton height={22} />
          <Skeleton height={22} />
          <Skeleton height={22} />
        </div>
        <div style={{ marginTop: 16 }}>
          <Skeleton height={20} width="40%" />
          <div style={{ marginTop: 8 }}>
            <Skeleton height={14} width="100%" />
            <Skeleton height={14} width="90%" />
            <Skeleton height={14} width="80%" />
          </div>
        </div>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="card" aria-label="Error">
        <h2>Could not load data</h2>
        <p className="sub">{error}</p>
        <button onClick={reload}>Retry</button>
        <button onClick={logout} style={{ marginLeft: 8 }}>
          Logout
        </button>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card" aria-label="No data">
        <h2>No data yet</h2>
        <p className="sub">{error ?? "Could not load chart data."}</p>
        <button onClick={reload}>Retry</button>
        <button onClick={logout} style={{ marginLeft: 8 }}>
          Logout
        </button>
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
          <p className="sub">Signed in as {userEmail}</p>
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
          <button onClick={logout} style={{ marginTop: 12 }}>
            Logout
          </button>
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
