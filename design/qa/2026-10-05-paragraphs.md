# Feed paragraph review

October 5, 2026, 09:06-09:09 PDT.

Found a real content defect: the editor and photograph dialog preserved caption paragraph breaks, but the feed collapsed them. The same happened to multiline comments. The new regression failed with computed white-space normal before the fix.

Added a scoped .post .meta p white-space pre-wrap rule. Captions and comments now retain the writer's paragraphs in both the feed and dialog, with existing anywhere-wrapping for long strings. Currency, quotes and markup remain literal text.

Checks passed:
- New feed-paragraphs regression in Chromium, Firefox and WebKit, 320/390/1440 widths, both themes.
- Long discussions, biographies, text safety, mixed photos, real photographs, comments layout, Firefox flow and WebKit flow.
- TypeScript and production build.

Inspected phone pixels across all three engines and desktop WebKit dark mode. Paragraph spacing is preserved, text wraps inside the page, photo composition and navigation remain intact. Test data stayed local. The fix and rebuilt CSS are batched locally for the next publish checkpoint; production is still c52828e.
