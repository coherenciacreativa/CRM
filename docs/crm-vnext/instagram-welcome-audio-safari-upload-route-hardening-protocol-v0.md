# Instagram Welcome Audio Safari Upload Route Hardening Protocol v0

Date: 2026-07-06
Status: no-run lane-local hardening protocol

## Purpose

Codify the browser/upload lesson from the first confirmed controlled Welcome
Audio send so future approved send or repeatability runs do not rediscover the
same route manually.

This protocol is design-only. It does not execute Safari, Instagram, DMs,
uploads, sends, filechooser tests, reply monitoring, MailerLite, Gmail, source
actions, private artifact inspection, or CRM/source writes.

## Relationship To First Controlled Send Result

The reference result is:

```text
crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05
```

Reference-only durable result:

```text
docs/crm-vnext/instagram-welcome-audio-first-controlled-send-result-v0.md
```

Facts preserved from the central redacted result:

- browser used: Safari;
- Safari isolated standard window confirmed: true;
- Safari neutral preflight passed: true;
- Safari filechooser preflight status: `passed_original_audio_accept`;
- Safari selected upload path class: `original`;
- welcome audio send confirmation: `confirmed`;
- approved audio asset label: `saludo_welcome_audio_v1`;
- Chrome upload blocker recorded: true;
- no temp copy was used;
- no reply monitoring occurred in the send run;
- no MailerLite occurred in the send run;
- no CRM/source writes occurred in the send run.

No raw handles, candidate identities, DM text, private artifact contents,
screenshots, audio contents, or source-private content are included here.

## Relationship To Chrome Upload Blocker

Chrome is not the proven upload backend for this route.

Current Chrome route status:

- blocked at the local Chrome/macOS filechooser selection layer for this `.m4a`
  route;
- blocked below Instagram, so the failure did not prove an Instagram upload
  failure;
- do not retry Chrome upload route by default;
- do not use Chrome for future Welcome Audio upload/send execution until a
  separately approved Chrome upload repair diagnostic proves the selection
  layer is reliable.

Chrome remains allowed only for Consultant UI Relay when separately approved.
That relay route must use the private target registry only for routing and must
not expose raw target URLs, source data, private chats, private artifacts, or
private content.

## Relationship To Safari Success

Safari is the currently proven backend for the controlled upload/send route.

Current Safari route status:

- proven once with an isolated standard Safari window;
- neutral Safari preflight passed before Instagram;
- original approved `.m4a` asset path was accepted;
- Instagram upload/send was confirmed for one approved controlled candidate;
- the run did not require a temporary audio copy;
- the run did not authorize standing sends, production automation, reply
  monitoring, MailerLite onboarding, CRM enrichment, or CRM writes.

## Browser Backend Decision Matrix

| Backend | Current status | Allowed future role | Default decision |
| --- | --- | --- | --- |
| Safari standard isolated window | Proven once for controlled upload/send | Future approved controlled send or repeatability route | Preferred upload backend |
| Safari Private Browsing | Forbidden | None | Do not use |
| Chrome | Blocked at filechooser selection layer for this `.m4a` route | Consultant relay only, or separately approved upload repair diagnostic | Do not use for upload |
| Human-assisted attachment | Not primary automation | Emergency/manual fallback only if separately approved | Do not use as primary strategy |
| Coordinates / screenshot navigation | Forbidden | None | Do not use |
| Hidden input / DOM or JavaScript injection | Forbidden | None | Do not use |
| Drag/drop fallback | Not approved | Only if separately approved | Do not use by default |

## Dedicated Safari Isolation Requirements

A future approved Safari upload/send run must start from a dedicated isolated
standard Safari window.

Minimum future requirements:

- confirm the window is dedicated to the run;
- avoid Safari Private Browsing;
- avoid shared user browsing state where active human use may interfere;
- stop if the browser context cannot be clearly isolated;
- stop if login, checkpoint, CAPTCHA, permissions prompt, or auth ambiguity
  appears;
- stop if any click would act on a non-approved source surface.

## Safari Private Browsing Forbidden

Safari Private Browsing is forbidden for this route because prior controlled
evidence favored a standard authenticated Safari context and private browsing
can break expected authentication, filechooser, or session continuity.

