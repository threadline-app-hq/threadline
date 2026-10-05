# Threadline

A photo-first social app with a Node/Postgres API and React front end.

## Development

- `npm ci`
- `cd web && npm ci && cd ..`
- `npm run build:web`
- `npm test` for backend smoke tests
- `npm run test:auth` for session/reset checks
- `npm run test:security` for headers, assets, search and follow checks
- `npm run typecheck`
- `npm run preview:local` for an isolated in-memory preview on port 18180
- `npx playwright install chromium`, then stop the preview and run `npm run test:ui` (each spec starts its own isolated preview)

The local preview uses an in-memory database and a bytea compatibility shim. It is not a production database benchmark. UI test accounts and messages remain local. The service worker caches only the public shell and sample images, never API responses or uploaded images. Text assets use gzip when supported.

## Deployment

Set DATABASE_URL, SESSION_SECRET and NODE_ENV=production. Optional Supabase Storage configuration: SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_BUCKET. Do not put secrets in source control. The Docker image serves the built `public` directory. Vite copies static PWA and sample assets from `web/static`.

The service listens even when SEED is disabled. SEED=1 adds fictional sample accounts only to a database with no users. Signup uses a recovery code instead of email. Reset rotates the code and invalidates older sessions.

## Keep-warm

The Supabase `threadline-keepwarm` cron job pings `/api/health` every ten minutes. A separate GitHub Actions workflow runs on minutes 3, 13, 23, 33, 43 and 53. The health endpoint checks Postgres too. The workflow can be run manually.

These are best-effort pingers, not an uptime guarantee. Render Free can sleep, restart or be suspended; scheduled GitHub jobs can be delayed or dropped. A process cannot wake itself after it has stopped. The free plans have storage, transfer and compute limits. No card or paid service is configured for this app.

## Boundaries

This is a small-app baseline, not a proven production-scale service. It has no video/reels, moderation tools, email verification, replication or independently verified real-iPhone installation flow. The API rate limiter lives in one process. Sample images and accounts are fictional. Uploaded images are public to anyone with their URL.
