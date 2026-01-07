export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <style>{`
          :root {
            color-scheme: light;
            --bg: #0b1021;
            --panel: #111833;
            --panel-strong: #0f1a40;
            --text: #e9ecf5;
            --muted: #aab4d6;
            --accent: #7bd0ff;
            --accent-strong: #3fb0ff;
            --border: #1f2a52;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: "Inter", "SF Pro Display", system-ui, -apple-system, sans-serif;
            background: radial-gradient(circle at 20% 20%, #11204a, #0b1021 45%), radial-gradient(circle at 80% 10%, #0f2f4f, #0b1021 50%), #0b1021;
            color: var(--text);
            min-height: 100vh;
          }
          a { color: var(--accent); text-decoration: none; }
          a:hover { color: var(--accent-strong); }
          .shell {
            max-width: 1080px;
            margin: 0 auto;
            padding: 32px 20px 48px;
          }
          .nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 18px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: linear-gradient(135deg, #121b3a, #0f1631);
            position: sticky;
            top: 12px;
            backdrop-filter: blur(8px);
            z-index: 10;
          }
          .nav-title { font-weight: 700; letter-spacing: 0.02em; }
          .pill {
            border: 1px solid var(--border);
            border-radius: 999px;
            padding: 8px 14px;
            color: var(--muted);
            font-size: 14px;
            display: inline-flex;
            gap: 6px;
            align-items: center;
          }
          main { margin-top: 20px; }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 16px;
          }
          .card {
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 18px;
            background: linear-gradient(135deg, #111833, #0f1a40);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
          }
          .card h2 { margin: 0 0 8px; font-size: 18px; }
          .sub { color: var(--muted); margin: 0 0 12px; }
          .reading {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: -0.03em;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
          }
          th, td {
            padding: 8px 6px;
            text-align: left;
            border-bottom: 1px solid var(--border);
          }
          th { color: var(--muted); font-weight: 600; }
          tr:last-child td { border-bottom: none; }
          @media (max-width: 640px) {
            .nav { position: static; }
            .reading { font-size: 30px; }
          }
        `}</style>
        <div className="shell">
          <header className="nav">
            <div className="nav-title">Weather Station</div>
            <div className="pill">
              <span>Private preview</span>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
