# Instagram Welcome Audio First Controlled Execution Approval Packet v0

Date: 2026-07-05
Status: no-run lane-local design

Task id: `crm_core_controlled_welcome_flow_first_execution_approval_packet_v0`

## Purpose

Define the first future controlled execution approval packet for the CRM Core
Controlled Welcome Flow Proof.

This artifact does not execute Instagram, open DMs, send welcome audio, call
APIs, use MailerLite or Gmail, inspect private source artifacts, generate a
candidate queue, create a real approval packet, create real send state, write
CRM/source state, touch Launch OS docs, write Mantis memory, inspect
OpenClaw/Mantis workspace content, or use `/Users/alejandrogomez/CRM`.

It is a no-run design artifact that explains what Alejandro would later need to
approve before one controlled welcome-audio sandbox send could happen.

## Relationship To Controlled Welcome Flow Proof Plan

This design supports the Controlled Welcome Flow Proof sequence in:

- `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`

The future proof remains staged:

```text
controlled new-follower evidence
-> controlled candidate queue approval
-> approved welcome audio asset
-> already-welcomed / send-history check
-> final dedupe / suppression check
-> first controlled execution approval
-> one sandbox welcome audio send, if separately approved later
-> reply monitoring, if separately approved later
-> email handoff, if separately approved later
-> MailerLite no-write payload preview, if separately approved later
-> CRM enrichment preview/write packet, if separately approved later
```

This artifact covers only the first controlled execution approval packet design.
It does not grant the approval.

## Relationship To Controlled New-Follower Evidence Packet Design

The future first controlled execution packet requires an explicitly approved
private evidence packet from:

- `docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`

Controlled follower evidence proves only that an approved evidence route
produced a controlled proof input. Evidence alone is not a candidate queue, not
send permission, not DM permission, not MailerLite permission, and not CRM write
permission.

Future Instagram source/private evidence artifacts, if separately approved
later, must live only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

This task does not create, read, list, inspect, modify, or migrate anything in
that folder.

## Relationship To Controlled Candidate Queue And Sandbox Send Approval Packet Design

The future first controlled execution packet depends on a separately approved
candidate queue boundary from:

- `docs/crm-vnext/instagram-welcome-audio-controlled-candidate-queue-and-sandbox-send-approval-packet-design-v0.md`

Candidate queue generation must remain separate from send approval.

Future queue-related private artifacts, candidate references, already-welcomed
history, send history, and reply evidence for Instagram must use:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Candidate queue membership is not permission to send.

## Relationship To Reply Monitoring And Email Handoff Boundary Design

The future first controlled execution packet does not authorize reply
monitoring, DM review, email extraction, name/city/country/phone extraction, or
assistant conversation.

Those downstream boundaries are governed by:

- `docs/crm-vnext/instagram-reply-monitoring-email-handoff-boundary-design-v0.md`

A future welcome send receipt may become an input to reply monitoring only after
a separate exact approval.

## Relationship To MailerLite No-Write Payload Preview Alignment

MailerLite onboarding remains separate and no-write until a later exact
approval.

The first controlled execution packet does not authorize:

- MailerLite API calls;
- MailerLite UI access;
- subscriber lookup;
- subscriber upsert;
- group assignment;
- field mutation;
- automation enrollment;
- campaign sends;
- Gmail access.

MailerLite preview boundaries are governed by:

- `docs/crm-vnext/mailerlite-onboarding-no-write-payload-preview-alignment-v0.md`

## Relationship To Identity / CRM Enrichment Packet Boundary

CRM identity/enrichment remains a later no-write preview and write-packet
boundary governed by:

- `docs/crm-vnext/instagram-crm-identity-enrichment-packet-boundary-v0.md`

The first controlled execution packet must not write:

- CRM cards;
- Signal Event Ledger;
- Engagement Snapshot Ledger;
- source-result ledgers;
- Fact Store;
- scoring;
- next-best-action state;
- outreach state.

## No-Run / Design-Only Status

This artifact does not create:

- a real controlled execution approval packet;
- a real send approval;
- a real candidate queue;
- a real candidate set;
- a real candidate;
- a real audio asset approval;
- a real redacted source/operator receipt;
- a real private source artifact;
- a real already-welcomed check;
- a real send-history result;
- a real final dedupe result;
- real send state;
- real CRM/source state;
- real source-system state.

## First Controlled Execution Approval Packet Scope

