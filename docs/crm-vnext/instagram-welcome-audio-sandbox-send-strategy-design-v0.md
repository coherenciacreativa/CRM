# Instagram Welcome Audio Sandbox Send Strategy Design v0

Date: 2026-07-04
Status: no-run CRM Core design

## Purpose

This lane-local no-run design defines the future sandbox send strategy for the
Controlled Welcome Flow Proof.

It prepares the boundary for a later controlled welcome audio proof using an
Alejandro-owned or controlled Instagram test account and an explicitly approved
audio asset.

This document does not execute Instagram, open DMs, send welcome audio, inspect
private artifacts, generate a candidate queue, collect facts from Alejandro,
call APIs, use MailerLite/Gmail, write CRM/source state, write Mantis memory, or
use `/Users/alejandrogomez/CRM`.

## Relationship To Controlled Welcome Flow Proof Plan

This design implements the Welcome Audio sandbox-send planning lane from:

- `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`

It specifically supports Track B: Welcome Audio Asset And Sandbox Send Boundary.

The future controlled proof remains staged:

1. controlled new-follower evidence;
2. approved audio asset;
3. already-welcomed / send-history check;
4. sandbox candidate set and send approval packet;
5. controlled reply and email handoff boundary;
6. MailerLite no-write onboarding preview;
7. CRM card enrichment packet boundary.

This design does not move any later stage into execution.

## Sandbox Proof Scope

The future sandbox proof should be narrow:

- one Alejandro-owned or controlled Instagram test account;
- one exact controlled candidate set label;
- one exact approved audio asset id or future filepath label;
- one future send approval packet;
- one bounded welcome audio send attempt, only if separately approved later;
- redacted development and source/operator receipts only;
- fail-closed duplicate prevention.

The sandbox proof must not become a general follower outreach flow, recurring
automation, production send lane, MailerLite onboarding mutation, Gmail access
lane, CRM write packet, or Mantis/OpenClaw operator action.

## Current Non-Execution Status

This is design-only.

This task creates no real test candidate, real candidate set, real approval
packet, real asset approval, real receipt, real private artifact, real send
state, source-system state, or CRM/source state.

Consultant UI relay for this sprint is development process only. It is not
source UI authorization.

## Future Alejandro-Provided Facts

The following facts are required later but are not collected, inferred,
searched for, or validated now:

- test Instagram account label;
- confirmation that the test account is Alejandro-owned or controlled;
- intended Instagram account confirmation;
- approved audio asset label;
- approved audio asset id or future filepath label;
- candidate set label;
- candidate count;
- candidate set source receipt label;
- already-welcomed history artifact path label;
- send-history artifact path label;
- final duplicate/idempotency receipt label;
- whether the test audio is generic or personalized;
- whether the controlled test account will reply manually;
- whether reply may include email, name, city, country, or phone;
- MailerLite group, automation, and field labels for a later no-write preview.

Absence of any required future fact blocks execution. This design must not ask
Alejandro for those facts during this sprint.

## Test Account And Candidate Set Labeling Model

Future sandbox materials should use redacted labels, not handles or private
identity values.

Suggested future labels:

```yaml
test_account_label:
test_account_control_status: alejandro_owned_or_controlled | unknown
candidate_set_label:
candidate_set_source_receipt_label:
candidate_count:
expected_send_count:
candidate_set_scope: controlled_sandbox_only
```

Rules:

- no raw handles in tracked docs;
- no private anchors in chat;
- no candidate queue generation from this design;
- no widening from the named controlled test account;
- no send if the candidate count does not match the approval packet;
- no send if account control status is unknown.

## Approved Audio Asset Filepath And Label Boundary

Future approval must identify one exact approved audio asset.

Allowed future references:

- `audio_asset_id`;
- `approved_audio_asset_label`;
- `audio_asset_version`;
- `audio_asset_future_filepath_label`, if Alejandro later provides one;
- `asset_registry_status`;
- `asset_approval_receipt_label`.

This design does not collect, infer, validate, print, copy, store, or commit an
audio filepath. It does not inspect audio files or audio binary content.

The asset must be approved under a separate future boundary before any send.
Asset approval alone does not authorize a candidate queue, DM opening, send, or
CRM/source write.

## Already-Welcomed And Send-History Dependency

A future sandbox send must run final checks immediately before send:

- already-welcomed check;
- send-history check;
- duplicate/idempotency check;
- blocker review.

If already-welcomed history, send-history state, identity state, source route,
or idempotency state is unknown, the send must block.

This design does not inspect the future already-welcomed or send-history private
artifacts.

## Candidate Queue Dependency And Closed Gate

Candidate queue generation remains closed.

A future sandbox send cannot be prepared from detection alone. It requires a
separately approved controlled candidate packet or candidate set label.

This design does not create a real candidate queue, candidate set, candidate
reference, candidate receipt, or private candidate artifact.

## Future Sandbox Send Approval Packet Requirements

A future sandbox send approval packet must bind:

- exact `approval_packet_id`;
- exact `candidate_set_label`;
- exact `candidate_count`;
- exact `expected_send_count`;
- exact `audio_asset_id`;
- approved audio asset label and version;
- asset registry status;
- asset approval receipt label;
- reviewer/approver reference;
- operator approval reference, if separate;
- already-welcomed history artifact label;
- send-history artifact label;
- final already-welcomed check;
- final send-history check;
- final duplicate/idempotency check;
- blocker counts;
- redacted receipt destination path;
- private send artifact label;
- exact packet-specific future approval phrase.

