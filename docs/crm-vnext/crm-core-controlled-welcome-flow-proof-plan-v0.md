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

Track D MailerLite minimal no-write mutation review packet design:
complete/integrated as no-run design.

Track D MailerLite minimal no-write packet from private evidence:
prepared/no-write; final checks required.

Track E identity/CRM enrichment packet boundary: complete as no-run design.

Track B first controlled execution approval packet: complete as no-run design.

Assistant reply policy boundary design: complete as no-run policy boundary.

M1 - Alejandro supplies non-secret setup/test facts.

M2 - Controlled evidence packet design: complete as no-run design.

M3 - Sandbox send packet design: complete as no-run design.

M4 - Exact approval for controlled send proof: complete for the first
controlled send only.

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

## Seventh Lane Sprint Result — First Controlled Execution Approval Packet Design

- Seventh plan-aligned lane sprint selected: First Controlled Execution
  Approval Packet Design.
- Task id:
  `crm_core_controlled_welcome_flow_first_execution_approval_packet_v0`.
- Source commit:
  `1dcae13a6f7ce8185498ab18f6e7763a8fedfec7`.
- Artifact:
  `docs/crm-vnext/instagram-welcome-audio-first-controlled-execution-approval-packet-v0.md`.
- Branch mode:
  `temporary_parallel`.
- Lane consultant verdict:
  `green_to_commit_later`.
- Chief Architect verdict:
  `green_to_self_integrate`.
- Central Integration Lock v0 was acquired and released.
- The artifact defines a no-run approval packet boundary for one future
  controlled sandbox welcome-audio send to an Alejandro-owned or controlled
  test account.
- It keeps controlled follower evidence review, candidate queue generation,
  approved audio asset confirmation, final already-welcomed/send-history check,
  final dedupe/suppression check, reply monitoring, email handoff, MailerLite
  no-write preview, and CRM enrichment/write boundaries separate.
- The exact future Instagram private source artifact root is:
  `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/`.
- No execution approval packet was generated from real data.
- No candidate queue was generated.
- No candidate set or candidate was created.
- No welcome audio was sent.
- No DM was opened.
- No Instagram action occurred.
- No MailerLite or Gmail access occurred.
- No private artifacts were integrated.
- No source execution occurred.
- No facts were collected from Alejandro.
- No CRM/source writes, card writes, Fact Store writes, Signal Event Ledger
  writes, Engagement Snapshot Ledger writes, source-result ledger writes, or
  scoring writes occurred.
- CRM-Core-Reports was used for development telemetry.
- Mantis-Reports and Mantis memory were not used.
- Do not mark execution milestones complete.

## First Live Controlled Send Result — Confirmed Safari Upload

- First controlled welcome audio send result: confirmed.
- Result artifact:
  `docs/crm-vnext/instagram-welcome-audio-first-controlled-send-result-v0.md`.
- Run id:
  `crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05`.
- Final state:
  `completed_confirmed_single_controlled_send`.
- Target Instagram profile URL:
  `https://www.instagram.com/alejandro_gomez_bernal/`.
- Approved audio asset label:
  `saludo_welcome_audio_v1`.
- Browser used: Safari.
- Safari isolated standard window was confirmed.
- Safari neutral preflight passed.
- Safari filechooser preflight passed with the original audio path.
- Chrome upload route remains blocked/unproven for this path.
- Prior controlled candidate packet was read and validated in the source lane.
- Controlled handle disambiguation was performed without printing the raw
  controlled candidate identity in central docs.
- Messaging route was opened for the single controlled candidate only.
- Audio upload was attempted and the audio was attached/ready.
- Welcome audio send was attempted and confirmed.
- `welcome_audio_sent`: true.
- Private artifact root path label:
  `/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/controlled-welcome-flow/first-controlled-handle-send-v5-safari-upload-2026-07-05/`.
