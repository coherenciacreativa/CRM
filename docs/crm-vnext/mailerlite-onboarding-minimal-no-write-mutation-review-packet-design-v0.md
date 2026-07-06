# MailerLite Onboarding Minimal No-Write Mutation Review Packet Design v0

Date: 2026-07-06
Status: no-write mutation review packet design; no API; no mutation

## Purpose

Define the minimal v1 MailerLite onboarding mutation review packet design after live read-only setup verification, redacted field-detail extraction, setup drift resolution, and Alejandro's manual no-secret answers.

This document makes clear:

- it is no-write;
- it does not execute MailerLite API/UI;
- it does not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings;
- it does not read subscriber rows;
- it does not inspect private artifacts;
- it does not authorize future mutation.

## Source Context

- manual answers doc:
  `docs/crm-vnext/mailerlite-onboarding-manual-no-secret-field-requiredness-trigger-answers-v0.md`
- setup drift packet:
  `docs/crm-vnext/mailerlite-onboarding-setup-drift-missing-field-mapping-resolution-packet-v0.md`
- live setup verification result:
  `docs/crm-vnext/mailerlite-onboarding-live-readonly-setup-verification-result-v0.md`
- controlled reply/email handoff result:
  `docs/crm-vnext/instagram-welcome-audio-first-controlled-reply-email-handoff-result-v0.md`
- no-write payload preview result:
  `docs/crm-vnext/mailerlite-onboarding-first-controlled-email-handoff-no-write-payload-preview-result-v0.md`
- active next action:
  `crm_core_controlled_welcome_flow_mailerlite_minimal_no_write_mutation_review_packet_design_v0`

## Manual No-Secret Decisions Applied

| Decision | Value |
| --- | --- |
| email_native_top_level_subscriber_field | yes |
| source_channel_for_v1 | omit_for_v1 |
| source_context_for_v1 | omit_for_v1 |
| onboarding_started_at_for_v1 | omit_for_v1 |
| consent_or_context_policy_gate | required |
| consent_or_context_storage_for_v1 | keep_outside_mailerlite |
| crm_core_private_anchor_label_for_v1 | keep_private_only |
| group_trigger_behavior | confirmed_yes_by_Alejandro |
| retrigger_behavior | unknown_blocks_duplicate_readd |
| suppression_idempotency_policy | final_packet_specific_check_required |

## Minimal v1 Payload Semantics

Define the no-write future packet semantics.

### Native top-level subscriber identity

- `email` is required as native/top-level MailerLite subscriber email.
- `email` must not be treated as a custom field by default.
- Future packet must not print the email.
- Future packet must use an approved private email evidence anchor.
- Future packet must confirm top-level email payload semantics before mutation.

### Existing confirmed custom fields

Confirmed existing fields:

- `name`
- `country`
- `city`

Rules:

- These fields may be mapped only if present in approved private evidence.
- Missing evidence for `name`, `country`, or `city` must not block minimal v1 mutation review.
- Do not infer `name`, `country`, or `city`.
- Do not print raw values.

### Omitted fields for v1

Omit from MailerLite fields for v1:

- `source_channel`
- `source_context`
- `onboarding_started_at`

Rules:

- Source provenance, context, and timing must be preserved outside MailerLite through private artifacts and redacted receipts.
- Omission is allowed only for v1.
- Later field creation proposal remains separate and not authorized here.

### Consent/context

- `consent_or_context` is required as a policy gate.
- It may remain outside MailerLite for v1.
- Future packet must verify private consent/context evidence exists before mutation.
- Do not print consent evidence or private message text.

### CRM Core private anchor

- `crm_core_private_anchor_label` remains private-only outside MailerLite.
- Do not create a MailerLite field for private anchors by default.
- Do not write private anchors to MailerLite in v1.

## Planned Future Operation Class

```text
preferred_future_operation_class:
subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass
```

Proposed future operation class, no execution:

- Create or update subscriber by native top-level email.
- Include confirmed existing custom fields only if present in approved evidence:
  `name`, `country`, `city`.
- Assign to the confirmed onboarding group only after final checks.
- Do not create fields.
- Do not modify automations.
- Do not send campaigns.
- Do not remove groups.
- Do not overwrite existing subscriber fields destructively.
- Do not proceed for duplicate/re-add if retrigger behavior remains unknown and current group membership is already present.

## Group And Automation Semantics

- group_mapping_status: `confirmed_current_existing_label`
- automation_mapping_status: `confirmed_current_existing_label`
- group_trigger_behavior: `confirmed_yes_by_Alejandro`
- retrigger_behavior: `unknown_blocks_duplicate_readd`

Implications:

- New-subscriber or not-in-group path may proceed to future review only if final packet-specific checks pass.
- Existing subscriber already in group must block or require separate explicit approval because retrigger behavior is unknown.
- No duplicate group assignment is allowed while retrigger behavior is unknown.

