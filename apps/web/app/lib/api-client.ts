"use client";

const apiBase =
  (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8787").replace(/\/$/, "");

const defaultInit: RequestInit = {
  credentials: "include",
  cache: "no-store",
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, { ...defaultInit, ...init });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body?.message ?? body?.error ?? msg;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return res.json() as Promise<T>;
}

export type AuthResponse =
  | { status: "ok"; user: { email: string }; csrf_token: string }
  | { status: "unauthenticated" };

export interface ChartDataResponse {
  status: "ok";
  device_id: string;
  updated_at: string;
  series: {
    metric: string;
    label: string;
    unit: string;
    data: { ts: string; value: number }[];
  }[];
}

export async function fetchMe(): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/me");
}

export async function fetchChartData(): Promise<ChartDataResponse> {
  return request<ChartDataResponse>("/v1/chart-data");
}

export async function login(email: string) {
  return request<{
    status: "ok";
    user: { email: string };
    session_id: string;
    csrf_token: string;
  }>("/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function logout() {
  return request<{ status: "ok" }>("/auth/logout", { method: "POST" });
}
