# Instagram New Follower Welcome Audio Lane Design v0

Date: 2026-06-24
Status: no-run CRM Core design

## Purpose

This design defines a no-run CRM Core lane for detecting new Instagram
followers, deduplicating them privately, preparing a welcome-audio candidate
queue, and preserving an explicit approval boundary before any DM or audio send.

This design does not authorize execution, Instagram UI work, DMs, welcome audio,
source mutation, CRM writes, scoring, or outreach.

## Source Surfaces

Possible future source surfaces:

- Instagram notifications surface;
- future approved follower surface;
- manual evidence packet supplied by Alejandro;
- future private artifact packet;
- future API/webhook investigation lane.

Rules:

- notifications-surface new follower groups are aggregate/viewport evidence;
- follower identity capture requires an exact future approval boundary;
- DM/audio send is a separate source-action boundary;
- no source surface may be used silently.

## New Follower Detection Model

A future approved detection run may produce private fields only inside an
approved private artifact:

- `run_id`;
- `detected_at`;
- `source_surface`;
- `source_health_state`;
- `newFollowerSignalClass`;
- `private_follower_anchor`;
- `dedupe_status`;
- `candidate_status`;
- `blocker_classes`;
- `closed_gates`.

Allowed `newFollowerSignalClass` values:

- `new_follower_notification_group`;
- `new_follower_private_anchor`;
- `manual_new_follower_evidence`;
- `source_health_only`;
- `unknown_or_ambiguous`.

CRM Core must not claim unique people unless private dedupe proves it.

## Private Dedupe And Already-Welcomed Safeguards

The private already-welcomed/welcome-history artifact must live outside the repo
under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

It may contain private anchors only. It must never be committed, pasted into
chat, copied to Mantis-Reports, stored in tracked docs, or stored in Mantis
general memory.

Allowed `dedupe_status` values:

- `new_candidate`;
- `already_welcomed`;
- `previously_seen_not_welcomed`;
- `duplicate_current_run`;
- `ambiguous_identity`;
- `suppression_or_safety_blocked`;
- `not_for_outreach`;
- `needs_private_review`.

Rules:

- never send welcome audio twice to the same private anchor;
- if already-welcomed status is unknown, block send;
- if identity is ambiguous, block send;
- if suppression/safety block exists, block send;
- detection does not imply send permission;
- story views do not imply send permission;
- email/MailerLite warmth does not imply Instagram DM permission.

## Welcome-Audio Candidate Queue

A future private candidate queue artifact must live under the same private
Instagram artifact folder:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Candidate fields may include privately:

- `private_follower_anchor`;
- `detected_at`;
- `source_surface`;
- `dedupe_status`;
- `welcome_history_status`;
- `candidate_status`;
- `recommended_operator_decision`;
- `blocker_classes`;
- `send_approval_state`.

Allowed `candidate_status` values:

- `candidate_pending_private_review`;
- `eligible_pending_send_approval`;
- `already_welcomed`;
- `blocked_identity_ambiguous`;
- `blocked_safety_or_suppression`;
- `blocked_source_health`;
- `blocked_missing_audio_content`;
- `not_for_outreach`.

The candidate queue is not CRM state, not a scoring system, and not send
permission.

## Welcome Audio Content Boundary

Welcome audio requires a separately approved content artifact or approved exact
audio asset.

Rules:

- no improvised audio;
- no generated audio unless separately approved;
- no send without exact asset approval;
- no personalization from private data unless separately approved;
- no private content printed in chat.

## Approval Boundaries

This design task grants none of the future approvals below.

### Detection-Only Approval

Allows one read-only source-health/new-follower detection run. Does not
authorize DMs or audio.

Required approval phrase:

```text
I approve one CRM Core Instagram new-follower detection run only. Use the approved browser/source route, write private anchors only to the private Instagram artifact folder, write redacted aggregate receipts, do not open DMs, do not send welcome audio, do not perform Instagram actions, and do not write CRM state.
```

### Candidate Queue Generation Approval

Allows creating/opening a private candidate queue from approved detection
artifacts. Does not authorize sending.

Required approval phrase:

```text
I approve CRM Core Instagram welcome-audio candidate queue generation from approved private new-follower artifacts only. Keep anchors private, do not print follower identities, do not open DMs, do not send audio, do not perform Instagram actions, and do not write CRM state.
```

### Send Approval

Requires exact candidates, exact content/audio asset, duplicate checks, and stop
conditions.

Required approval phrase:

```text
I approve CRM Core to send the approved welcome audio to the explicitly approved private candidate set only. Check already-welcomed history immediately before send, stop on any ambiguity, send no duplicates, do not improvise content, and write only redacted aggregate receipts.
```

## Browser/Backend Route

Use lessons from the browser orchestrator:

- preferred backend depends on exact route;
- no coordinate or screenshot fallback;
- no shared Safari private-route use unless isolation is proven;
- dedicated standard authenticated Safari may be used only under an approved
  route;
- Chrome Extension may be used only if route-specific visibility and account
  context are healthy;
- source routes must pass preflight and quality gates.

Do not choose or run a backend in this design.

## Redacted Receipts

Future receipts should live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- run status;
- source-health state;
- aggregate detected new follower groups;
- private anchors captured count;
- candidate count;
- already-welcomed count;
- blocked count by blocker;
- queue path label;
- send approval state;
- closed gates;
- recommended next safe step.

Receipts must not include:

- handles;
- profile URLs;
- private follower anchors;
- viewer identities;
- story content;
- screenshots;
- DMs;
- message bodies;
- private URLs;
- tokens, headers, env values, credentials, or private content.

## Stop Conditions

Stop any future execution on:

- failed browser/source preflight;
- login/checkpoint/CAPTCHA;
- unexpected modal;
- active computer use by Alejandro;
- wrong account context;
- source-action ambiguity;
- visible Instagram action risk;
- need to open DMs outside approval;
- need to send audio without exact send approval;
- already-welcomed ambiguity;
- identity ambiguity;
- missing approved audio asset;
- duplicate-risk ambiguity;
- private output exposure;
- coordinate or screenshot fallback requirement;
- source or CRM mutation requirement.

## What Remains Separate

The following remain separately approval-gated:

- actual new-follower detection run;
- private candidate queue generation;
- DM opening;
- welcome audio send;
- audio asset/content approval;
- CRM writes;
- Signal Event Ledger writes;
- Engagement Snapshot Ledger writes;
- card writes;
- Fact Store writes;
- scoring;
- outreach;
- source mutation;
- Launch OS.

## Closed Gates

- no Instagram execution in this task;
- no UI, Computer Use, or `@Chrome`;
- no DMs opened;
- no welcome audio sent;
- no Instagram action;
- no CRM writes;
- no ledgers/cards/Fact Store/scoring/outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

This design is complete when CRM Core has a no-run design for detecting new
followers and preparing a welcome-audio candidate lane with private dedupe,
already-welcomed safeguards, exact future approval boundaries, redacted
receipts, stop conditions, and all CRM/source/write gates closed.
