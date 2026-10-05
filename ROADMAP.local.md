# Threadline 2.0 progress (local notes, not in repo)
Done+live: landing page, 2.0 branding, PWA (manifest/icons/sw network-first), notifications (API+UI), batched queries, indexes, security headers, gzip, metrics, request logging, graceful shutdown.
Tools: /tmp/mktok.sh (creates PAT -> /tmp/tok.txt), TOK=$(cat /tmp/tok.txt) python3 /tmp/push2.py "msg", /tmp/deploy.sh (Render manual deploy; wait ~90s). Revoke ALL tokens at end of every run (github.com/settings/tokens).
Done also: skeletons, empty state card, edit profile, mobile header fix (grid align-content). Remaining: stories viewer, DMs, post search/hashtags, avatar upload, infinite scroll, pull-to-refresh, page transitions, dark-mode landing toggle, Supabase Storage, Neon 2nd DB, keep-warm pinger, tests for PATCH me.
Done also: post search by caption (live).
