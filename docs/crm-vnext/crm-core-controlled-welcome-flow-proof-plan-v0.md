# CRM Core Controlled Welcome Flow Proof Plan v0

Date: 2026-07-03
Status: no-run central product-proof plan

## Purpose

Define the smallest safe product-oriented vertical slice that moves CRM Core
toward the real community intelligence/onboarding system:

```text
controlled new-follower evidence
-> approved welcome audio asset
-> already-welcomed / duplicate check
-> sandbox send approval
-> reply/email handoff boundary
-> MailerLite onboarding preview path
-> CRM card enrichment packet boundary
-> operator/receipt surface
```

This plan does not authorize source execution, APIs, UI, Instagram access, DMs,
welcome audio send, MailerLite access, Gmail access, private artifact
inspection, candidate queue generation, CRM/source writes, Launch OS work,
Mantis memory writes, or `/Users/alejandrogomez/CRM` use.

## Product North Star

CRM Core is not only a welcome-audio bot. It is an autonomous community
intelligence and onboarding system that should eventually integrate:

- Instagram;
- MailerLite/email;
- Gmail/newsletter replies;
- manual evidence;
- future product signals;
- future source adapters;
- identity/dedupe;
- CRM cards;
- heat/relationship depth;
- next-best-action;
- operator briefs;
- approval-gated actions.

The controlled welcome flow is the first product vertical slice, not the whole
product.

## Why This Proof Now

- Consultant UI Relay / Autonomous Lane Sprint has been proven across three
  lanes.
- Storage/operator boundaries are clarified.
- CRM Core should now point autonomous lane work toward a product milestone.
- The proof should be small, controlled, auditable, and reversible.
- The proof should avoid overbuilding architecture that does not unlock a real
  test or CEO decision.

## Proof Definition

The proof is a staged, no-run plan for a future controlled end-to-end test.

The proof is successful when CRM Core can prepare and later execute, under exact
approvals, a controlled flow using Alejandro-owned or controlled test
assets/accounts:

1. controlled follower evidence or manual test-follower evidence;
2. approved welcome audio asset;
3. already-welcomed / send-history check;
4. sandbox candidate set and send approval packet;
5. reply monitoring boundary;
6. email handoff private evidence boundary;
7. MailerLite no-write onboarding payload preview;
8. CRM card enrichment packet boundary;
9. redacted operator/source receipt;
10. no unauthorized source/action/CRM writes.

This plan does not authorize execution.

## Proof Tracks

### Track A - Controlled New-Follower Evidence

Goal:
Prepare a future controlled route for evidence that an Alejandro-controlled
Instagram account followed the intended account.

Possible future evidence routes:

- manual evidence packet from Alejandro;
- approved notifications check;
- approved bounded follower-source route;
- future API/webhook source-health route if setup supports it.

Required future Alejandro facts:

- test account label only, not handle unless separately approved;
- intended Instagram account confirmation;
- whether manual evidence is acceptable for first proof;
- whether UI detection is allowed later;
- whether API route should remain parallel.

Closed gates:

- no Instagram;
- no UI;
- no follower profile opening;
- no private artifact inspection;
- no candidate queue generation;
- no welcome audio;
- no CRM write.

### Track B - Welcome Audio Asset And Sandbox Send Boundary

Goal:
Prepare a future sandbox send path using an approved audio asset and a
controlled candidate set.

Required future Alejandro facts:

- audio asset filepath or asset label, provided only under a future exact
  approval boundary;
- test account/candidate set label;
- confirmation that the test account is Alejandro-owned or controlled;
- approval phrase for one sandbox send;
- whether the test audio is generic or personalized.

Dependencies:

- Welcome Audio asset registry/history packet.
- Send approval packet template.
- Already-welcomed/send-history model.
- Stop conditions.

Closed gates:

- no DM opening;
- no welcome audio send;
- no candidate queue generation;
- no Instagram action;
- no private artifact inspection.

### Track C - Reply Monitoring And Email Handoff Boundary

Goal:
Prepare a future boundary for observing whether the controlled test account
replies and whether it supplies email/name/country/city/phone.

Required future Alejandro facts:

- whether the controlled test account will reply manually;
- whether reply monitoring is via UI, API/webhook, or manual evidence;
- what fields may be supplied in the test reply;
- what must remain private.

Closed gates:

- no DM opening;
- no reply monitoring;
- no message reading;
- no email extraction;
- no private evidence read;
- no CRM write.