A future first controlled execution packet should authorize, at most, one
bounded sandbox welcome-audio send attempt to one explicitly approved
Alejandro-owned or controlled test account or candidate set.

It must bind:

- exact packet id;
- exact controlled evidence packet label;
- exact candidate queue packet label;
- exact candidate set label;
- exact candidate count;
- exact expected send count;
- exact test account label;
- confirmation that the test account is Alejandro-owned or controlled;
- intended Instagram account label;
- intended account confirmation;
- approved audio asset label;
- approved audio asset version or asset registry reference;
- final already-welcomed check label;
- final send-history check label;
- final dedupe/suppression check label;
- blocker summary;
- redacted receipt destination;
- private send artifact label;
- exact future approval phrase.

The packet must not include raw handles, names, emails, DMs, private anchors,
profile URLs, private URLs, screenshots, audio binary, message content, tokens,
cookies, headers, env values, credentials, or raw private artifact contents.

## Future Facts Required, Not Collected Now

This design does not ask Alejandro for, infer, validate, search for, or store
the future facts.

Future facts include:

- `test_account_label`;
- `test_account_control_status`;
- `intended_instagram_account_label`;
- `intended_account_confirmed`;
- `approved_audio_asset_label`;
- `approved_audio_asset_version`;
- `audio_asset_future_filepath_label`, if later approved;
- `controlled_evidence_packet_label`;
- `candidate_queue_packet_label`;
- `candidate_set_label`;
- `candidate_count`;
- `expected_send_count`;
- `already_welcomed_history_label`;
- `send_history_label`;
- `final_dedupe_result_label`;
- `suppression_safety_status`;
- `operator_approval_reference`;
- `redacted_receipt_label`;
- `private_send_artifact_label`.

Missing, stale, ambiguous, path-nonconforming, or conflicting facts block the
future execution packet.

## Test Account Label Model

Future controlled execution should use redacted labels, not public handles.

Suggested fields:

```yaml
testAccount:
  testAccountLabel: string
  controlStatus: alejandro_owned_or_controlled | unknown | blocked
  intendedInstagramAccountLabel: string
  intendedAccountConfirmed: true | false | unknown
```

If control status is not `alejandro_owned_or_controlled`, the future execution
packet must block.

## Intended Account Confirmation Model

The future packet must confirm that the controlled test is scoped to the
intended CRM Core Instagram account.

Suggested fields:

```yaml
intendedAccount:
  intendedAccountLabel: string
  confirmationRoute: manual_label | approved_source_receipt | unknown
  confirmationStatus: confirmed | blocked | unknown
```

Unknown or conflicting intended account status blocks execution.

## Approved Audio Asset Model

The future packet depends on the asset registry and history packet:

- `docs/crm-vnext/instagram-welcome-audio-asset-registry-and-history-packet-v0.md`

Suggested fields:

```yaml
audioAsset:
  approvedAudioAssetLabel: string
  approvedAudioAssetVersion: string
  assetRegistryStatus: approved_sendable | blocked | retired | unknown
  personalizationAllowed: false
  assetApprovalReceiptLabel: string
```

Asset registry presence does not authorize send. Only a packet-specific future
approval can authorize one send attempt.

## Controlled Evidence Prerequisite

Suggested fields:

```yaml
controlledEvidence:
  evidencePacketLabel: string
  evidenceRoute: manual_evidence | notifications_route | bounded_follower_source | api_webhook_source_health
  evidenceStatus: approved_for_candidate_review | blocked | unknown
  privateArtifactRoot: /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

If evidence is missing, source-health-only, ambiguous, or unapproved for
candidate review, the future execution packet must block.

## Candidate Queue Prerequisite

Suggested fields:

```yaml
candidateQueue:
  candidateQueuePacketLabel: string
  candidateSetLabel: string
  candidateCount: number
  expectedSendCount: number
  queueStatus: approved_private_queue | blocked | unknown
  privateArtifactRoot: /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

If candidate count and expected send count differ, the future execution packet
must block.

## Already-Welcomed / Send-History Prerequisite

Suggested fields:

```yaml
historyChecks:
  alreadyWelcomedHistoryLabel: string
  sendHistoryLabel: string
  alreadyWelcomedCheckStatus: passed | blocked_duplicate_risk | blocked_unknown | not_run
  sendHistoryCheckStatus: passed | blocked_prior_send_found | blocked_unknown | not_run
  checkedImmediatelyBeforeSend: true | false
  privateArtifactRoot: /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

If checks are not passed immediately before send, the future execution packet
must block.

## Final Dedupe / Suppression Prerequisite

Suggested fields:

```yaml
finalSafety:
  finalDedupeStatus: passed | blocked_duplicate_found | blocked_unknown | not_run
  suppressionSafetyStatus: clear | blocked | unknown
  identityAmbiguityStatus: clear | ambiguous | unknown
