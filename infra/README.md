# Standby / failover infrastructure

Threadline runs on Render (primary) with a trial standby on
Railway, all sharing the same Postgres database and
SESSION_SECRET. A Cloudflare Worker (threadline.j6lqjb.workers.dev)
proxies to Render first and fails over for GET/HEAD/OPTIONS only on
edge/origin errors (502/503/504/521/522/523/525/526/530) or network
failure. Every mutation is attempted once only, even on gateway errors:
the origin may already have applied a write before the error arrived.

Deploys are CLI/API only (no GitHub App installs, no persistent repo
grants):
- Railway: `railway up` from a clean export with the project token in
  vault 'Railway deploy token (Threadline)'. Trial credit has a 30-day expiry, but continuous usage can exhaust it earlier.
- Back4App: scripted in-browser upload from raw.githubusercontent.com
  (see run notes); its temporary URL expired at05:24PDT and it is excluded.
- Cloudflare worker: PUT multipart to
  /accounts/9f35af01b9291268f9bbcb1ea5d22c92/workers/scripts/threadline
  with the token in vault 'Cloudflare deploy token (Threadline)'.