- Redacted receipt path labels:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/instagram/controlled-welcome-flow/crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/instagram/controlled-welcome-flow/crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05.md`
- No unrelated DMs were opened.
- No candidate queue was generated during the live send.
- No MailerLite, Gmail, or Meta Business Suite access occurred.
- No CRM/source writes, card writes, Fact Store writes, Signal Event Ledger
  writes, Engagement Snapshot Ledger writes, source-result ledger writes, or
  scoring writes occurred.
- No Launch OS docs, Mantis memory, OpenClaw/Mantis workspace, or
  `/Users/alejandrogomez/CRM` were touched.
- This proves one controlled send path only. It does not prove production
  automation, standing sends, reply monitoring, email handoff, MailerLite
  onboarding, CRM enrichment/write, or next-best-action execution.

M5 - Controlled send execution: complete for one controlled test only.

## First Live Controlled Reply / Email Handoff Result — Confirmed

- First controlled reply monitoring / email handoff result completed.
- Result doc:
  `docs/crm-vnext/instagram-welcome-audio-first-controlled-reply-email-handoff-result-v0.md`.
- Source run id:
  `crm_core_controlled_welcome_flow_first_controlled_reply_monitoring_email_handoff_2026-07-05`.
- Prior send run id:
  `crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05`.
- Browser used: Safari.
- Prior candidate validated: true.
- Thread baseline completed: true.
- Reply seen after READY: true.
- Reply detection status: `detected`.
- Private reply evidence packet created: true.
- Email detected: true.
- Contact fields detected count: 2.
- Email handoff candidate packet created: true.
- No MailerLite occurred.
- No Gmail occurred.
- No CRM/source writes occurred.
- No card, Fact Store, ledger, or scoring writes occurred.
- No unrelated DMs opened.
- No raw message text, raw email, or raw handle was printed.
- No private artifacts were integrated.
- No Mantis memory was used.
- No `/Users/alejandrogomez/CRM` was used.

M6 - Controlled reply/email handoff evidence: complete for one controlled test
only.

## First MailerLite No-Write Payload Preview Result — Mutation Blocked

- First MailerLite no-write payload preview from controlled email-handoff
  evidence completed.
- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-first-controlled-email-handoff-no-write-payload-preview-result-v0.md`.
- Source run id:
  `crm_core_mailerlite_no_write_payload_preview_from_controlled_email_handoff_2026-07-05`.
- Prior email handoff run id:
  `crm_core_controlled_welcome_flow_first_controlled_reply_monitoring_email_handoff_2026-07-05`.
- Prior send run id:
  `crm_core_controlled_welcome_flow_first_controlled_handle_send_v5_safari_upload_2026-07-05`.
- No-write payload preview created: true.
- Payload field family count: 9.
- Field mapping status:
  `confirmed_existing_field=1`; `requires_setup_inventory=8`.
- Group mapping status: `requires_setup_inventory`.
- Automation mapping status: `requires_setup_inventory`.
- Idempotency status: `no_write_preview_only`.
- Suppression status: `not_verified_no_mailerlite_read`.
- Mutation readiness: `blocked_missing_setup_inventory`.
- No MailerLite API occurred.
- No MailerLite UI occurred.
- No MailerLite mutation occurred.
- No subscriber mutation occurred.
- No group assignment occurred.
- No field creation occurred.
- No automation mutation occurred.
- No campaign send occurred.
- No CRM/source writes occurred.
- No raw email, raw handle, message text, or private artifact contents were
  printed.
- No private artifacts were integrated.
- No Mantis memory was used.
- No `/Users/alejandrogomez/CRM` was used.

M7 - MailerLite no-write payload preview: complete for one controlled
email-handoff test only.

## MailerLite Read-Only Setup Verification Guard — Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-readonly-setup-verification-script-design-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `0402d668a62465641f21a70a5ea31de0ce5d7ba5`
- Status:
  `designed_and_tested_fixture_only`
- Live setup verification:
  `not_run`
- MailerLite API called:
  false
- MailerLite UI used:
  false
- Credentials inspected or printed:
  false
- Subscriber rows read or printed:
  false
- Fixture mode tested:
  true
- Live mode blocked without explicit approval:
  true
- Redacted receipts tested:
  true
- Output paths inside repo rejected:
  true
- Mutation readiness:
  `blocked_pending_redaction_safe_live_setup_verification`
- This guard exists to support a future separately approved read-only
  MailerLite setup verification run.
- It does not authorize live verification or mutation.
- Redaction-safe setup verification guard is integrated.
- Live setup verification is not complete.
- MailerLite setup inventory is not complete.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## MailerLite Read-Only Setup Verification Live Guard v2 — Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-readonly-setup-verification-script-design-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `b2f9f1e16169a86f2327ac9c98106b5971a9e72a`
- Previous live blocker:
  `live_readonly_setup_verification_not_implemented_in_fixture_task`
