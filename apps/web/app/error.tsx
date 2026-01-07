"use client";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  return (
    <html>
      <body>
        <main className="card" style={{ maxWidth: 480, margin: "40px auto" }}>
          <h1>Something went wrong</h1>
          <p className="sub" style={{ marginTop: 8 }}>{error.message}</p>
          <button onClick={reset} style={{ marginTop: 12 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
