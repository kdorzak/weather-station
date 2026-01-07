"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type ChartPoint = { ts: string; value: number };
type ChartSeries = { metric: string; label: string; unit: string; data: ChartPoint[] };
type ChartResponse = {
  status: "ok";
  device_id: string;
  updated_at: string;
  series: ChartSeries[];
};

type MeResponse =
  | { status: "ok"; user: { email: string }; csrf_token: string }
  | { status: "unauthenticated" };

const apiBase =
  (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787").replace(/\/$/, "");

const formatNumber = (v: number | undefined, digits = 1) =>
  typeof v === "number" ? v.toFixed(digits) : "—";

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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [csrf, setCsrf] = useState<string | null>(null);
  const [data, setData] = useState<ChartResponse | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch(`${apiBase}/auth/me`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = (await res.json()) as MeResponse;
      if (json.status === "ok") {
        setUserEmail(json.user.email);
        setCsrf(json.csrf_token);
        return true;
      }
      setUserEmail(null);
      setCsrf(null);
      return false;
    } catch {
      setUserEmail(null);
      setCsrf(null);
      return false;
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${apiBase}/v1/chart-data`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Failed to load data (auth required?)");
        setData(null);
        return;
      }
      const json = (await res.json()) as ChartResponse;
      if (json.status !== "ok") {
        setError("Failed to load data");
        setData(null);
        return;
      }
      setData(json);
      setError(null);
    } catch {
      setError("Failed to load data");
      setData(null);
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const authed = await fetchMe();
      if (authed) {
        await fetchData();
      }
      setLoading(false);
    })();
  }, []);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: loginEmail }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body?.message ?? "Login failed");
        return;
      }
      const body = await res.json();
      setUserEmail(body.user.email);
      setCsrf(body.csrf_token);
      await fetchData();
    } catch {
      setError("Login failed");
    }
  };

  const onLogout = async () => {
    await fetch(`${apiBase}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setUserEmail(null);
    setCsrf(null);
    setData(null);
  };

  if (loading) {
    return (
      <section className="card">
        <h2>Loading…</h2>
      </section>
    );
  }

  if (!userEmail) {
    return (
      <section className="card" aria-label="Login">
        <h2>Login to view data</h2>
        <form onSubmit={onLogin} className="grid" style={{ gap: 8, maxWidth: 360 }}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
        {error && <p className="sub" style={{ color: "var(--accent, #c00)" }}>{error}</p>}
      </section>
    );
  }

  if (!data) {
    return (
      <section className="card" aria-label="No data">
        <h2>No data yet</h2>
        <p className="sub">{error ?? "Could not load chart data."}</p>
        <button onClick={fetchData}>Retry</button>
        <button onClick={onLogout} style={{ marginLeft: 8 }}>
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
          <button onClick={onLogout} style={{ marginTop: 12 }}>
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