```

Suppression/safety, duplicate risk, and identity ambiguity outrank business
eligibility and warmth.

## Sandbox Send Approval Packet Schema

Future packets may use this schema. This task does not create such a packet.

```yaml
approvalPacketId: string
packetType: instagram_welcome_audio_first_controlled_execution
packetVersion: v0
packetMode: future_approval_required
controlledEvidencePacketLabel: string
candidateQueuePacketLabel: string
candidateSetLabel: string
candidateCount: number
expectedSendCount: number
testAccountLabel: string
testAccountControlStatus: alejandro_owned_or_controlled
intendedInstagramAccountLabel: string
intendedAccountConfirmed: true
approvedAudioAssetLabel: string
approvedAudioAssetVersion: string
assetRegistryStatus: approved_sendable
alreadyWelcomedCheckStatus: passed
sendHistoryCheckStatus: passed
finalDedupeStatus: passed
suppressionSafetyStatus: clear
privateArtifactRoot: /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
redactedReceiptDestination: /Users/alejandrogomez/Documents/Mantis-Reports/
futureApprovalPhrase: string
closedGatesAfterApproval:
  replyMonitoring: closed
  emailHandoff: closed
  mailerliteMutation: closed
  crmWrites: closed
```

## Redacted Receipt Schema

Future source/operator receipts, if separately approved later, may live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Suggested fields:

```yaml
receiptId: string
packetId: string
candidateSetLabel: string
candidateCount: number
expectedSendCount: number
approvedAudioAssetLabel: string
alreadyWelcomedCheckStatus: string
sendHistoryCheckStatus: string
finalDedupeStatus: string
suppressionSafetyStatus: string
sendPerformed: true | false
blockedCount: number
blockerClasses:
  - string
closedGates:
  crmSourceWrites: false
