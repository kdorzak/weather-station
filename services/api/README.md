# Weather Station API (Cloudflare Worker)

Minimal worker with health check and `/events` ingest stub using shared contracts.

## Commands

```bash
# install deps
npm install

# run tests
npm test

# dev server (uses wrangler)
npm run dev

# deploy (requires wrangler auth)
npm run deploy
```

## Environment

- `DATABASE_URL` – placeholder for future persistence. Not used yet.

## Endpoints

- `GET /health` → `{ status: "ok", service: "weather-station-api" }`
- `POST /events`
  - Validates body against `@weathera/contracts/EventSchema`.
  - Returns `202 { accepted: true, event_id }` on success.
  - Returns `400` on invalid JSON or validation errors.
  - Returns `405` on non-POST.

## Notes

- Idempotency/persistence are stubbed; wire DB + event_id dedupe where the comment indicates.
- Uses local `@weathera/contracts` package for types and validation schema.
