# Instagram Reply Monitoring And Email Handoff Boundary Design v0

Date: 2026-07-05
Status: no-run CRM Core lane design

## Purpose

Define the future boundary for reply monitoring and email handoff after a
separately approved controlled welcome audio send.

This artifact is lane-local, no-run, and docs-only. It does not execute
Instagram, open DMs, monitor replies, send welcome audio, inspect private
artifacts, generate candidate queues, collect facts from Alejandro, call APIs,
use MailerLite or Gmail, write CRM/source state, touch Launch OS, write Mantis
memory, inspect OpenClaw/Mantis workspace content, or use
`/Users/alejandrogomez/CRM`.

## Relationship To Controlled Welcome Flow Proof Plan

This design supports Track C from:

- `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`

It covers the boundary between an approved controlled welcome send and any later
reply review, email/name/city/country/phone handoff, MailerLite no-write
payload preview, CRM enrichment preview, or assistant reply policy.

It does not mark reply monitoring, email handoff extraction, MailerLite
onboarding, CRM enrichment, or outreach as complete.

## Relationship To Welcome Audio Sandbox Send Strategy

The welcome audio sandbox send strategy defines how a future controlled welcome
audio send may be prepared only after a controlled candidate set, approved audio
asset, send approval packet, and final dedupe gates.

This reply boundary starts only after a future send receipt exists. A send
receipt is not permission to open DMs or monitor replies unless a separate reply
monitoring approval is present.

## Relationship To Controlled Candidate Queue And Send Approval Packet Design

The controlled candidate queue and sandbox send approval packet design separates
detection, queue generation, send approval, and duplicate checks.

This document adds the next downstream boundary:

```text
approved controlled send receipt
-> reply monitoring approval
-> private reply evidence review
-> email/name/city/country/phone handoff candidate classification
-> MailerLite no-write payload preview approval
-> CRM enrichment preview approval
```

None of those downstream steps are authorized here.

## No-Run Status

This design does not:

- open DMs;
- inspect message threads;
- monitor replies;
- parse private messages;
- extract emails, names, cities, countries, or phones;
- draft or send assistant replies;
- use Instagram API/webhooks;
- create a MailerLite payload;
- create a CRM enrichment packet;
- write source or CRM state.

Consultant UI relay used to review this artifact is development process only.
It is not source access.

## Reply Monitoring Boundary

Future reply monitoring is a private-review boundary that may check whether a
controlled test account replied after a separately approved welcome send.

It must be approved with:

- exact send receipt label;
- exact candidate set label;
- exact test account label;
- reply watch window label;
- allowed route: UI, API/webhook source-health, or manual evidence;
- private artifact path label;
- redacted receipt path label;
- allowed fields to classify;
- stop conditions.

Reply monitoring must not become general DM inbox triage, relationship scoring,
outreach, or assistant conversation.

## Trigger Preconditions

Before any future reply monitoring, all of these must exist:

- approved controlled welcome send receipt;
- approved candidate set label;
- approved audio asset label;
- final already-welcomed and send-history checks from the send boundary;
- exact reply monitoring approval phrase;
- private artifact folder approved for reply evidence;
- redacted receipt folder approved for aggregate receipt;
- no ambiguity about whether the controlled test account is in scope.

If any precondition is missing, stale, ambiguous, or path-nonconforming, reply
monitoring must stop.

## Reply Watch Cadence Model

Future cadence should be explicit and bounded.

Suggested model:

```yaml
reply_watch_window_label:
reply_watch_start_after_send: immediate | after_delay | manual_only
reply_watch_check_count:
reply_watch_check_spacing:
max_total_watch_duration:
route: manual_evidence | instagram_ui_private_review | api_webhook_source_health
```

Rules:

- no recurring monitoring without separate approval;
- no background automation from this design;
- no DM opening unless approved for the exact check;
- no broad inbox review;
- no reply interpretation outside the approved fields.

## Conversation State Model

Future receipts may use redacted conversation-state classes:

- `no_reply_observed`;
- `reply_indicator_observed`;
- `reply_private_evidence_captured`;
- `handoff_candidate_present`;
- `handoff_candidate_absent`;
- `needs_human_review`;
- `blocked_by_private_content_boundary`;
- `blocked_by_source_route`;
- `blocked_by_identity_ambiguity`;
- `blocked_by_policy_or_consent`.

These classes are not CRM state and must not be written to cards, ledgers, Fact
Store, scoring, or source-result ledgers without a later write-packet approval.

## Private Reply Evidence Model

Future private reply evidence must live outside the repo.

Use only:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include reply snippets or message metadata only if a
future approval explicitly allows it. They must never be committed, pasted into
chat, copied into tracked docs, stored in Mantis general memory, or copied into
standard receipts.

## Handoff Candidate Rules

Future email/name/city/country/phone extraction is a separate private evidence
classification step.

Allowed future handoff candidate fields, if separately approved:

```yaml
email_candidate_present: true | false | unknown
name_candidate_present: true | false | unknown
city_candidate_present: true | false | unknown
country_candidate_present: true | false | unknown
phone_candidate_present: true | false | unknown
confidence: high | medium | low | ambiguous
human_review_required: true | false
```

Rules:

- do not print values in chat or tracked docs;
- do not infer consent from a reply;
- do not send to MailerLite from evidence alone;
- do not write CRM cards from evidence alone;
- classify ambiguous evidence as human review required.

## Human Escalation Classes

Escalate before any downstream action when:

- message content is ambiguous;
- reply contains sensitive personal content;
- consent is unclear;
- identity is ambiguous;
- the reply appears unrelated to the controlled test;
- any private content would need to be shown in chat;
- the route requires broader DM review;
- source/platform state is unstable;
- a downstream MailerLite or CRM write is requested.

## Assistant, Mantis, And Mati Reply Separation

Reply monitoring does not authorize assistant conversation.

Mantis, Mati, or any CRM assistant may later help design reply policy, but must
not reply to Instagram users, draft personalized outreach, continue a DM
conversation, or store private reply contents in general memory without a
separate exact approval.

Assistant reply policy is a future design lane, not execution.

## MailerLite No-Write Handoff Separation

MailerLite onboarding remains separate and no-write until explicitly approved.

A future email handoff may feed a no-write MailerLite payload preview only after
private evidence review and a separate MailerLite approval boundary.

This design does not authorize:

- MailerLite API calls;
- MailerLite UI access;
- subscriber upsert;
- group assignment;
- field mutation;
- automation enrollment;
- campaign sends;
- Gmail access.

## CRM Card Enrichment Separation

CRM enrichment remains a separate no-write preview and write-packet boundary.

Reply evidence does not authorize:

- card writes;
- Signal Event Ledger writes;
- Engagement Snapshot Ledger writes;
- source-result ledger writes;
- Fact Store writes;
- scoring writes;
- outreach writes.

Future CRM enrichment must begin as a no-write preview and require separate
approval before application.

## API/Webhook Route

The API/webhook route remains future source-health only.

Messaging, replies, and webhooks may be plausible for eligible professional
accounts, but setup readiness, app configuration, App Review, Advanced Access,
webhook readiness, and source permissions remain unproven unless separately
verified.

This document does not authorize API calls, app configuration, webhook setup,
token handling, or live reply monitoring.

## UI Or Manual Route

Future UI or manual routes require exact approval.

UI routes must be bounded to the approved conversation or source surface and may
not broaden into general DM inbox review. Manual evidence may be acceptable if
Alejandro provides a redacted packet or private artifact label under a future
approval.

## Redacted Receipt Model

Future redacted reply receipts should live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Consultant relay development receipts should live only under:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Redacted receipts may include:

- reply monitoring approval packet ID;
- controlled send receipt label;
- candidate set label;
- route;
- aggregate reply state counts;
- blocker classes;
- handoff candidate field availability counts;
- private artifact path labels only;
- closed gate confirmations;
- recommended next safe step.