- Status:
  `live_mode_implemented_and_mock_tested`
- Live setup verification:
  `not_run_after_v2`
- Mocked live mode tested:
  true
- Setup/config-only scope enforced:
  true
- Subscriber rows forbidden by tests:
  true
- Mutation methods forbidden by tests:
  true
- Credential provider precheck order tested:
  true
- Fixture mode tested:
  true
- Live mode blocked without explicit approval:
  true
- Redacted receipts tested:
  true
- Output paths inside repo rejected:
  true
- MailerLite API called:
  false
- MailerLite UI used:
  false
- Credentials inspected or printed:
  false
- Subscriber rows read or printed:
  false
- Mutation readiness:
  `blocked_pending_live_readonly_setup_verification`
- This guard exists to support a future separately approved read-only
  MailerLite setup verification run.
- It does not authorize live verification or mutation.
- Live-readonly setup verification guard v2 is integrated.
- Live setup verification is not complete.
- MailerLite setup inventory is not complete.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## First MailerLite Live Read-Only Setup Verification Result - Mutation Blocked

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-live-readonly-setup-verification-result-v0.md`
- Source run id:
  `crm_core_mailerlite_readonly_setup_verification_live_v1_2026-07-06`
- Setup verification status:
  `completed_live_readonly_setup_config_metadata`
- MailerLite API called:
  true
- MailerLite API call scope:
  `readonly_setup_config_metadata_only`
- MailerLite UI used:
  false
- Credentials inspected or printed:
  false
- Subscriber rows read or printed:
  false
- Group mapping status:
  `confirmed_current_existing_label`
- Automation mapping status:
  `confirmed_current_existing_label`
- Field mapping:
  `confirmed_existing_field=3; missing_or_not_found=6`
- Trigger behavior:
  `unknown_requires_behavior_check`
- Retrigger behavior:
  `unknown_blocks_mutation`
- Suppression:
  `not_verified_no_subscriber_read`
- Idempotency:
  `not_verified_no_subscriber_read`
- Mutation readiness:
  `blocked_field_mapping`
- No subscriber mutation occurred.
- No group assignment occurred.
- No field creation occurred.
- No automation mutation occurred.
- No campaign send occurred.
- No CRM/source writes occurred.
- No raw email/ID/payload/header/token/env/credential/private subscriber
  content/private artifact contents printed.
- No private artifacts integrated.
- No Mantis memory used.
- No `/Users/alejandrogomez/CRM` used.
- Live read-only MailerLite setup verification is complete.
- MailerLite setup mapping is not complete.
- Trigger/retrigger behavior is not verified.
- Suppression/idempotency is not verified.
- Mutation review is not ready.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## MailerLite Setup Drift / Missing Field Mapping Resolution Packet - Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-setup-drift-missing-field-mapping-resolution-packet-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `a5ec2042cbc7469ea10784d543720839ed8e6001`
- Status:
  no-run resolution packet integrated
- Live read-only setup verification run:
  `crm_core_mailerlite_readonly_setup_verification_live_v1_2026-07-06`
- Redacted field-detail extraction run:
  `crm_core_mailerlite_setup_field_detail_redacted_extraction_2026-07-06`
- Confirmed field families:
  `name; country; city`
- Missing field families:
  `email; source_channel; source_context; onboarding_started_at; consent_or_context; crm_core_private_anchor_label`
- Email interpretation:
  native/top-level MailerLite subscriber email by default, not a custom field
  to create
- Private anchor policy:
  `crm_core_private_anchor_label` should remain outside MailerLite by default
  for v1
- Minimal payload v1 status:
  `not_ready`
- Group mapping:
  `confirmed_current_existing_label`
- Automation mapping:
  `confirmed_current_existing_label`
- Trigger behavior:
  `unknown_requires_behavior_check`
- Retrigger behavior:
  `unknown_blocks_mutation`
- Suppression:
  `not_verified_no_subscriber_read`
- Idempotency:
  `not_verified_no_subscriber_read`
- Mutation readiness:
  `blocked_field_mapping`
- Setup drift / missing field mapping resolution packet is integrated.
- Manual no-secret answers are not complete.
- Top-level email payload semantics are not confirmed.
- Trigger/retrigger behavior is not verified.
- Suppression/idempotency is not verified.
- Mutation review is not ready.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## MailerLite Manual No-Secret Field Requiredness And Trigger Answers - Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-manual-no-secret-field-requiredness-trigger-answers-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `89581c508a16d112a52bd4b1e1f357f18affc159`
- Status:
  manual no-secret answers integrated
- Email native/top-level subscriber field:
  yes
- `source_channel_for_v1`:
  `omit_for_v1`
- `source_context_for_v1`:
  `omit_for_v1`
- `onboarding_started_at_for_v1`:
  `omit_for_v1`
- `consent_or_context_policy_gate`:
  `required`
- `consent_or_context_storage_for_v1`:
  `keep_outside_mailerlite`
- `crm_core_private_anchor_label_for_v1`:
  `keep_private_only`
- `group_trigger_behavior`:
  `confirmed_yes_by_Alejandro`
- `retrigger_behavior`:
  `unknown_blocks_duplicate_readd`
- `suppression/idempotency policy`:
  `final_packet_specific_check_required`
- `minimal_payload_v1_review_status`:
  `ready_for_no_write_mutation_review_packet_design_with_final_gates`
- `mutation_readiness`:
  `blocked_pending_no_write_mutation_review_and_final_packet_specific_checks`
- Field requiredness is resolved enough to design a no-write minimal mutation
  review packet.
- Real mutation remains blocked.
- Duplicate/re-add remains blocked while retrigger behavior is unknown.
- Suppression and idempotency must be checked in the final packet-specific
  gate.
- Top-level email payload semantics must be represented correctly in the
  no-write packet.
- Consent/context evidence must remain available privately before any mutation.
- Manual no-secret MailerLite answers are completed.
- Field requiredness for v1 is resolved for no-write packet design.
- No-write mutation review packet is not complete.
- Final idempotency/suppression check is not complete.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## MailerLite Minimal No-Write Mutation Review Packet Design — Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-minimal-no-write-mutation-review-packet-design-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `bc5f581d4d62f3269588fb1142200980d99442b6`
- Status:
  no-write mutation review packet design integrated
- Top-level email semantics:
  native top-level subscriber email required
- Mapped field families for v1:
  name; country; city when present in approved private evidence
- Omitted MailerLite field families for v1:
  source_channel; source_context; onboarding_started_at; consent_or_context;
  crm_core_private_anchor_label
- Consent/context gate:
  required_keep_outside_mailerlite
- Private anchor policy:
  keep_outside_mailerlite
- Group trigger behavior:
  confirmed_yes_by_Alejandro
- Retrigger behavior:
  unknown_blocks_duplicate_readd
- Final idempotency/suppression check required:
  true
- Preferred future operation class:
  subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass
- No-write packet preparation readiness:
  ready_after_central_integration_and_separate_private_evidence_approval
- Actual mutation readiness:
  blocked_pending_no_write_packet_preparation_final_idempotency_suppression_check_and_exact_mutation_approval

Interpretation:

- CRM Core can now proceed to a future no-write packet preparation step only
  after separate approval to use the approved private controlled
  email-handoff evidence.
- Real MailerLite mutation remains blocked.
- Final idempotency/suppression check remains required.
- Duplicate/re-add remains blocked while retrigger behavior is unknown.
- Exact mutation approval remains required if execution is ever considered.
- Minimal no-write mutation review packet design is completed/integrated.
- No-write packet from private evidence is not prepared.
- Final idempotency/suppression check is not complete.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## MailerLite Minimal No-Write Packet From Private Evidence — Prepared

- Source run id:
  `crm_core_mailerlite_minimal_no_write_mutation_review_packet_from_private_evidence_2026-07-06`
- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-minimal-no-write-mutation-review-packet-from-private-evidence-result-v0.md`
- Packet prepared:
  true