## Neutral Safari Preflight Requirements

Before any future approved Instagram upload/send run, perform only a separately
approved neutral Safari preflight.

The neutral preflight must:

- use a non-source local test page or other neutral surface;
- avoid Instagram, DMs, MailerLite, Gmail, Meta Business Suite, and APIs;
- verify Safari interaction reliability without source actions;
- avoid coordinates and screenshot-coordinate navigation;
- report only redacted status.

## Safari Filechooser Preflight Requirements

A future approved Safari filechooser preflight must:

- use the approved audio asset path only as allowed by that approval;
- verify that Safari can select the original approved `.m4a` asset;
- avoid copying, renaming, converting, or transcoding the audio file;
- avoid temporary file creation unless separately approved;
- stop if the original file is missing or rejected;
- stop if any hidden input, DOM injection, JavaScript injection, drag/drop, or
  coordinate fallback would be needed.

## Instagram Auth And Account Context Requirements

A future approved Instagram run must:

- verify the intended authenticated account without printing handles;
- stop if the account is wrong or ambiguous;
- stop if login, checkpoint, CAPTCHA, or permission prompts appear;
- avoid unrelated profiles, DMs, viewer lists, and source surfaces;
- operate only on the explicitly approved candidate route.

## Candidate Route Requirements

The send route must be tied to an explicitly approved controlled candidate or
approved future candidate packet.

It must not:

- generate a candidate queue by itself;
- infer approval from follower detection alone;
- send to non-controlled or unapproved followers;
- open unrelated DMs;
- perform standing/production sends.

## Approved Asset Requirements

Future upload/send approval must identify the approved asset label and permitted
path behavior.

The proven label is:

```text
saludo_welcome_audio_v1
```

Future runs should prefer the original approved audio path when the Safari
preflight passes. They must not create a temporary copy unless a separate
approval explicitly permits that fallback.

## Upload Control Requirements

Future approved upload runs must:

- use the Safari route only after neutral and filechooser gates pass;
- attach the approved audio exactly once;
- verify an attached/ready state before send;
- stop if the upload control is unavailable, ambiguous, or requires forbidden
  fallback;
- stop if the route would require blind clicking or repeated click loops.

## Send Confirmation Requirements

Future approved sends must:

- send only after final candidate and asset checks pass;
- capture a redacted confirmation state;
- write private send evidence only to the approved future private artifact
  boundary;
- write redacted receipts only to the approved future receipt boundary;
- not write CRM state, cards, ledgers, Fact Store, scoring, source-result
  ledgers, or outreach state unless a separate CRM/source write approval exists.

## Stop Conditions

Stop immediately if:

- Safari is not a standard isolated window;
- Safari Private Browsing is active;
- a user appears to be using the browser context;
- login, checkpoint, CAPTCHA, permission, or auth ambiguity appears;
- the intended Instagram account cannot be confirmed privately;
- the candidate route is ambiguous;
- the approved audio asset cannot be selected from the original path;
- upload controls are missing or ambiguous;
- a send confirmation cannot be observed safely;
- coordinates, screenshot navigation, hidden input, DOM injection, JavaScript
  injection, or unapproved drag/drop would be needed;
- private content would need to be printed;
- any source or CRM write would occur without explicit approval.

## Cleanup Requirements

Future approved runs must:

- close only disposable windows/tabs created for the run when safe;
- not close unrelated user windows;
- not delete or modify the approved original audio asset;
- not create temporary files unless separately approved;
- if a future approval permits temporary files, delete them and verify deletion.

## Temporary File Policy

This protocol creates no temporary files.

Future approved send runs should avoid temporary audio copies. If a future
fallback approves temporary files, that approval must define:

- exact temporary path boundary;
- allowed file class;
- deletion timing;
- deletion verification;
- redacted receipt fields.

## Storage And Receipt Path Labels For Future Runs

Repo durable records for this protocol live in CRM Core tracked docs only.

Consultant relay development telemetry path label:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Private development target registry path label:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

Future source/operator receipt path label, only under future source/operator
approval:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Future Instagram private source artifact path label, only under future approved
source/private evidence boundaries:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

