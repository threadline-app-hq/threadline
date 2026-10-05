# Photograph notes and reader replies

11:44 multi-person visual review: actual city photograph, a three-paragraph caption, and a second person's two-line reply. At 390px, the reply ran directly into the final caption line. Added separate caption/comment classes and a 14px gap after the photograph note. Reader replies use 13px/1.6 spacing; the caption retains its authored paragraph breaks. No card or extra divider added.

Inspected final 320px light and 390px dark pixels: readable note/reply hierarchy, complete image, no horizontal overflow or navigation overlap. Added feed-editorial default test across 320/390/820/1440 with unrestricted axe and geometry assertion for separation. Feed-paragraphs Chromium/Firefox/WebKit, long-discussion scroll/close/composer, comment retry and 24-state unrestricted populated scans pass. Typecheck passes. Failed-photo pixels reviewed too: quiet placeholder with explicit Reload control; no extra change justified. Local pending batch.

12:01 published ce07deb (also includes complete contact-sheet frames). Render Live49.8s. Live JS/CSS hashes match local build; health ok. Temporary token revoked/list empty, secret files removed/browser released. No production fixture data.

Commit: https://github.com/threadline-app-hq/threadline/commit/ce07deb1ae6bd4607bf8ed10d7259f1bf7031faf
Deploy: https://dashboard.render.com/web/srv-db1hvigu01pc73ehkd70/deploys/dep-db1v7iom7kps73cv1ka0