- Operation class:
  `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`
- Top-level email present:
  true
- Consent/context present:
  `present_private_evidence`
- Mapped fields:
  name; country; city
- Omitted field families:
  source_channel; source_context; onboarding_started_at; consent_or_context;
  crm_core_private_anchor_label
- Final idempotency check:
  `required_not_run`
- Final suppression check:
  `required_not_run`
- Duplicate/readd:
  blocked because retrigger behavior is unknown
- Mutation readiness:
  `no_write_packet_prepared_final_checks_required`
- No MailerLite API occurred.
- No MailerLite UI occurred.
- No MailerLite mutation occurred.
- No subscriber mutation occurred.
- No group assignment occurred.
- No field creation occurred.
- No automation mutation occurred.
- No campaign send occurred.
- No CRM/source writes occurred.
- Mutation remains blocked pending final idempotency/suppression checks,
  duplicate/readd safety, and exact future mutation approval.

## MailerLite Final Idempotency / Suppression Check Route Guard — Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-final-idempotency-suppression-check-route-design-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `2b2f1837797f66bc57c7109ae69220d9ba085ec4`
- Previous blocker:
  `route_not_implemented_or_not_redaction_safe`
- Route status:
  `final_check_route_guard_implemented_mocked_live_tested`
- Live final check real run:
  false