This design task must not create directories, product/source/operator receipts,
private artifacts, private registries, Safari/Chrome state, operational state,
source/operator artifacts, or source-private artifacts.

## Forbidden Fallback List

Forbidden unless a later exact approval changes the boundary:

- no coordinates;
- no screenshot-coordinate navigation;
- no hidden input;
- no DOM injection;
- no JavaScript injection;
- no drag/drop fallback;
- no human-assisted attachment as the primary automation strategy;
- no Chrome upload retry by default;
- no Safari Private Browsing;
- no unrelated DM/profile/source exploration.

## Future Exact Approval Phrase Templates

### Safari Neutral Upload Preflight Only

```text
I approve one CRM Core Safari neutral upload preflight only. Use a dedicated standard Safari window and a neutral non-source test surface. Do not open Instagram, DMs, MailerLite, Gmail, or Meta Business Suite; do not send welcome audio; do not mutate source or CRM state.
```

### Safari Controlled Send Resume From Prior Candidate

```text
I approve one CRM Core Safari controlled welcome audio send resume from the explicitly approved prior candidate only. Use the proven dedicated standard Safari route, select the original approved audio asset if the preflight passes, do not open unrelated DMs, do not send to any other account, and do not write CRM/source state.
```

### Safari Full Controlled Repeatability Run

```text
I approve one CRM Core Safari full controlled Welcome Audio repeatability run for one explicitly approved controlled candidate. Use the dedicated standard Safari route, require neutral and filechooser gates, select the original approved audio asset, send only after final approval checks, and write only private evidence plus redacted receipts.
```

### Safari Route Repair / Hardening Diagnostic

```text
I approve one CRM Core Safari route repair/hardening diagnostic only. Do not send welcome audio, do not open unrelated DMs, do not mutate Instagram or CRM state, and stop before any source-visible action.
```

### Chrome Upload Repair Diagnostic

```text
I approve one CRM Core Chrome upload repair diagnostic only for the local filechooser selection layer. Do not open Instagram, DMs, MailerLite, Gmail, or Meta Business Suite; do not send welcome audio; do not perform source actions; do not write CRM/source state.
```

## Consultant Evidence Request Compatibility

For future docs-only consultant review, Codex may provide:

- changed file list;
- diffstat;
- focused diff for named sections;
- full diff for this design doc when scope remains small and docs-only;
- focused diff for the Welcome Audio workstream status file;
- artifact section excerpts;
- validation command output;
- closed gate checklist;
- storage policy checklist.

Raw target URL checks, owner token checks, and private-content checks over
changed docs may be reported only as pass/fail or redacted no-match status.
Matching raw target URLs, owner tokens, handles, emails, DMs, screenshots,
source rows, headers, cookies, env values, credentials, or private content must
not be printed.

## Closed Gates

- no execution;
- no source UI;
- no Instagram;
- no Safari;
- no APIs;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DM opening;
- no reply monitoring;
- no assistant reply send;
- no welcome audio send;
- no upload attempt;
- no filechooser test;
- no candidate queue generation;
- no private artifact inspection beyond consultant target registry routing;
- no MailerLite;
- no Gmail;
- no CRM/source writes;
- no card writes;
- no Fact Store writes;
- no source-result ledger writes;
- no scoring;
- no outreach;
- no source mutation;
- no central integration;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

Welcome Audio now has a no-run Safari upload route hardening protocol that
codifies the first confirmed controlled send route. It preserves Chrome as
blocked for upload by default, names Safari standard isolated window as the
proven route, defines neutral/filechooser gates, forbids Safari Private
Browsing and unsafe fallback mechanisms, and keeps all send, reply monitoring,
MailerLite, CRM write, and production automation gates closed.

## Next Safe Step

Central integration review may decide whether to integrate this lane-local
protocol. No send, upload, preflight, browser-source route, MailerLite, reply
monitoring, CRM enrichment, or production step is authorized by this document.

## Completion Boundary

Complete when this no-run protocol is reviewed, committed to the temporary
Welcome Audio branch, and optionally sent to central integration review under a
separate approval.
