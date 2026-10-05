# Preparing a replacement photo

12:15 Create and empty-state pixel review. Create preview/caption/failure state has readable hierarchy and visible Share. Empty Explore has a specific next action. Warm-local slow-startup sample LCP2232ms/CLS.000035 under150ms latency/200KiB/s/4xCPU, not production cold-start.

A replacement photo previously removed the old preview while decoding; because selected-photo layout has auto height, the button shrank to a spinner and the caption/actions jumped. Keep the existing preview during preparation and put a calm, visible Preparing photo status over it. First selection keeps the fixed chooser space. Add the existing20MB input limit to the chooser hint. Share stays disabled until the newest photo is ready.

Chromium/WebKit controlled slow-decode replacement: previous preview remains, height/position change under1px, status visible and unrestricted axe clean, Share disabled, then selected filename changes and Share unlocks. Final WebKit pixels inspected: centered readable status, no layout collapse, caption and Share fit. Existing upload-race, busy controls, caption failure, editor widths and rejected-bitmap fallback pass. Typecheck passes. Local-only pending batch.
