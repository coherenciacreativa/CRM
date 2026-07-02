# Instagram Welcome Audio Asset Registry And History Packet v0

Date: 2026-07-02
Status: no-run CRM Core design

## Purpose

This lane-local no-run design defines the approved audio asset registry and
already-welcomed/send-history packet required before any future candidate queue
or welcome audio send approval.

This document does not authorize:

- DM opening;
- welcome audio send;
- candidate queue generation;
- Instagram actions;
- MailerLite or Gmail access;
- CRM/source writes;
- private artifact inspection.

This document creates no private artifacts, no source-system state, no
operational receipts, no candidate sets, and no send approval packet.

## Current Welcome Audio Boundary

The controlling boundary remains
`docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`.

Welcome Audio send remains a separate closed action boundary. Detection does
not imply send permission. Candidate existence does not imply send permission.
Universal business eligibility for confirmed new Instagram followers is not
send permission.

Reply monitoring, MailerLite onboarding, Gmail/email handoff, and CRM writes
remain separate approval gates. Nothing in this design changes those gates.

## Business Eligibility Carry-Forward

Every confirmed new Instagram follower is business-eligible.

Business eligibility does not grant send permission. New-follow eligibility,
candidate existence, source health, story views, MailerLite/Gmail warmth, asset
registry presence, and already-welcomed-history absence do not grant send
permission.

A future send still requires an exact approved candidate set, exact approved
audio asset, final dedupe check, and exact send approval boundary.

Absence from already-welcomed/send-history artifacts is not proof of
eligibility to send unless checked under a future approved private route and
bounded approval packet.

## Approved Audio Asset Registry Model

The future audio asset registry is a private-control design surface for naming
assets that may be eligible for future packet-specific approval. Registry
presence does not authorize candidate queue generation, DM opening, welcome
audio send, Instagram action, or CRM/source writes.

Future registry fields:

- `audio_asset_id`
- `audio_asset_label`
- `asset_storage_location_label`
- `approved_by`
- `approved_at`
- `language`
- `version`
- `duration_class`
- `content_scope`
- `personalization_allowed`
- `send_allowed`
- `retired_at`
- `replacement_asset_id`
- `approval_receipt_label`
- `asset_status`

Allowed `asset_status` values:

- `draft_not_sendable`
- `approved_sendable`
- `retired`
- `superseded`
- `blocked`

Rules:

- no improvised audio;
- no generated audio unless separately approved;
- no personalization from private data unless separately approved;
- no send without exact asset approval;
- retired assets must not be sent;
- replacement assets require their own approval;
- audio binary must not be stored in repo unless separately approved;
- audio transcription must not be printed in chat unless separately approved;
- real asset approval remains separate from this design.

## Audio Asset Fields

`audio_asset_id` is the stable label for a single approved asset version.
`audio_asset_label` is a human-readable redacted label. `language` identifies
the asset language. `version` identifies the specific content version.
`duration_class` records broad duration only, such as short, medium, or long.
`content_scope` describes the permitted use case without exposing private
message content.

`personalization_allowed` must default to false unless a later approval
explicitly permits personalization. `send_allowed` is an asset-level eligibility
flag only and does not authorize a send. `asset_status` controls whether the
asset can be considered in a future send packet.

## Asset Versioning And Retirement Rules

Every asset version needs its own `audio_asset_id`. Approval does not transfer
automatically from one version to another.

Retired assets block send. Superseded assets require a replacement linkage via
`replacement_asset_id`, and the replacement asset requires its own approval.

If asset status is unknown, ambiguous, blocked, retired, or superseded without
a confirmed replacement approval, send is blocked.

## Exact Asset Approval Requirements

A future asset approval must name:

- exact asset id;
- asset label;
- language;
- version;
- content scope;
- `send_allowed` status;
- whether personalization is allowed;
- candidate set label, if send is being approved;
- redacted receipt path.

Asset approval alone does not authorize candidate queue generation. Asset
approval alone does not authorize sending. Send requires exact candidate set and
final duplicate check.

## Already-Welcomed Private History Model

Future private already-welcomed history fields:

- `private_follower_anchor`
- `audio_asset_id`
- `welcome_send_attempt_id`
- `sent_at`
- `send_status`
- `source_surface`
- `dedupe_result`
- `operator_approval_ref`
- `receipt_label`
- `history_record_status`

Allowed `history_record_status` values:

- `sent_confirmed`
- `send_attempted_status_unknown`
- `not_sent`
- `blocked_duplicate_risk`
- `blocked_identity_ambiguous`
- `blocked_safety_or_suppression`
- `blocked_history_unknown`

Rules:

- never send duplicate welcome audio to the same private follower anchor;
- unknown already-welcomed status blocks send;
- ambiguous prior send status blocks send;
- identity ambiguity blocks send;
- suppression or safety status blocks send;
- if the private history artifact cannot be read under an approved route, block
  send rather than guessing.

## Send-History Private Artifact Behavior

Future already-welcomed history, send history, candidate references, and private
follower anchors must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may contain private anchors and send-history state only under
approved future routes.

