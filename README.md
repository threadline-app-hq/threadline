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

This is a small-app baseline, not a proven production-scale service. YouTube discovery and official embed UI are implemented but require YOUTUBE_API_KEY and live playback verification before release. It has no moderation tools, email verification, replication or independently verified real-iPhone installation flow. The API rate limiter lives in one process. Sample images and accounts are fictional. Uploaded images are public to anyone with their URL.

## QA coverage

The UI runner checks phone/desktop layouts, CDP touch gestures, reduced motion, modal focus isolation, network errors and retry, message/profile/search race guards, in-flight edit locks, short-height/landscape layouts and persisted browser theme, lost authentication, PWA offline shell and accessibility. `node test/ui-runner.mjs <spec> ...` runs a subset with a fresh database for each spec. Automated accessibility scans currently cover 13 entry/empty/dialog states and 24 populated phone/desktop light/dark states. These scans are not a manual accessibility certification. Chromium touch emulation does not prove physical iPhone/Safari behavior.

Password hashing runs asynchronously so concurrent sign-ins do not block the server's event loop. Database connections and queries have timeouts. New indexes cover user-photo ordering, comment ordering and unread notifications. Local concurrency tests exercise simultaneous sign-ins, single-use recovery code races and messages arriving during read snapshots; they do not measure production database capacity. Replacing an avatar removes the prior image after the profile points to the new one. Supabase deletion failures are logged rather than falsely reported as confirmed storage cleanup.

Optional WebKit check: install Playwright WebKit and its system dependencies, then `node test/ui-runner.mjs webkit-qa`. `WEBKIT_EXECUTABLE` can select a local test wrapper when dependencies are supplied outside system directories. Linux WebKit checks are not a physical iPhone/Safari installation test.

Owned stories can be deleted from the viewer after confirmation; profile photos can be removed. Blocked browser storage falls back to an explicitly temporary in-memory session. Missing asset URLs return 404 rather than the app HTML. Rate-limit histories are bounded and expired entries are pruned without clearing active limits. Local tests include text scaling and simulated standalone mode, neither of which proves physical iPhone installation.

## YouTube short videos (not yet live)

Set YOUTUBE_API_KEY server-side only. Do not put it in Vite/browser variables or commit it. Restrict the key to YouTube Data API v3 in its Google project; billing is not required by this implementation. The signed-in `/api/reels` endpoint caches metadata for 30 minutes, coalesces simultaneous requests and uses a conservative 80-search-per-Pacific-day process-local budget. Multiple replicas each have their own budget/cache, so project quota is the final enforcement and a shared limiter is needed before scaling. No video bytes are downloaded or stored.

The feed uses YouTube's official privacy-enhanced iframe after an explicit playback choice, one player at a time and only when more than half of the player is visible. It stops on tab changes, document hiding, pause or consent withdrawal. Native controls remain visible. Discovery uses short-duration search, not a guarantee of vertical YouTube Shorts; filters exclude known child-directed and age-restricted clips but are not human moderation. Search/cache exhaustion, failed discovery and unconfigured keys have explicit states. No artificial replay loop or unlimited-new-content claim.

Sources: https://developers.google.com/youtube/v3/docs/search/list, https://developers.google.com/youtube/v3/docs/videos, https://developers.google.com/youtube/terms/required-minimum-functionality, https://developers.google.com/youtube/v3/determine_quota_cost.

`node test/reels-ui.mjs` tests local unconfigured behavior and mocked discovery/player responses in Chromium/WebKit. Its player test does not prove live Google signup, API discovery, video availability or actual YouTube autoplay.
