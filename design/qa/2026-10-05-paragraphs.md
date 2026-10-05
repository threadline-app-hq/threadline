# Feed paragraph review

October 5, 2026, 09:06-09:09 PDT.

Found a real content defect: the editor and photograph dialog preserved caption paragraph breaks, but the feed collapsed them. The same happened to multiline comments. The new regression failed with computed white-space normal before the fix.

Added a scoped .post .meta p white-space pre-wrap rule. Captions and comments now retain the writer's paragraphs in both the feed and dialog, with existing anywhere-wrapping for long strings. Currency, quotes and markup remain literal text.

Checks passed:
- New feed-paragraphs regression in Chromium, Firefox and WebKit, 320/390/1440 widths, both themes.
- Long discussions, biographies, text safety, mixed photos, real photographs, comments layout, Firefox flow and WebKit flow.
- TypeScript and production build.

Inspected phone pixels across all three engines and desktop WebKit dark mode. Paragraph spacing is preserved, text wraps inside the page, photo composition and navigation remain intact. Test data stayed local. The fix and rebuilt CSS are batched locally for the next publish checkpoint; production is still c52828e.

## Published, 09:24 PDT

34c3ce8 is live. Render deploy succeeded|Live in 26.4 seconds. /api/health ok; deployed JS and CSS SHA256 match the local tested build. Temporary token revoked and list verified empty, secret files removed, browser released. No production demo account or content created.

Source: https://github.com/threadline-app-hq/threadline/commit/34c3ce84abfcc750d30010d004e253a6268d2072
Deploy: https://dashboard.render.com/web/srv-db1hvigu01pc73ehkd70/deploys/dep-db1sttqd0e5s7397nj3g

Additional local test: three-story keyboard sequence in Chromium, Firefox and WebKit. Next/previous returns the correct image and count, reopen starts at the first story, advancing past the third closes the viewer. Paused captured pixels checked across all engines. The transparent Next/Previous access buttons are intentionally keyboard controls; the gesture surface handles pointer input. Tests focus these controls and use Enter rather than clicking hidden pointer targets. No runtime defect found in this sequence.