- Mocked live mode tested:
  true
- Fixture mode tested:
  true
- Read-only method allowlist tested:
  true
- Mutation endpoints forbidden by tests:
  true
- Credential provider precheck order tested:
  true
- MailerLite API called:
  false
- MailerLite UI used:
  false
- Subscriber rows read or printed:
  false
- Mutation readiness:
  `blocked_pending_final_packet_specific_check`

CRM Core may now proceed only to a separately approved final
packet-specific read-only check. This integration does not authorize that
check or any mutation.

## MailerLite Final Check Readiness Contract Fix v1 — Integrated

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-final-idempotency-suppression-check-route-design-v0.md`
- Source branch:
  `codex/crm-core-mailerlite-onboarding`
- Source commit:
  `8a00c9bd0990de7ba4589b57bb6de8d8a0dadbf0`
- Previous attempted final check run:
  `crm_core_mailerlite_final_idempotency_suppression_check_2026-07-06`
- Previous attempted final check state:
  `blocked_route_result_contract_inconsistent`
- Previous route status:
  `live_readonly_precheck_blocked_missing_private_packet_email_anchor`
- Previous MailerLite API called:
  false
- Previous invalid readiness emitted:
  `ready_for_exact_mutation_approval`
- Contract fix status:
  `completed_mock_tested`
- Missing private packet email anchor blocks consistently:
  true
- Ready requires live lookup:
  true
- Mocked live mode tested:
  true
- Fixture mode tested:
  true
- Live final check real run after fix:
  false
- Mutation readiness:
  `blocked_pending_private_packet_email_anchor_resolution_and_final_packet_specific_check`

Interpretation:

- A blocked precheck may not report subscriber not found, suppression pass,
  idempotency pass, or `ready_for_exact_mutation_approval`.
- A `ready_for_exact_mutation_approval` result requires a completed live
  read-only lookup and all final statuses passing.
- The existing private no-write packet must be repaired/regenerated or
  otherwise confirmed to contain a resolvable internal lookup input before the
  live final check is attempted again.
- Real MailerLite mutation remains blocked.
- Final check contract fix is integrated.
- Final live idempotency/suppression check is not complete.
- Private packet email anchor is not resolved.
- MailerLite mutation is not ready.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

## MailerLite Private Packet Email Anchor Repair v0 — Closeout

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-private-packet-email-anchor-repair-result-v0.md`
- Source run:
  `crm_core_mailerlite_minimal_no_write_packet_email_anchor_repair_2026-07-06`
- Private packet email anchor repair completed:
  true
- Repaired packet created:
  true
- Internal lookup input resolvable for final check:
  true
- Internal lookup input storage:
  `private_packet_only`
- Mutation readiness:
  `private_packet_email_anchor_repaired_final_check_ready_to_retry`
- Final idempotency/suppression check after repair:
  `not_run_after_repair`
- MailerLite API called:
  false
- MailerLite UI used:
  false
- MailerLite mutation occurred:
  false
- Subscriber rows read:
  false
- CRM/source writes occurred:
  false

Interpretation:

- The private packet email anchor repair is complete.
- The repaired private packet now contains a final-check-route-resolvable
  internal lookup input stored only in the private packet.
- The final packet-specific idempotency/suppression check remains not run after
  the repair.
- Mutation remains blocked until the final packet-specific read-only check
  passes and Alejandro gives exact future mutation approval.
- No MailerLite API/UI/mutation, subscriber row read, CRM/source write, Launch
  OS touch, or `/Users/alejandrogomez/CRM` use occurred during the source run
  or central closeout.

## MailerLite Final Idempotency / Suppression Check v2 — Closeout

- Result doc:
  `docs/crm-vnext/mailerlite-onboarding-final-idempotency-suppression-check-result-v0.md`
