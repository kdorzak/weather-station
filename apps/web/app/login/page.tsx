"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login } from "../lib/api-client";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email);
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <main className="card" style={{ maxWidth: 420 }}>
      <h1>Login</h1>
      <p className="sub" style={{ marginBottom: 12 }}>
        Enter an allowlisted email to access the dashboard.
      </p>
      <form onSubmit={onSubmit} className="grid" style={{ gap: 10 }}>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {error && <p className="sub" style={{ color: "var(--accent, #c00)", marginTop: 8 }}>{error}</p>}
      <p className="sub" style={{ marginTop: 12 }}>
        <Link href="/">Back to dashboard</Link>
      </p>
    </main>
  );
};

export default LoginPage;
