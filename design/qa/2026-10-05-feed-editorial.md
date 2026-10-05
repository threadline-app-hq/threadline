# Photograph notes and reader replies

11:44 multi-person visual review: actual city photograph, a three-paragraph caption, and a second person's two-line reply. At 390px, the reply ran directly into the final caption line. Added separate caption/comment classes and a 14px gap after the photograph note. Reader replies use 13px/1.6 spacing; the caption retains its authored paragraph breaks. No card or extra divider added.

Inspected final 320px light and 390px dark pixels: readable note/reply hierarchy, complete image, no horizontal overflow or navigation overlap. Added feed-editorial default test across 320/390/820/1440 with unrestricted axe and geometry assertion for separation. Feed-paragraphs Chromium/Firefox/WebKit, long-discussion scroll/close/composer, comment retry and 24-state unrestricted populated scans pass. Typecheck passes. Failed-photo pixels reviewed too: quiet placeholder with explicit Reload control; no extra change justified. Local pending batch.
