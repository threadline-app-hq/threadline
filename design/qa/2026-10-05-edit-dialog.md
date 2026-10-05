# Profile edit and recovery review

October 5, 2026, 09:38-09:43 PDT, local disposable accounts only.

Found invalid accessibility semantics in the profile editor: dialog role on a form and button role on a label. Existing WCAG-tagged checks did not cover axe's best-practice aria-allowed-role rule; the new unrestricted cross-browser check failed with both nodes identified.

Changed the editor to a dialog container holding a native form. Replaced the photo-picker label with a native button that opens a separate hidden file input. Native disabled behavior now applies during saves and recovery changes. Kept current layout and focus trap. The biography count is marked decorative so it does not interfere with the Bio label.

Verified Chromium, Firefox and WebKit:
- Native photo-picker button opens a file chooser, preview decodes, remove restores initials.
- Wrong recovery password keeps the session and edited fields intact; no API recovery succeeded or credential changed in this test.
- Pending profile save locks fields and dismissal. A failed save retains fields; retry saves paragraphs.
- Unrestricted axe scan has no violations in the populated recovery-error editor.

Avatar remove/failure, upload race, duplicate-submit lock, pending controls, recovery failure, profile biography, keyboard focus, media fallback, standard accessibility scan, visual flow, TypeScript and build also passed. Updated four old selectors to the separate hidden picker input. Inspected top editor/picker pixels in Chromium and WebKit, recovery-error bottom pixels in all three, and saved dark profile. No clipping or lost controls found. Production remains 34c3ce8; the editor fix is local pending a batched publish.

## Broader unrestricted scan, 09:54-09:56 PDT

The unrestricted scan also found missing main landmarks on signup/recovery screens and the same label-as-button problem on Add your story. Added main landmarks to authentication/startup screens and replaced the story picker label with a native button and separate hidden input. Keyboard file chooser opening is now checked in the three-engine story-sequence spec. Existing local uploads still work through the same input handler.

Unrestricted axe scan now passes landing, signup, recovery, all seven app tabs, profile editor, dark profile and desktop profile. Story flow/gestures/delete/avatar fallback, three-engine sequences/native picker, three-engine edit/recovery, visual flow, offline signed-in recovery and auth-network checks pass. Home and signup pixels inspected. The broader scan is retained in the default suite rather than limiting all checks to WCAG-tagged rules.

## Published native controls, 10:11 PDT

c17d8dd is live. Render reports succeeded|Live in 28 seconds. Health ok and JS/CSS SHA256 match the tested build. Temporary GitHub token revoked, list verified empty, local secret files removed and browser released. No production demo content.

Source: https://github.com/threadline-app-hq/threadline/commit/c17d8ddd110b4cc58962d8bcbf2b55d65af8c802
Deploy: https://dashboard.render.com/web/srv-db1hvigu01pc73ehkd70/deploys/dep-db1tk9lg1s2s73bnoi2g

Unrestricted populated scan found the two desktop complementary landmarks were unnamed and indistinguishable. Named the navigation aside "App navigation" and the identity rail "Your profile". Retained populated-unrestricted as a separate default spec: 24 populated phone/desktop/theme/dialog states pass. The 13-state empty/auth/editor unrestricted scan also passes. Desktop populated home pixels inspected; naming does not change layout. This last naming fix and test are local pending a future batch.

## Overlay states, 10:14 PDT

New default spec overlay-unrestricted: startup boot error screen and story viewer (paused, delete confirmation) pass the full unrestricted axe rule set. Keyboard-only traversal reaches story viewer header tools by Tab, pause works, Escape closes and focus handling stays intact. Boot-error and story-confirm pixels captured. Local-only test change; production remains c17d8dd.

## Coarse pointer and keyboard-sized viewports, 10:31 PDT

Found auth password visibility control at 85x36, below our 44px touch baseline. Added a coarse-pointer-only 44px minimum for app buttons plus auth text controls and profile/comment controls; story controls keep a 44px square and modal toolbar grows to leave the close control room. Fine-pointer layouts are unchanged.

New default coarse-pointer spec runs Chromium and WebKit touch contexts. Auth back/password/login, profile editor controls and conversation back meet 44px. Resizing a focused editor and message draft to 390x360, then 520 and 844 high, preserves text; Save/Send remain visible and Send stays above bottom navigation. WebKit editor and message screenshots inspected: readable draft, fully visible action controls, no overlapping navigation. This simulates keyboard-sized layout resizing, not a real iOS keyboard or physical-device safe-area test. Existing safe-area env() offsets remain in the top, bottom navigation, dialogs, stories and messaging height.

Seven related viewport/touch/overlay tests plus touch, standalone simulation, auth locking and password toggles pass. Unrestricted 13-state and 24-state axe scans remain clean; typecheck passes. Local-only batch, no publish yet.

## Dialog focus edge cases, 10:46 PDT

Shared focus handling now skips disabled textareas and negative-tabindex/hidden controls, handles newly disabled current focus, and sends Tab to the dialog itself while all controls are disabled. Restores prior body overflow, scroll position, and connected opener on cleanup, leaving already-inert unrelated content alone. Removed a duplicate Escape listener in photo modal. Recovery panel password/create/copy controls now honor profile Save busy state too.

New default dialog-edges spec: Chromium, Firefox and WebKit each pass three open/close cycles, both Tab directions, recovery-panel insertion, all-disabled pending save, blocked Escape during save, and exact inert/overflow/focus/scroll restoration. WebKit pending-editor pixels inspected: recovery panel and Save status fit without overlap. Existing keyboard/editor failure/retry tests, coarse-pointer, overlays, 13+24 unrestricted axe states, profile-submit lock and story-confirm axe pass; typecheck passes. Local pending next batch publish.

## Published batch, 10:59 PDT

c7edf74 live. Render Live in 26.5s, health ok, JS/CSS hashes match the tested assets. Temporary token revoked and list reloaded empty, secret files removed, browser released. No production demo content. Smoke/security/typecheck pass. Original build/publish permission and current week task rechecked.

Commit: https://github.com/threadline-app-hq/threadline/commit/c7edf7497da652954e2e7ed6e40c6e5d86c64501
Deploy: https://dashboard.render.com/web/srv-db1hvigu01pc73ehkd70/deploys/dep-db1uabvlot8c73d6oapg