The controlling template remains:

- `docs/crm-vnext/instagram-welcome-audio-send-approval-packet-template-v0.md`

This design references that template but does not modify it.

## Reply Monitoring Separation

Welcome audio send does not authorize reply monitoring.

A later reply-monitoring boundary must separately define:

- whether the test account will reply manually;
- whether reply monitoring uses UI, API/webhook, or manual evidence;
- what compact reply indicators are allowed;
- what private reply content remains forbidden in chat;
- when to stop.

No reply monitoring is authorized here.

## Email Handoff Separation

If the controlled test account replies with email, name, country, city, phone,
or other handoff details, that evidence requires a separate private review
boundary.

This design does not open DMs, inspect message bodies, collect email handoff
evidence, print private content, or write CRM/source state.

## MailerLite Separation

MailerLite onboarding remains a later no-write design and preview lane.

The sandbox send does not authorize:

- MailerLite API calls;
- MailerLite UI;
- subscriber lookup;
- subscriber mutation;
- group or field mutation;
- automation mutation;
- campaign mutation.

MailerLite labels are future Alejandro-provided facts and are not collected in
this sprint.

## CRM Card Enrichment Separation

CRM card enrichment remains a later packet boundary.

This design does not write:

- CRM cards;
- ledgers;
- Fact Store;
- scoring;
- source-result ledgers;
- outreach records;
- CRM/source state.

Any future card enrichment packet must be no-write preview first and separately
approved before application.

## Storage And Receipt Paths

CRM Core development telemetry may use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/
```

Consultant relay telemetry may use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

CRM Core development-private infrastructure may use:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/
```

The private consultant target registry path is:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

These paths are referenced as design boundaries only. This design does not
create operational receipts, private artifacts, source artifacts, or target
registry entries.

Raw target URLs must never be printed in chat, CRM-Core-Reports,
Mantis-Reports, tracked docs, receipts, or returned output.

## Source Operator Receipt And Private Source Artifact Separation

Future source/operator receipts may use:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Only under a future approved source/operator run.

Future source private artifacts may use:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/
```

Only under future approved source evidence.

This design does not write to Mantis-Reports or Mantis-Private-Source-Artifacts.
It does not write Mantis memory. It does not inspect OpenClaw/Mantis workspace
contents.

## Future Approval Phrase Templates

### Future Controlled Candidate Packet

```text
I approve CRM Core to prepare one controlled welcome-flow candidate packet for the explicitly named Alejandro-owned or controlled test account label <test_account_label>. Do not open Instagram, open DMs, send welcome audio, inspect private artifacts beyond the approved packet inputs, generate production candidate queues, or write CRM/source state.
```

### Future Controlled Sandbox Send

```text
I approve CRM Core to perform one controlled welcome audio sandbox send to the explicitly approved Alejandro-owned or controlled test account only, using the approved audio asset <audio_asset_id> and approved candidate packet <candidate_set_label>. Do not send to any other account, do not open unrelated DMs, do not perform any non-send Instagram action, do not use MailerLite or Gmail, do not write CRM/source state, and write only approved private send artifacts plus redacted receipts.
```

### Future Controlled Reply Monitoring

```text
I approve CRM Core to perform one controlled reply monitoring and email handoff private review for the explicitly approved test account only. Do not print private message content, do not open unrelated DMs, do not export broad message history, do not mutate Instagram, and do not write CRM/source state.
```

These phrases are templates only. They do not authorize execution.

## Stop Conditions

Stop before any future send if:

- test account label is missing;
- test account control status is not confirmed;
- candidate set label is missing;
- candidate count does not match expected send count;
- approved audio asset id or label is missing;
- audio asset status is not approved sendable;
- audio filepath is missing, ambiguous, or not explicitly supplied later;
- asset approval receipt is missing;
- final already-welcomed check is not passed;
- final send-history check is not passed;
- final duplicate/idempotency check is not passed;
- blocker counts are nonzero;
- private artifact path is inside the repo;
- receipt path is inside the repo;
- approval phrase is missing or not exact;
- send would require opening unrelated DMs;
- any route implies source mutation, CRM write, MailerLite/Gmail access, Mantis
  memory write, or OpenClaw/Mantis workspace use.

## Closed Gates

This design preserves these closed gates:

- no execution;
- no source UI;
- no Instagram;
- no DMs;
- no welcome audio send;
- no candidate queue generation;
- no MailerLite;
- no Gmail;
- no Meta Business Suite;
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

Welcome Audio lane now has a no-run sandbox send strategy design for the
Controlled Welcome Flow Proof. It defines the future test-account, candidate
set, approved-audio, already-welcomed/send-history, duplicate-prevention,
reply/email handoff, MailerLite, CRM enrichment, storage, approval phrase, stop
condition, and closed-gate boundaries needed before any future controlled
sandbox send can be considered. No send, DM opening, candidate queue, source
action, private artifact inspection, Mantis memory write, or CRM/source write is
authorized.

## Next Safe Step

Relay this artifact to the Welcome Audio consultant for review. If the
consultant returns green, commit lane-locally only. Central integration remains
separate and unapproved.

## Completion Boundary

This task is complete when CRM Core has a reviewed no-run sandbox send strategy
design that can be considered later for central integration without opening any
execution gate.