### Track D - MailerLite No-Write Onboarding Preview

Goal:
Prepare downstream onboarding readiness once approved email evidence exists.

Dependencies:

- MailerLite setup inventory packet.
- MailerLite answer-intake packet.
- MailerLite no-write API design.
- Future no-write payload preview.

Required future Alejandro facts:

- group label;
- automation label;
- field labels;
- trigger assumptions;
- suppression/status rules;
- one-packet-only mutation preference.

Closed gates:

- no MailerLite API;
- no MailerLite UI;
- no subscriber mutation;
- no group assignment;
- no field creation;
- no automation mutation;
- no campaign send;
- no Gmail;
- no private subscriber content.

### Track E - Identity / CRM Card Enrichment Boundary

Goal:
Define how the controlled flow can later propose a CRM card enrichment packet
without writing CRM state.

Potential future enrichment fields:

- Instagram private anchor label;
- email private anchor label;
- name;
- city;
- country;
- phone;
- source provenance;
- onboarding status;
- welcome sent status;
- reply evidence status;
- suppression/safety status;
- heat/relationship-depth preview status.

Closed gates:

- no card write;
- no Fact Store write;
- no Signal Event Ledger write;
- no Engagement Snapshot Ledger write;
- no scoring write;
- no source-result ledger write;
- no CRM/source write.

### Track F - Operator / Mantis Boundary

Goal:
Preserve future Mantis/OpenClaw operator compatibility without using Mantis as
CRM development memory.

- Mantis may later operate approved CRM Core protocols.
- Mantis may read approved operator briefs and redacted source/operator
  receipts.
- Mantis may ask Alejandro for decisions.
- Mantis must not store CRM development logs, private artifacts, target URLs,
  queue entries, private identities, or raw CRM build history in general
  memory.
- Development telemetry goes to CRM-Core-Reports.
- Source/operator receipts may go to Mantis-Reports when appropriate.
- Private source artifacts stay private and outside repo.
- Private development target registries stay in CRM-Core-Private-Artifacts
  going forward.

## Minimal Milestone Ladder

M0 - Plan only: complete.

First plan-aligned Track B sprint - Welcome Audio sandbox send strategy: complete
as no-run design.

Track A controlled evidence packet design: complete as no-run design.

Track B candidate queue/send approval packet design: complete as no-run design.

Track C reply monitoring/email handoff boundary design: complete as no-run
design.

Track D MailerLite no-write payload preview alignment: complete as no-run
design.

Track E identity/CRM enrichment packet boundary: complete as no-run design.

M1 - Alejandro supplies non-secret setup/test facts.

M2 - Controlled evidence packet design: complete as no-run design.

M3 - Sandbox send packet design: complete as no-run design.

M4 - Future exact approval for controlled send proof.

## Second Lane Sprint Result — Controlled New-Follower Evidence Packet Design

- The second plan-aligned lane sprint selected was Controlled New-Follower
  Evidence Packet Design.
- The task id was:
  `crm_core_controlled_new_follower_evidence_packet_design_v0`.
- Source commit:
  `735c329ec62e141ffb38d269e8dea47c52ba194b`.
- Artifact:
  `docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`.
- The task packet review returned `green_to_execute_task_packet_later`.
- The produced artifact received `green_to_commit_later`.
- No mechanical artifact fix cycle was required.
- Consultant Relay Lock v0 was used successfully:
  - `lock_acquired_count`: `13`
  - `lock_released_count`: `13`
  - `stale_lock_detected`: `false`
  - `owner_token_recorded_in_receipt`: `false`
- CRM-Core-Reports was used by the lane for development telemetry.
- Mantis-Reports and Mantis memory were not used.
- No source execution occurred.
- No facts were collected from Alejandro.
- No API, source UI, Instagram, Meta Business Suite, app configuration, webhook
  setup, DM opening, welcome audio send, candidate queue generation,
  MailerLite/Gmail access, private artifact inspection beyond the explicit
  consultant target registry, CRM/source write, Mantis memory,
  OpenClaw/Mantis workspace, Launch OS doc, or `/Users/alejandrogomez/CRM` use
  occurred.

## Third Lane Sprint Result — Controlled Candidate Queue And Sandbox Send Approval Packet Design

- Third plan-aligned lane sprint selected: Controlled Candidate Queue And
  Sandbox Send Approval Packet Design.
- Task id:
  `crm_core_welcome_audio_controlled_candidate_queue_and_sandbox_send_approval_packet_design_v0`.
