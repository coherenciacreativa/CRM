# Instagram-to-MailerLite Welcome System Architecture v0

Date: 2026-06-24
Status: no-run CRM Core architecture

## Purpose

Define the target CRM Core operating system that turns Instagram new-follower
and reply signals into safe onboarding actions:

- detect new followers;
- deduplicate them privately;
- maintain already-welcomed history;
- prepare a welcome-audio candidate queue;
- require explicit send approval;
- monitor replies;
- extract email/name/country/city/phone only under approved boundaries;
- create MailerLite onboarding packets;
- prepare CRM write packets;
- keep all actions idempotent and auditable.

This document does not authorize execution, API calls, UI work, DMs, audio send,
MailerLite mutation, CRM writes, scoring, outreach, or source mutation.

## Architecture Layers

### 1. Source Layer

Possible source adapters:

- Instagram notifications;
- Instagram follower-source route;
- Instagram DMs/replies;
- manual evidence packet;
- future Meta/Instagram API or webhook;
- MailerLite API;
- Gmail/email reply metadata;
- CRM Core private artifacts.

Rules:

- API/webhook is preferred over UI where safe and available;
- UI is a fallback/gap-filler, not the core system;
- all source routes need source-health and redacted receipts.

### 2. Private Evidence Layer

Artifacts must live outside the repo:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite/
```

Core private concepts:

- `private_follower_anchor`;
- `private_instagram_identity_anchor`;
- `private_email_anchor`;
- `welcome_history_record`;
- `dm_reply_evidence`;
- `email_handoff_evidence`;
- `mailerlite_onboarding_evidence`;
- `crm_write_packet_candidate`.

Never print private anchors or raw identities in chat or redacted receipts.

### 3. Decision Layer

Queues:

- `new_follower_detection_artifact`;
- `welcome_audio_candidate_queue`;
- `send_approval_packet`;
- `reply_monitoring_queue`;
- `email_handoff_private_review_queue`;
- `mailerlite_onboarding_queue`;
- `crm_write_packet_queue`.

Queues are not CRM state, not scoring, and not action permission unless the
exact approval boundary says so.

### 4. Action Layer

Actions remain separately approval-gated:

- DM opening;
- welcome audio send;
- reply monitoring;
- MailerLite upsert/add-to-group;
- CRM write packet application.

No action may run from detection alone.

## State Machine

States:

- `detected_new_follower`;
- `deduped_new_candidate`;
- `already_welcomed`;
- `blocked_identity_ambiguous`;
- `blocked_safety_or_suppression`;
- `eligible_pending_send_approval`;
- `send_approved`;
- `welcome_sent`;
- `reply_monitoring_pending`;
- `reply_seen`;
- `email_handoff_candidate`;
- `mailerlite_onboarding_pending`;
- `mailerlite_onboarded`;
- `crm_write_packet_pending`;
- `crm_write_approved`;
- `crm_written`;
- `not_for_outreach`.

Rules:

- no state transition may skip dedupe;
- no send without already-welcomed check immediately before send;
- no MailerLite onboarding without email evidence;
- no CRM write without explicit CRM write packet approval;
- Instagram story views never imply send permission;
- email engagement never implies Instagram DM permission.

## Idempotency Keys

Keys:

- `private_follower_anchor`;
- `welcome_audio_asset_id`;
- `welcome_send_attempt_id`;
- `welcome_history_record_id`;
- `dm_reply_event_id`;
- `email_handoff_evidence_id`;
- `mailerlite_subscriber_key`;
- `mailerlite_onboarding_operation_id`;
- `crm_write_packet_id`.

Rules:

- never send duplicate welcome audio to the same private follower anchor;
- if idempotency state is unknown, block;
- every action receipt must include a redacted idempotency result.

## Welcome Audio Boundary

- exact approved audio asset required;
- no improvised audio;
- no generated audio unless separately approved;
- no personalization from private data unless separately approved;
- send approval must name the candidate set and asset;
- final duplicate check required immediately before send.

## Reply Monitoring Boundary

- reply monitoring is separate from send;
- opening DMs/replies requires exact future approval;
- private reply content must not be printed in chat;
- email/name/country/city/phone extraction is separate private review evidence;
- any email handoff requires private review before MailerLite or CRM actions.

## MailerLite Onboarding Boundary

Design only.

If a reply or manual evidence yields email and consent/context:

- prepare MailerLite onboarding packet;
- possible future API operation:
  - upsert subscriber;
  - set fields such as name, country, city, phone, Instagram handle/private
    anchor;
  - add to approved onboarding group;
  - write redacted receipt;
- no MailerLite mutation is authorized by this architecture;
- group/automation mapping requires a future exact approval and source-health
  check.

## CRM Write Packet Boundary

Design only.

CRM writes may be proposed only after:

- Instagram private anchor;
- email/person evidence;
- source provenance;
- MailerLite onboarding status, if applicable;
- suppression/safety checks;
- duplicate checks.

No direct CRM write from Instagram, DM, or MailerLite signal.

## Source Health Matrix

| Component | Preferred route | Fallback | Current status | Next proof needed |
| --- | --- | --- | --- | --- |
| New follower event | API/webhook if available | notifications/follower UI/manual | notifications route healthy but zero signal | bounded follower-source route or API spike |
| Welcome audio send | official safe source action if available | UI only if approved | unapproved | send boundary and duplicate check |
| DM reply monitoring | API/webhook if available | UI/private review | unapproved | source-health spike |
| Email handoff extraction | private DM evidence/manual | none | unapproved | private review boundary |
| MailerLite onboarding | MailerLite API | manual export/import | design-only | API no-write/dry-run/source-health |
| CRM write | CRM Core write packet | none | closed | write approval packet |

## API-vs-UI Strategy

- official APIs/webhooks are preferred for reliability;
- UI is accepted only as bounded fallback;
- no UI route should become permanent if API can supply the same signal safely;
- API availability must be proven by source-health spike;
- no secret, token, credential, payload, webhook secret, or private content may
  be printed.

## Implementation Phases

### Phase 0: Current

- story R&D closed;
- notifications detection healthy but zero signal;
- welcome lane design exists.

### Phase 1: Source Health Spikes

- Meta/Instagram API/webhook source-health spike;
- MailerLite onboarding API source-health/no-write design;
- bounded follower-source route design if API is not immediately viable.

### Phase 2: Detection And Dedupe

- detect new follower anchors;
- build welcome history;
- generate private candidate queue only after approval.

### Phase 3: Send

- exact audio asset;
- approved candidate set;
- final dedupe;
- send receipt.

### Phase 4: Reply And Onboarding

- monitor reply;
- extract email/name/country/city/phone under approval;
- MailerLite onboarding;
- CRM write packet.

## Recommended Next Two Spikes

### 1. `crm_core_instagram_meta_api_source_health_spike_awaiting_approval_v0`

Purpose:

- research or verify official Meta/Instagram API/webhook capabilities for:
  - new followers;
  - DMs/replies;
  - messaging/audio send;
  - webhooks;
  - required account type, permissions, app review, business verification.

No implementation, no secrets, no API calls unless approved.

### 2. `crm_core_mailerlite_onboarding_api_no_write_design_v0`

Purpose:

- design no-write MailerLite onboarding API route:
  - fields;
  - groups;
  - automation trigger assumptions;
  - idempotency;
  - receipts;
  - exact future approval phrase before any upsert/group mutation.

No MailerLite mutation.

## Redacted Receipts

Future receipts may include:

- aggregate counts;
- queue counts;
- candidate statuses;
- send approval state;
- already-welcomed counts;
- duplicate blocks;
- source-health states;
- MailerLite onboarding status counts;
- CRM write packet counts;
- closed gates;
- next safe route.

Receipts must not include:

- handles;
- emails;
- phone numbers;
- names;
- addresses;
- private anchors;
- message bodies;
- audio files;
- DMs;
- screenshots;
- tokens;
- headers;
- env values;
- credentials;
- private content.

## Stop Conditions

Stop on:

- source auth ambiguity;
- credential/secret exposure risk;
- duplicate send ambiguity;
- identity ambiguity;
- missing approved audio asset;
- unapproved DM opening;
- unapproved MailerLite mutation;
- unapproved CRM write;
- private output exposure;
- source action ambiguity;
- browser/UI instability;
- any request to skip approval gates.

## Closed Gates

- no execution;
- no API calls;
- no UI;
- no `@Chrome`;
- no DMs;
- no welcome audio;
- no MailerLite mutation;
- no CRM writes;
- no ledgers/cards/Fact Store/scoring/outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

Complete when CRM Core has a no-run architecture for the Instagram-to-MailerLite
welcome system, including source coverage, private anchors, welcome history,
candidate queues, send approval, reply monitoring, email handoff, MailerLite
onboarding, CRM write packets, source-health spikes, receipts, idempotency, stop
conditions, and closed gates.
