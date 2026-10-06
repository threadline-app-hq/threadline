# Threadline overhaul, October 6

Owner steering: premium feel and overhaul UI/server. Staged changes preserve accounts, media, messages, session and ownership protections. No paid dependencies or infrastructure.

## Direction
A private photographic journal, not another stock social dashboard. Keep the original stitched mark and licensed Instrument type family. Refine the warm palette toward cleaner ivory surfaces, sharper ink and subdued clay. Use photography as the hero; selective surface depth belongs to tools and overlays, not every photo.

## UI sequence
1. Establish one new design-token layer and remove ambiguity from accumulated overrides as touched. Consistent type, spacing, radii, boundaries and motion across tools.
2. Navigation and page hierarchy: make desktop a considered workspace, phone a compact camera/journal. Keep target sizes, large text and draft continuity intact.
3. Feed and photo detail: calmer author/date hierarchy, deliberate caption/comment rhythm, preserve whole frames.
4. Profile/contact sheets and discovery: intentional identity block, clear photo counts and original-photo access.
5. Create, messages, activity and auth: consistent tactile controls, quiet depth, clear loading/error/confirmation treatment.
6. Pixel review at 320/390/820/1440, both themes, populated/empty/error/pending, reduced motion, real photo ratios, keyboard and enlarged text.

## Server sequence
1. Measure query counts/latency on populated API pages. Review shapeAll's per-post comment previews and publicUser's sequential counts. Batch only with exact ordering/limit tests, preserve response contracts.
2. Review static file streaming, compression and conditional caching for responsiveness and error handling. Keep fresh application assets and private APIs correct.
3. Review resource ceilings, connection lifecycle, malformed requests, timeouts and storage failure cleanup. No schema destruction, no credential/session reset, no data migration without tested necessity.
4. Full security, concurrency, pagination and media regression, then source/asset/deployment readback.

## Shipping
Local populated fixtures only. Test each meaningful batch, inspect pixels, then publish app-only main with existing approval. No workflow changes or paid upgrades. Keep a truthful ledger of unverified physical-device behavior.