- Source commit:
  `90b39ce19571c49847b0102d9c942682905613f5`.
- Artifact:
  `docs/crm-vnext/instagram-welcome-audio-controlled-candidate-queue-and-sandbox-send-approval-packet-design-v0.md`.
- Lane consultant verdict:
  `green_to_commit_later`.
- Chief Architect verdict:
  `green_to_self_integrate`.
- This was the first docs-only self-integration pilot.
- Central Integration Lock v0 was acquired and released.
- No candidate queue was generated.
- No welcome audio was sent.
- No source execution occurred.
- No facts were collected from Alejandro.
- No private artifacts were integrated.
- CRM-Core-Reports was used for development telemetry.
- Mantis-Reports and Mantis memory were not used.
- Do not mark execution milestones complete.

## Fourth Lane Sprint Result — Reply Monitoring And Email Handoff Boundary Design

- Fourth plan-aligned lane sprint selected: Reply Monitoring And Email Handoff
  Boundary Design.
- Task id:
  `crm_core_instagram_reply_monitoring_email_handoff_boundary_design_v0`.
- Source commit:
  `ac37371fab852d5a2a45bdb8e3f8f70357ed612c`.
- Artifact:
  `docs/crm-vnext/instagram-reply-monitoring-email-handoff-boundary-design-v0.md`.
- Lane consultant verdict:
  `green_to_commit_later`.
- Chief Architect verdict:
  `green_to_self_integrate`.
- Central Integration Lock v0 was acquired and released.
- No reply monitoring occurred.
- No DM was opened.
- No email handoff evidence was extracted.
- No source execution occurred.
- No facts were collected from Alejandro.
- No private artifacts were integrated.
- CRM-Core-Reports was used for development telemetry.
- Mantis-Reports and Mantis memory were not used.
- Do not mark execution milestones complete.

## Fifth Lane Sprint Result — MailerLite No-Write Payload Preview Alignment

- Fifth plan-aligned lane sprint selected: MailerLite No-Write Payload Preview
  Alignment.
- Task id:
  `crm_core_mailerlite_no_write_payload_preview_alignment_v0`.
- Source commit:
  `a243b3c55d5062842970c775495970e281bbdba1`.
- Artifact:
  `docs/crm-vnext/mailerlite-onboarding-no-write-payload-preview-alignment-v0.md`.
- Lane consultant verdict:
  `green_to_commit_later`.
- Chief Architect verdict:
  `green_to_self_integrate`.
- Central Integration Lock v0 was acquired and released.
- No MailerLite API call occurred.
- No MailerLite UI was opened.
- No subscriber mutation occurred.
- No group assignment occurred.
- No field creation occurred.
- No automation/campaign mutation occurred.
- No real private payload was prepared.
- No source execution occurred.
- No facts were collected from Alejandro.
- No private artifacts were integrated.
- CRM-Core-Reports was used for development telemetry.
- Mantis-Reports and Mantis memory were not used.
- Do not mark execution milestones complete.

## Sixth Lane Sprint Result — Identity / CRM Enrichment Packet Boundary

- Sixth plan-aligned lane sprint selected: Identity / CRM Enrichment Packet
  Boundary.
- Task id:
  `crm_core_controlled_welcome_flow_identity_crm_enrichment_packet_boundary_v0`.
- Source commit:
  `22a86feb150b9db03c2d2c4f9e2691ef5099d706`.
- Artifact:
  `docs/crm-vnext/instagram-crm-identity-enrichment-packet-boundary-v0.md`.
- Branch mode:
  `temporary_parallel`.
- Lane consultant verdict:
  `green_to_commit_later`.
- Chief Architect verdict:
  `green_to_self_integrate`.
- Central Integration Lock v0 was acquired and released.
- The artifact defines a no-write CRM identity/enrichment packet boundary that
  connects controlled Instagram evidence, approved reply/email handoff
  evidence, MailerLite no-write payload preview status, private anchor labels,
  provenance, identity confidence, suppression/safety, and existing CRM Core
  card/evidence/ledger/scoring concepts.
- It explicitly avoids creating a duplicate CRM architecture.
- No CRM enrichment packet was generated from real data.
- No identity merge occurred.
- No card write occurred.
- No Fact Store write occurred.
- No Signal Event Ledger write occurred.
- No Engagement Snapshot Ledger write occurred.
- No source-result ledger write occurred.
- No scoring write occurred.
- No source execution occurred.
- No facts were collected from Alejandro.
- No private artifacts were integrated.
- CRM-Core-Reports was used for development telemetry.
- Mantis-Reports and Mantis memory were not used.
- Do not mark execution milestones complete.