Receipts must not include names, emails, phone numbers, handles, DMs, message
bodies, screenshots, private URLs, raw source data, private anchors, tokens,
cookies, headers, env values, credentials, or private content.

## Future Approval Phrase Templates

### Reply Monitoring Private Review

```text
I approve one CRM Core Instagram reply monitoring private review for the approved controlled welcome send receipt only. Use the approved route, write private reply evidence only to the private Instagram artifact folder, write redacted aggregate receipts, do not print message content, do not send replies, do not use MailerLite or Gmail, do not generate CRM writes, and do not perform Instagram actions.
```

### Email Handoff Private Evidence Extraction

```text
I approve one CRM Core private email handoff evidence extraction from the approved reply evidence artifact only. Classify email/name/city/country/phone availability privately, write only redacted aggregate receipts, do not print values in chat, do not call MailerLite or Gmail, do not write CRM state, and do not perform outreach.
```

### Assistant Reply Policy Design

```text
I approve CRM Core to design, but not execute, an assistant reply policy for controlled Instagram replies. Do not open DMs, do not send replies, do not inspect private artifacts, do not call APIs, and do not write CRM/source state.
```

### MailerLite No-Write Payload Preview

```text
I approve CRM Core to design a no-write MailerLite payload preview from approved redacted email handoff evidence only. Do not call MailerLite, do not mutate subscribers, groups, fields, automations, campaigns, or webhooks, do not use Gmail, and do not write CRM/source state.
```

### CRM Enrichment Preview

```text
I approve CRM Core to design a no-write CRM enrichment preview from approved redacted reply/email handoff evidence only. Do not write cards, ledgers, Fact Store, scoring, source-result ledgers, outreach, or source state.
```

## Stop Conditions

Stop before future execution if:

- approval phrase is missing or modified;
- send receipt is missing or ambiguous;
- candidate set label is missing or ambiguous;
- route would require broad DM review;
- source-health state is blocked or unknown;
- private artifact path is outside the approved folder;
- redacted receipt path is outside the approved folder;
- message content would need to be printed in chat;
- handoff values would need to be printed in chat;
- downstream MailerLite or CRM mutation is requested;
- assistant reply or outreach is requested;
- any CRM/source write would occur.

## Closed Gates

- no execution;
- no source UI;
- no Instagram;
- no API calls;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DM opening;
- no reply monitoring;
- no welcome audio send;
- no candidate queue generation;
- no MailerLite;
- no Gmail;
- no private artifact inspection;
- no CRM/source writes;
- no ledgers;
- no cards;
- no Fact Store;
- no scoring;
- no outreach;
- no source mutation;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

Integrate
`docs/crm-vnext/instagram-reply-monitoring-email-handoff-boundary-design-v0.md`
as a lane-owned, no-run Instagram API/source-readiness artifact for the
Controlled Welcome Flow Proof. The artifact connects future approved welcome
audio send receipts to private reply evidence, email/name/city/country/phone
handoff candidates, MailerLite no-write payload preview, CRM enrichment
preview, and assistant reply policy, while keeping DM opening, reply
monitoring, MailerLite/Gmail access, CRM/source writes, outreach, source
actions, Launch OS, Mantis memory, OpenClaw/Mantis workspace, and
`/Users/alejandrogomez/CRM` closed.

## Next Safe Step

Relay this artifact to the Instagram API/source-readiness consultant for
selected-task review.

If accepted and committed lane-locally, request Chief Architect Integration
Consultant review before any central integration.

## Completion Boundary

This design is complete when CRM Core has a lane-local, no-run reply monitoring
and email handoff boundary that defines future trigger preconditions, cadence,
private evidence behavior, handoff candidate rules, assistant reply separation,
MailerLite/CRM separation, approval phrases, receipts, stop conditions, and
closed gates without opening DMs, monitoring replies, extracting private
content, or writing CRM/source state.