## Final Packet-Specific Checks Required Before Any Mutation

Mandatory final checks:

1. Approved private email evidence exists.
2. Top-level MailerLite email payload semantics confirmed.
3. Consent/context private evidence exists.
4. Subscriber status/suppression check passes.
5. Idempotency check confirms this private evidence has not already been onboarded.
6. Existing subscriber/group-membership state does not indicate already-in-group.
7. Duplicate/re-add risk is resolved.
8. No unsubscribed, bounced, complained, junk, unknown, or ambiguous status proceeds.
9. Exact future mutation approval phrase is present.
10. Packet-specific private artifact and redacted receipt paths are approved.

These final checks are not executed by this task.

## No-Write Mutation Review Packet Fields

Future packet schema, without real values:

- `packet_id`
- `source_evidence_run_id`
- `private_email_anchor_label`
- `top_level_email_presence_status`
- `consent_context_gate_status`
- `identity_confidence`
- `planned_operation_class`
- `planned_group_assignment_status`
- `mapped_field_families`:
  - `name`
  - `country`
  - `city`
- `omitted_field_families`:
  - `source_channel`
  - `source_context`
  - `onboarding_started_at`
  - `consent_or_context` as MailerLite field
  - `crm_core_private_anchor_label`
- `final_idempotency_check_required`
- `final_suppression_check_required`
- `duplicate_readd_block_status`
- `retrigger_behavior_status`
- `mutation_approval_status`
- `mutation_execution_status: not_executed`
- `closed_gates`

Do not include:

- raw email
- raw IDs
- subscriber rows
- group IDs
- automation IDs
- field IDs
- payload values
- private artifact contents
- private subscriber content

## Redacted Review Receipt Model

Allowed future redacted receipt fields:

- `run_id`
- `packet_id`
- `operation_class`
- `evidence_status`
- `top_level_email_present: true/false/unknown`
- `consent_context_gate_status`
- `mapped_field_family_count`
- `omitted_field_family_count`
- `final_idempotency_status`
- `final_suppression_status`
- `duplicate_readd_status`
- `mutation_readiness`
- `blockers`
- `recommended_next_step`

Forbidden receipt fields:

- raw email
- raw IDs
- subscriber rows
- names tied to email
- city/country tied to identity
- private message text
- private artifact contents
- tokens
- headers
- env values
- credentials
- raw API payloads

## Future Exact Approval Boundaries

### A. No-write mutation review packet preparation from private evidence

Template:

```text
I approve CRM Core to prepare one MailerLite minimal no-write mutation review packet from the explicitly approved private controlled email-handoff evidence only. Do not call MailerLite APIs, do not use MailerLite UI, do not read subscriber rows, do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings, do not print raw emails, IDs, payloads, credentials, or private subscriber content, and write only redacted review receipts.
```

### B. Final packet-specific idempotency/suppression check

Template:

```text
I approve CRM Core to perform one final packet-specific MailerLite idempotency and suppression check for the explicitly approved private onboarding packet only. Use existing internal credentials without printing or inspecting them. Read only the minimum subscriber/group/status metadata needed to decide whether the approved packet is safe to execute. Do not mutate anything, do not print raw emails, IDs, subscriber rows, tokens, headers, env values, credentials, raw payloads, or private subscriber content, and write only redacted aggregate receipts.
```

### C. Packet-specific MailerLite onboarding mutation, if ever approved

Template:

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved top-level email semantics, approved existing field mapping, and confirmed onboarding group. Perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not create fields, do not print private identities, and write only redacted aggregate receipts.
```

## Current Readiness Judgment

```text
minimal_no_write_mutation_review_packet_design_status:
ready_to_integrate

no_write_packet_preparation_readiness:
ready_after_central_integration_and_separate_private_evidence_approval

actual_mutation_readiness:
blocked_pending_no_write_packet_preparation_final_idempotency_suppression_check_and_exact_mutation_approval
```

## Recommended Next Step

Recommended next step after central integration:

```text
prepare_no_write_mutation_review_packet_from_approved_private_controlled_email_handoff_evidence
```

Do not execute it in this task.

## Closed Gates

This design does not authorize:

- MailerLite API calls
- MailerLite UI
- subscriber mutation
- group assignment
- field creation
- automation mutation
- campaign send
- subscriber-row reads
- private artifact inspection
- CRM/source writes
- card writes
- Fact Store writes
- ledgers
- scoring
- Gmail
- Instagram
- DMs
- welcome audio
- Launch OS
- Mantis memory
- `/Users/alejandrogomez/CRM`

## Completion Boundary

Complete when CRM Core has a no-write mutation review packet design defining minimal v1 payload semantics, final gates, redacted receipts, future approval templates, and current readiness without executing MailerLite or reading private evidence.