M5 - Future controlled send execution.

M6 - Future reply/email handoff evidence.

M7 - MailerLite no-write payload preview.

M8 - CRM enrichment packet preview.

M9 - Operator brief / heat preview, still no writes unless approved.

This task completes only M0.

## Required Alejandro-Provided Facts Later

Minimal facts, not collected in this task:

- test Instagram account label;
- intended Instagram account confirmation;
- whether manual evidence is acceptable for the first follower proof;
- approved audio asset label or future filepath;
- whether test reply will include email/name/city/country/phone;
- MailerLite group/automation/field labels;
- whether Mantis should be considered future operator for this proof;
- preferred proof route: fastest manual/control route vs API-first route.

Do not ask Alejandro to answer these facts in this task.

## Future Approval Boundaries

Each future approval phrase must be packet-specific and must not create standing
authorization.

### 1. Controlled Test-Follower Evidence Packet Design

Template:

```text
I approve CRM Core to design one controlled test-follower evidence packet for the Controlled Welcome Flow Proof. Do not open Instagram, use UI, call APIs, inspect private artifacts, open DMs, generate a candidate queue, send welcome audio, or write CRM/source state.
```

### 2. Controlled Candidate Queue Generation From Approved Private Evidence

Template:

```text
I approve CRM Core to generate one controlled welcome-flow candidate queue from the explicitly approved private evidence packet only. Write private queue artifacts only to the approved private artifact location, write redacted aggregate receipts only to the approved receipt location, do not open DMs, do not send welcome audio, do not perform Instagram actions, and do not write CRM/source state.
```

### 3. Controlled Welcome Audio Sandbox Send

Template:

```text
I approve CRM Core to perform one controlled welcome audio sandbox send to the explicitly approved Alejandro-owned or controlled test account only, using the approved audio asset and approved candidate packet. Do not send to any other account, do not open unrelated DMs, do not perform any non-send Instagram action, and do not write CRM/source state.
```

### 4. Controlled Reply Monitoring / Email Handoff Private Review

Template:

```text
I approve CRM Core to perform one controlled reply monitoring and email handoff private review for the explicitly approved test account only. Do not print private message content, do not open unrelated DMs, do not export broad message history, do not mutate Instagram, and do not write CRM/source state.
```

### 5. MailerLite No-Write Payload Preview

Template:

```text
I approve CRM Core to prepare one MailerLite no-write onboarding payload preview from the explicitly approved controlled private evidence packet only. Do not call MailerLite APIs, do not use MailerLite UI, do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings, and do not write CRM/source state.
```

### 6. MailerLite Mutation, If Ever Approved

Template:

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved field mapping and onboarding group, perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not print private identities, and write only redacted aggregate receipts.
```

### 7. CRM Card Enrichment Packet Preview

Template:

```text
I approve CRM Core to prepare one no-write CRM card enrichment packet preview from the explicitly approved controlled welcome-flow evidence only. Do not write cards, ledgers, Fact Store, scoring, source-result ledgers, or CRM/source state, and do not print private identities in chat.
```

### 8. CRM Write Packet Application, If Ever Approved

Template:

```text
I approve CRM Core to apply the explicitly approved CRM write packet only after final review. Write only the approved fields to the approved CRM locations, do not perform source actions, do not perform outreach, do not mutate MailerLite or Instagram, and write redacted receipts.
```

## Storage And Receipts

Use the CRM Core storage/operator boundary policy.

Development telemetry:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/
```

Consultant relay telemetry:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/consultant-relay/
```

Development-private target registry:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

Source/operator receipts:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Source private artifacts:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/
```

Repo durable records:

```text
/Users/alejandrogomez/CRM-core
```

Mantis general memory:

- no CRM development telemetry;
- no private artifacts;
- no queue entries;
- no target URLs;
- no raw build history.

## Lane Responsibilities

### Welcome Audio lane

Owns:

- sandbox send strategy;
- audio asset registry;
- already-welcomed/send-history;
- send approval packet;
- duplicate prevention;
- reply monitoring separation.

Next likely lane task:

```text
crm_core_welcome_audio_sandbox_send_strategy_design_v0
```

### Instagram API readiness lane

Owns:

- source route decision;
- Meta app/setup decision review;
- no-secret healthcheck planning;
- API/webhook feasibility for replies/send;
- follower-source fallback clarification.

Next likely lane task:

```text
crm_core_instagram_meta_app_setup_decision_packet_review_v0
```

or:

```text
crm_core_instagram_meta_api_no_secret_healthcheck_plan_v0
```

### MailerLite onboarding lane

Owns:

- setup answer intake;
- no-write payload preview;
- field/group/automation mapping;
- idempotency/suppression checks;
- future mutation packet.

Next likely lane task:

```text
crm_core_mailerlite_setup_inventory_answer_intake_followup_v0
```

or:

```text
crm_core_mailerlite_onboarding_payload_preview_template_v0
```

### Future Identity / CRM Enrichment lane

Owns:

- identity bridge;
- card enrichment packet;
- provenance;
- source-result memory;
- heat/relationship-depth preview;
- next-best-action boundary.

Status:
Not started in this proof; should remain design-only until source evidence
exists.

### Integration lane

Owns:

- coordination;
- central next action;
- board/integration queue;
- storage policy compliance;
- controlled proof tracking.

## Anti-Overbuild Rules

Every next task must state:

- what practical proof it unlocks;
- what CEO decision it enables;
- what blocker it reduces;
- why it is needed before the controlled welcome flow proof.

Do not propose broad architecture unless it directly reduces a named blocker.

## Recommended Next Step

Default recommendation:

```text
crm_core_welcome_audio_sandbox_send_strategy_design_v0
```

Why:
It is the fastest controlled product-facing slice and can stay docs-only while
defining the exact future facts/approvals needed for a sandbox send.

Alternative:

```text
crm_core_instagram_meta_app_setup_decision_packet_review_v0
```

Use if Alejandro wants to prioritize durable API/webhook path over fast
controlled UI/manual proof.

Alternative:

```text
crm_core_mailerlite_setup_inventory_answer_intake_followup_v0
```

Use if Alejandro wants to advance downstream onboarding readiness first.

## First Lane Sprint Result — Welcome Audio Sandbox Send Strategy

- The first plan-aligned lane sprint selected was Welcome Audio sandbox send
  strategy design.
- The task id was:

```text
crm_core_welcome_audio_sandbox_send_strategy_design_v0
```

- Source commit:

```text
debb861cd64616b61cef6378c7dde41afaeb9551
```

- Artifact:

```text
docs/crm-vnext/instagram-welcome-audio-sandbox-send-strategy-design-v0.md
```

- The first task packet review returned `needs_task_packet_fix`.
- Codex extracted the requested correction, prepared a corrected task packet,
  and received `green_to_execute_task_packet_later`.
- The produced artifact received `green_to_commit_later`.
- No mechanical artifact fix cycle was required.
- No source execution occurred.
- No facts were collected from Alejandro.
- No Instagram, DM opening, welcome audio send, candidate queue generation,
  private artifact inspection, MailerLite/Gmail access, CRM/source write,
  Mantis memory, OpenClaw/Mantis workspace, Launch OS doc, or
  `/Users/alejandrogomez/CRM` use occurred.
- CRM-Core-Reports was used for development telemetry.
- Mantis-Reports and Mantis memory were not used.

## Stop Conditions

Stop if plan would require:

- collecting new facts from Alejandro now;
- source access;
- UI relay execution;
- API calls;
- Instagram access;
- MailerLite access;
- Gmail access;
- Meta Business Suite access;
- DM opening;
- welcome audio send;
- private artifact inspection;
- candidate queue generation;
- CRM/source writes;
- Launch OS docs;
- `/Users/alejandrogomez/CRM`;
- writing outside repo;
- creating CRM-Core-Reports or private artifact folders.

## Closed Gates

- no execution;
- no UI relay;
- no UI, Computer Use, or `@Chrome`;
- no APIs;
- no Instagram;
- no MailerLite;
- no Gmail;
- no Meta Business Suite;
- no app configuration;
- no webhook setup;
- no DMs;
- no welcome audio;
- no private artifact inspection;
- no candidate queue generation;
- no source actions;
- no CRM/source writes;
- no ledgers;
- no cards;
- no Fact Store;
- no scoring;
- no outreach;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

Complete when CRM Core has a no-run Controlled Welcome Flow Proof plan that
defines the smallest safe product-oriented vertical slice and the exact future
approvals required before any source/action/private-artifact/CRM-write step.
