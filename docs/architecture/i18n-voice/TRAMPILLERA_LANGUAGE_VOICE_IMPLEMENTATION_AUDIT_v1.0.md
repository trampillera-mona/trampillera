# TRAMPILLERA — Language, Voice & Interaction Audit v1.0

**Date:** 2026-11-24  
**Branch:** `architecture/federated-modules-recovery`  
**Status:** Implemented foundation; full translation coverage and live browser verification remain open  
**Production impact:** None. No Render, production database, secrets, or deployment configuration was changed.

## 1. Scope

The audit covers the public portal, Control Plane, ITY CITY launcher, Workspace, Team Missions, Corporate Campus, and Corporate Multiverse. It distinguishes a language selector from actual translation coverage, and a microphone button from a working voice pipeline.

## 2. Supported interface locales

The shared locale catalog now declares twelve interface locales and explicit BCP-47 tags:

| Code | Language | BCP-47 | Direction |
|---|---|---|---|
| EN | English | en-US | LTR |
| RU | Русский | ru-RU | LTR |
| SR | Srpski | sr-RS | LTR |
| DE | Deutsch | de-DE | LTR |
| FR | Français | fr-FR | LTR |
| ES | Español | es-ES | LTR |
| IT | Italiano | it-IT | LTR |
| PT | Português | pt-PT | LTR |
| ZH | Simplified Chinese | zh-CN | LTR |
| JA | 日本語 | ja-JP | LTR |
| KO | 한국어 | ko-KR | LTR |
| AR | العربية | ar-SA | RTL |

The locale preference is stored under `trampillera.locale.v1`. Same-origin pages and tabs synchronize through the browser storage event. The selected locale updates the document language and direction. Arabic uses RTL document direction.

## 3. Shared language and voice controls

Added `app/public/shared/trampillera-global-controls.js` and loaded it in:
- Public portal `/`
- Control Plane `/control/`
- ITY CITY launcher `/city/`
- Team Missions `/city/team/`
- Workspace `/city/workspace/`
- Corporate Campus `/city/campus/`
- Corporate Multiverse `/city/multiverse/`

The shared toolbar provides:
- locale selection where a page does not already have a language selector;
- shared locale persistence and synchronization;
- microphone start/stop;
- speech output mute/unmute;
- speech rate preference;
- selection of an installed browser voice matching the active locale where available;
- visible status and keyboard-accessible controls.

The main portal's existing language selector is retained and connected to the shared preference. Its startup no longer unconditionally resets the locale to English.

## 4. Voice input and output

### Voice input

The shared voice layer uses browser Web Speech recognition:
- `SpeechRecognition` or `webkitSpeechRecognition`;
- recognition locale follows the selected interface language;
- explicit user activation is required before microphone capture;
- the UI reports unsupported browsers and microphone errors;
- navigation commands are recognized in all twelve declared locales;
- recognized module navigation from an ITY CITY iframe is sent to the parent launcher using a same-origin, allow-listed message;
- general commands are emitted as `trampillera:voice-command`;
- JARVISER's Triage / Analysis / Synthesis role assignment can consume supported multilingual role phrases.

### Voice output

The shared voice layer uses the browser's `speechSynthesis` and `SpeechSynthesisUtterance`:
- the selected BCP-47 locale is applied to the utterance;
- a matching installed voice is selected where available;
- speech enablement and rate are stored locally;
- legacy JARVISER and floating assistant output now use the shared speech preference when the shared layer is available.

### Microphone permission boundary

- The Express response now sets `Permissions-Policy: microphone=(self)`.
- The same-origin ITY CITY iframe explicitly delegates microphone permission with `allow="microphone; ..."`.
- The browser still requires a secure context (HTTPS or localhost) and the user's permission.
- No microphone is activated automatically.

## 5. Important capability limits

The browser APIs are not universal:
- Web Speech recognition availability varies by browser, operating system, locale, and device.
- Some browsers expose speech synthesis but not speech recognition.
- Installed TTS voices are supplied by the operating system/browser; the platform cannot guarantee that every locale has a native voice installed.
- Recognition may rely on a browser-vendor service. This implementation does not claim local/offline ASR.
- There is no server-side ASR/TTS provider adapter yet.
- Browser-level microphone, voice quality, and real-device language testing have not been executed in this source-only pass.

A visible microphone button is not evidence that the browser granted microphone permission or that a particular language is recognized successfully.

## 6. Translation coverage — honest status

**The twelve locale options and shared voice-command vocabulary are implemented. Full translation of every page is not yet complete.**

Current coverage:
- Public portal: existing dictionary translates a small set of portal labels; shared locale handling adds common navigation labels. Most editorial, FUI, JARVISER catalogue, modal, and generated content remains authored in English or Russian.
- Control Plane: common navigation labels are mapped; most page content, forms, notices, generated records, and admin messages remain English.
- ITY CITY launcher: module navigation labels are mapped; explanatory status text and most shell copy remain English.
- Workspace: common navigation labels are mapped; widget library, templates, settings, and help copy remain largely English.
- Team Missions: shared language/voice controls are present; most mission, authentication, and discussion copy remains English.
- Campus and Multiverse: shared language/voice controls and document locale/direction are present; the large scene/editor interface is not yet fully translated.

Dynamic user content, documents, external source material, and AI-generated content are not automatically translated. They must retain their original language and provenance unless a separately configured translation operation is requested and recorded.

## 7. Automated verification added

- `scripts/locale-voice.test.mjs` verifies twelve unique locales, complete shared control vocabulary, voice-navigation phrase matching in every declared locale, and safe fallback for unknown input.
- `app/package.json` includes the locale/voice tests in `npm test`.
- `.github/workflows/verify.yml` runs the locale/voice tests and checks:
  - the shared script is served from the public static directory;
  - the ITY CITY iframe delegates microphone permission;
  - the server returns the same-origin microphone Permissions-Policy header.

These are automated source/CI checks. They do not replace real-device browser tests.

## 8. Remaining work before claiming full multilingual support

1. Add stable translation keys for all static UI text across each page.
2. Build and review complete translation catalogs for all twelve locales.
3. Add coverage reporting that fails CI when a required UI key is missing in any locale.
4. Add browser tests for locale persistence, RTL layout, keyboard navigation, iframe synchronization, and language switching.
5. Test microphone permissions and recognition on current Android Chrome, desktop Chrome/Edge, Safari, and Firefox; document unsupported combinations.
6. Add server-side ASR/TTS adapters only if a provider, privacy policy, credential model, and cost policy are explicitly selected.
7. Add a voice-command policy/confirmation layer before allowing consequential operations. Current voice navigation is limited to opening known workspaces; it does not approve payments, change access, or perform destructive actions.

## 9. Other known platform gaps retained from the wider source audit

The language/voice work does not resolve the following existing architectural gaps:
- JARVISER is not yet a verified task orchestration runtime with durable queue, policy gate, execution ledger, and evidence lifecycle.
- Event Bus / transactional outbox and general module-to-module bridge contracts are not yet implemented.
- Workspace, Campus, and Multiverse still rely primarily on browser-local state.
- Connector records do not prove live authentication or external connectivity.
- Provider registry entries are not yet dynamically bound to adapter health/capability discovery.
- Comms preview is not a verified persistent messaging or end-to-end encrypted service.
- Browser-level accessibility, mobile, cross-browser, and iframe regression coverage remains incomplete.

## 10. Deployment boundary

All changes are on the review branch and are not merged into `main`. Render production has not been updated. Do not issue or run a Render deployment command until CI, source review, and browser verification pass and the operator explicitly authorizes deployment.