nextSafeStep: string
```

Receipts must not include handles, names, DMs, private anchors, audio binary,
message content, raw follower rows, profile URLs, private URLs, tokens, secrets,
headers, cookies, env values, credentials, raw target URLs, or lock owner
tokens.

## Stop Conditions

Stop the future approval packet if:

- test account control is not confirmed;
- intended account is not confirmed;
- evidence packet is missing or unapproved;
- candidate queue packet is missing or unapproved;
- candidate count differs from expected send count;
- audio asset is missing, retired, blocked, superseded, or ambiguous;
- already-welcomed check is not passed;
- send-history check is not passed;
- final dedupe/suppression check is not passed;
- any private artifact root is not exactly:
  `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/`;
- any receipt path is inside the repo;
- any private identity would need to be printed in chat;
- any source action, DM opening, welcome audio send, MailerLite/Gmail access,
  CRM write, Launch OS work, Mantis memory write, OpenClaw/Mantis workspace
  inspection, or `/Users/alejandrogomez/CRM` use is implied before exact
  future approval.

## Closed Gates

This design preserves these closed gates:

- no execution;
- no source UI;
- no Instagram;
- no APIs;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DM opening;
- no welcome audio send;
- no candidate queue generation;
- no private source artifact inspection;
- no MailerLite;
- no Gmail;
- no CRM/source writes;
- no ledgers;
- no cards;
- no Fact Store;
- no source-result ledger writes;
- no scoring;
- no outreach;
- no source mutation;
- no central integration during lane authoring;
- no Launch OS;
- no Mantis memory;
- no OpenClaw/Mantis workspace;
- no `/Users/alejandrogomez/CRM`.

## Separate Future Approval Phrases

### Controlled Private Follower Evidence Review

```text
I approve one CRM Core controlled private follower evidence review for the Controlled Welcome Flow Proof. Use only the approved route and write any future Instagram private source artifacts only under /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/. Do not open DMs, send welcome audio, generate a candidate queue, perform Instagram actions, or write CRM/source state.
```

### Controlled Candidate Queue Generation

```text
I approve one CRM Core controlled welcome-flow candidate queue generation from the explicitly approved private evidence packet only. Write private queue artifacts only under /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/, write redacted aggregate receipts only to the approved receipt location, do not open DMs, do not send welcome audio, do not perform Instagram actions, and do not write CRM/source state.
```

### Approved Audio Asset Selection / Confirmation

```text
I approve CRM Core to confirm the approved welcome audio asset label for one future controlled welcome-flow execution packet only. Do not inspect audio binary unless separately approved, do not send audio, do not open DMs, do not generate a candidate queue, and do not write CRM/source state.
```

### Final Already-Welcomed / Send-History Check

```text
I approve one CRM Core final already-welcomed and send-history check for the approved welcome-audio sandbox candidate set only. Use only approved private history artifacts under /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/, do not print identities, fail closed on ambiguity, do not open DMs, do not send welcome audio, and do not write CRM/source state.
```

### Final Dedupe / Suppression Check

```text
I approve one CRM Core final dedupe and suppression check for the approved controlled welcome-flow candidate set only. Use only approved private artifacts under /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/, report redacted aggregate status only, fail closed on ambiguity, do not open DMs, do not send welcome audio, and do not write CRM/source state.
```

### One Sandbox Welcome Audio Send

```text
I approve CRM Core to perform one controlled welcome audio sandbox send to the explicitly approved Alejandro-owned or controlled test account only, using the approved audio asset and approved candidate packet after final already-welcomed, send-history, dedupe, and suppression checks pass. Do not send to any other account, do not open unrelated DMs, do not perform any non-send Instagram action, write private send artifacts only under /Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/, write redacted receipts only, and do not write CRM/source state.
```

### Reply Monitoring Separately

```text
I approve one CRM Core reply monitoring boundary for the approved controlled welcome audio send receipt only. Do not send welcome audio, do not open unrelated DMs, do not extract private message contents into chat, and do not write CRM/source state.
```

### Email Handoff Separately

```text
I approve one CRM Core email handoff private review boundary for the approved controlled reply evidence only. Do not print emails, names, phone numbers, handles, DMs, or private message content in chat, do not call MailerLite or Gmail, and do not write CRM/source state.
```

### MailerLite No-Write Payload Preview Separately

```text
I approve one CRM Core MailerLite no-write payload preview from the explicitly approved private email handoff evidence only. Do not call MailerLite APIs, do not open MailerLite UI, do not mutate subscribers, groups, fields, automations, or campaigns, do not use Gmail, and do not write CRM/source state.
```

### CRM Enrichment Preview Separately

```text
I approve one CRM Core no-write CRM identity/enrichment preview from the explicitly approved controlled welcome-flow evidence only. Do not write cards, ledgers, Fact Store, source-result ledgers, scoring, outreach, or source state.
```

## Parallel Branch / Freshness Guardrails

This artifact was prepared in temporary parallel branch mode.

Before lane-local commit:

- branch must be `codex/crm-core-welcome-audio-first-execution-packet-parallel`;
- worktree must be `/Users/alejandrogomez/CRM-core-welcome-audio-first-execution-parallel`;
- changed files must be limited to this artifact and
  `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`;
- `git diff --check` must pass;
- raw target URLs and lock owner tokens must be absent from changed docs;
- lane consultant must return `green_to_commit_later` and
  `safe_to_commit_later=true`.

Central integration remains separate and requires Chief Architect review plus
Central Integration Lock.

## Proposed Integration Note

Welcome Audio now has a no-run First Controlled Execution Approval Packet
Design for the Controlled Welcome Flow Proof. It defines the future approval
surface for one controlled sandbox welcome-audio send to an Alejandro-owned or
controlled test account, while keeping controlled evidence, candidate queue
generation, approved audio asset confirmation, final already-welcomed/send
history check, final dedupe/suppression check, reply monitoring, email handoff,
MailerLite preview, and CRM enrichment/write boundaries separate. It uses the
exact future Instagram private source artifact root
`/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/`
and creates no real state or source/action authority.

## Next Safe Step

If integrated centrally, the next safe product step is a CEO/operator decision:
choose whether to prepare a real first controlled execution decision packet,
design assistant reply policy, advance MailerLite setup inventory collection, or
pause.

## Completion Boundary

This design is complete when CRM Core has a lane-local no-run approval packet
template for the future first controlled welcome-flow execution, preserving all
closed gates and requiring separate future approvals before evidence review,
candidate queue generation, audio asset confirmation, dedupe/history checks,
welcome audio send, reply monitoring, MailerLite preview, CRM enrichment, or
CRM/source writes.