- Source run:
  `crm_core_mailerlite_final_idempotency_suppression_check_2026-07-06`
- Final packet-specific idempotency/suppression check v2 completed:
  true
- Live lookup ran:
  true
- MailerLite API called in source run:
  true
- MailerLite API call scope:
  `packet_specific_subscriber_status_group_membership_readonly`
- Subscriber lookup status:
  `not_found`
- Subscriber status class:
  `not_found`
- Onboarding group membership status:
  `not_found`
- Duplicate/re-add status:
  `safe_new_or_not_in_group`
- Suppression status:
  `pass`
- Idempotency status:
  `pass`
- Receipt consistency check:
  passed
- Mutation readiness after final check:
  `ready_for_exact_mutation_approval`
- Blockers:
  none
- MailerLite UI occurred:
  false
- MailerLite mutation occurred:
  false
- Subscriber rows printed:
  false
- CRM/source writes occurred:
  false
- Exact mutation approval packet remains required:
  true
- Actual mutation executed:
  false

Interpretation:

- The prepared/repaired onboarding packet passed the packet-specific live
  read-only idempotency/suppression check.
- This result is not mutation approval.
- CRM Core may now prepare an exact MailerLite mutation approval packet for
  Alejandro review.
- Actual MailerLite mutation remains blocked until Alejandro gives exact future
  approval.
- If meaningful time passes, or if another MailerLite/source action changes
  subscriber/group state, a fresh final check may be required before mutation.

## Assistant Reply Policy Boundary Result — Integrated

- Assistant Reply Policy Boundary design integrated.
- Result doc:
  `docs/crm-vnext/instagram-welcome-audio-assistant-reply-policy-boundary-design-v0.md`
- Source branch:
  `codex/crm-core-welcome-audio-assistant-reply-policy-v2-parallel`
- Source commit:
  `1f01154e357e5842ffeaf81a068cd34def5d58f3`
- Status:
  docs-only, no-run, policy boundary.
- This defines future assistant/Mantis/Mati reply policy.
- It does not authorize assistant reply drafting from private content.
- It does not authorize assistant reply send.
- It does not authorize reply monitoring.
- It does not authorize MailerLite.
- It does not authorize CRM writes.
- It does not authorize source/live parallelism.
- It preserves the rule that assistant replies must not pretend to be
  Alejandro.
- Assistant reply policy boundary design is completed.
- Assistant reply draft preview is not complete.
- Assistant reply send is not complete.
- MailerLite setup inventory is not complete.
- MailerLite mutation is not complete.
- CRM enrichment/write is not complete.
- Production automation is not complete.

M8 - CRM enrichment packet preview.

M9 - Operator brief / heat preview, still no writes unless approved.

The original plan task completed only M0. This record now also marks M5, M6,
and M7 complete for one controlled test only, plus MailerLite minimal no-write
mutation review packet design as completed/integrated and one MailerLite
minimal no-write packet from private evidence as prepared. Final
idempotency/suppression check, MailerLite mutation, CRM enrichment/write,
assistant reply, production automation, standing sends, and next-best-action
execution remain incomplete and closed unless separately approved.

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

## MailerLite Exact Mutation Approval Packet Design Result

- The MailerLite onboarding lane prepared the exact mutation approval packet
  design as a docs-only result.
- Source branch:

```text
codex/crm-core-mailerlite-onboarding
```

- Source commit:

```text
a2836073817ad2b62569e2ee64d29362f37556e4
```

- Result doc:

```text
docs/crm-vnext/mailerlite-onboarding-exact-mutation-approval-packet-design-v0.md
```

- Final check result was recorded as:

```text
ready_for_exact_mutation_approval_packet
```

- Actual MailerLite mutation was not executed.
- `mutation_execution_route_status`: `not_implemented`
- The exact approval phrase is drafted for future Alejandro review, but this
  design does not approve it.
- Because no redaction-safe route exists yet for the exact subscriber upsert
  plus onboarding-group assignment operation class, the proof plan must route
  next to implementation or validation of the execution guard, not mutation
  approval.
- No MailerLite API/UI/mutation, private artifact inspection, private evidence
  read, CRM/source write, Launch OS touch, Mantis memory touch, or
  `/Users/alejandrogomez/CRM` use occurred during central integration.
- Central Integration Lock v0 was acquired and released.

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
