# Draft continuity

12:32 Create unmounted on every tab change, throwing away the chosen photograph and caption. Keep these draft values in the signed-in app's memory so a tap on Explore/Home and return to Create does not destroy work. No localStorage/sessionStorage draft, no server write. Clear after a successful Share, logout/auth loss or page reload. Preserve a newer draft if an earlier submission finishes later.

Chromium/WebKit photo-draft checks preserve exact image URL/filename/paragraphs across tab switches, clear after Share/logout/reload, and confirm no draft storage key. Existing preparing-photo, upload race, duplicate submit, caption failure, busy controls, offline session and PWA privacy checks pass. Typecheck passes. This changes state ownership only, no new visual layout. Direct Messages still loses its local text when unmounted; assess a per-recipient memory draft next, including pending-send and user switching before accepting a change.
