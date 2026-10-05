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
