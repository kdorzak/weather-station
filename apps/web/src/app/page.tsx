"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [data, setData] = useState<string>("Loading...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

    if (!baseUrl) {
      setError("API base URL is not configured");
      return;
    }

    fetch(baseUrl)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.text();
      })
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError("Failed to fetch API");
      });
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1>Weather Station</h1>

      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <p>API response: {data}</p>
      )}
    </main>
  );
}