# Translate in the hand

At 900 CSS pixels and below, the same form becomes a focused mobile workspace:

- Searchable language sheets replace the native menus, with the current choice
  and recent language codes near the top. Recent choices contain no input text.
- Write and Translation tabs let the editor use the available screen. A successful
  request opens the result and dismisses the input keyboard; editing or swapping
  returns to the source without losing its words.
- The primary action stays at the bottom of the workspace. Keyboard layout waits
  for actual visual-viewport occlusion rather than moving controls on touchstart.
  Done dismisses the keyboard and keeps the unsent draft. IME composition doesn't
  submit unfinished text.
- Paste requests clipboard access only after a tap, with native long-press paste
  as a fallback. Copy failures retain selectable text. Share sends the translated
  text through the native share UI, with a selectable-text fallback. The separate
  link action explicitly includes the original text.
- Dialogs contain focus and support Escape. The native selects remain the fallback
  if the mobile controller fails to load. Wider windows restore both editors and
  the original desktop share control.

The Google translation/speech contract and optional OpenAI API remain as documented
in `architecture.md`. No text history, sensor permission, or automatic clipboard
read is added.

## Verification

Run the existing API tests and Wrangler dry run in `cloudflare/`. With the local
Worker running on port 8794, run the browser checks from the repository root:

```sh
node tests/mobile-browser.cjs
```

The current check uses the environment's Playwright module and Chromium. Provider,
clipboard, sharing and visual-viewport events are controlled doubles. Seven
groups cover fourteen size/theme combinations, language selection, API form
contents, successful results, copying/sharing, detected-language swapping, IME
composition, keyboard touch stability/dismissal, stale/error responses, clipboard
denial, shared-link initialization and restoration at desktop width.

Physical Firefox/WebKit, native keyboard animation, OS share prompts and actual
speech playback still need phone testing. `mobile-validation.json` records the
automated browser result. These tests make no paid-model calls.
