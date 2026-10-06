# Standby / failover infrastructure

Threadline runs on Render (primary) with always-on free standbys on
Railway and Back4App, all sharing the same Postgres database and
SESSION_SECRET. A Cloudflare Worker (threadline.j6lqjb.workers.dev)
proxies to Render first and fails over to the standbys only on
edge/origin errors (502/503/504/521/522/523/525/526/530) or, for
idempotent methods, network failure. App-level responses are never
replayed, so mutations can never be applied twice.

Deploys are CLI/API only (no GitHub App installs, no persistent repo
grants):
- Railway: `railway up` from a clean export with the project token in
  vault 'Railway deploy token (Threadline)'. Trial credit ~30 days.
- Back4App: scripted in-browser upload from raw.githubusercontent.com
  (see run notes); free 256MB container, always-on.
- Cloudflare worker: PUT multipart to
  /accounts/9f35af01b9291268f9bbcb1ea5d22c92/workers/scripts/threadline
  with the token in vault 'Cloudflare deploy token (Threadline)'.