Rules:

- never commit private artifacts;
- never paste private artifact contents into chat;
- never copy private contents to Mantis-Reports;
- never store private contents in tracked docs or general memory;
- private artifact path labels may be used in receipts;
- no private artifact inspection is authorized by this design;
- this design must not create, inspect, read, print, mutate, or validate private
  artifacts.

## Duplicate-Prevention And Fail-Closed Idempotency

A final already-welcomed check is required immediately before any future send.
A final duplicate check is required immediately before any future send.

Block rather than infer when:

- duplicate state is unknown;
- idempotency state is unknown;
- candidate identity is ambiguous;
- source route is unstable;
- any confirmation cannot be written as a redacted receipt.

Suggested idempotency keys:

- `private_follower_anchor`
- `audio_asset_id`
- `welcome_send_attempt_id`
- `candidate_set_label`
- `operator_approval_ref`
- `send_receipt_label`

Duplicate prevention must fail closed. Cached checks, visible reports, source
health, and business eligibility cannot replace immediate pre-send dedupe.

## Candidate-Set Dependency And Closed Queue Gate

Candidate queue generation remains separately approval-gated. This packet does
not generate a candidate queue. This packet does not inspect candidate private
artifacts.

No send can occur without an explicitly approved candidate set. Candidate sets
must be private and redacted in receipts. Candidate count may be reported, but
private anchors must not be printed.

This design must not create candidate queues, candidate sets, approval packets
for real sends, real asset approvals, private artifacts, receipts, or
source-system state.

## Redacted Receipt Behavior

Future redacted send-boundary receipts must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate candidate count;
- approved audio asset label/id;
- already-welcomed check status;
- duplicate-check status;
- expected send count;
- blocked count by blocker;
- send approval state;
- send performed false/true;
- closed gates;
- next safe step.

Receipts must not include:

- handles;
- names;
- DMs;
- private anchors;
- audio binary;
- private message content;
- raw follower rows;
- profile URLs;
- private URLs;
- tokens;
- secrets;
- headers;
- cookies;
- env values;
- credentials.

This task designs receipt behavior only. It must not create real operational
receipts for a send, candidate queue, private history check, private artifact
read, Instagram action, MailerLite/Gmail action, or CRM write.

## Future Approval Phrases

This current document grants none of the approval phrases below.

### Audio Asset Registry Entry

Suggested phrase:

```text
I approve CRM Core to record the welcome audio asset registry entry <audio_asset_id> as an approved sendable asset for future packet-specific welcome audio approvals. Do not send audio, do not open DMs, do not generate a candidate queue, do not inspect private follower artifacts, do not write CRM state, and write only redacted asset-registry receipts.
```

### Already-Welcomed History Packet Design / Preparation

Suggested phrase:

```text
I approve CRM Core to prepare the no-send already-welcomed and send-history packet for the explicitly approved private candidate set <candidate_set_label>. Do not open DMs, do not send audio, do not generate new candidates, do not print private anchors or identities, do not write CRM state, and write only redacted aggregate receipts.
```

### Welcome Audio Send

Use or align with the existing send approval phrase from
`docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`:

```text
I approve CRM Core to send the approved welcome audio asset <audio_asset_id> to the explicitly approved private candidate set <candidate_set_label> only. Check already-welcomed history and send history immediately before send, stop on any ambiguity, send no duplicates, do not improvise or personalize content, do not open unrelated DMs or profiles, do not write CRM state, do not mutate source systems, and write only redacted receipts.
```

## Stop Conditions

Stop future work on:

- missing exact audio asset;
- missing approved candidate set;
- missing already-welcomed history;
- duplicate risk;
- already-welcomed unknown;
- idempotency unknown;
- identity ambiguity;
- suppression/safety block;
- source route instability;
- unexpected modal;
- need to open unrelated profile/thread;
- request to personalize/improvise;
- private output exposure;
- CRM write temptation;
- source mutation requirement;
- any source action outside exact approval.

## Closed Gates

The following remain closed:

- no execution;
- no API calls;
- no UI, Computer Use, or `@Chrome`;
- no Instagram;
- no DMs;
- no welcome audio send;
- no candidate queue generation;
- no MailerLite;
- no Gmail;
- no private artifact inspection;
- no CRM writes;
- no scoring, ledgers, cards, Fact Store, outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

Welcome Audio lane now has a no-run asset registry and
already-welcomed/send-history packet design. It defines asset registry fields,
asset approval rules, private send-history behavior, duplicate prevention,
fail-closed idempotency, redacted receipts, future approval phrases, and closed
gates. No send, candidate queue, DM, source action, private artifact inspection,
or CRM write is authorized.

## Next Safe Step

The next safe step is consultant relay review of this artifact, followed by a
lane-local commit only if reviewed green.

No send or candidate queue is authorized.

## Completion Boundary

This design is complete when the Welcome Audio lane has a no-run design for
asset registry, already-welcomed/send-history, duplicate prevention, receipt
behavior, exact future approvals, stop conditions, and closed gates before any
candidate queue or welcome audio send.
