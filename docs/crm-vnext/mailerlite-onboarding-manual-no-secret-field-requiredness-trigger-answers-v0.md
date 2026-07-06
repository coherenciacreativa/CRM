# MailerLite Onboarding Manual No-Secret Field Requiredness And Trigger Answers v0

Date: 2026-07-06
Status: manual no-secret answer intake; no API; no mutation

## Purpose

Record Alejandro's manual no-secret decisions for MailerLite v1 field requiredness and trigger/retrigger behavior after live read-only setup verification and redacted field-detail extraction.

## Source Context

- setup drift resolution packet: `docs/crm-vnext/mailerlite-onboarding-setup-drift-missing-field-mapping-resolution-packet-v0.md`
- live setup verification run: `crm_core_mailerlite_readonly_setup_verification_live_v1_2026-07-06`
- redacted field-detail extraction run: `crm_core_mailerlite_setup_field_detail_redacted_extraction_2026-07-06`
- active next action: `crm_core_controlled_welcome_flow_mailerlite_manual_no_secret_field_requiredness_and_trigger_answers_v0`

## Manual No-Secret Answers

| Question | Answer |
| --- | --- |
| email_native_top_level_subscriber_field | yes |
| source_channel_for_v1 | omit_for_v1 |
| source_context_for_v1 | omit_for_v1 |
| onboarding_started_at_for_v1 | omit_for_v1 |
| consent_or_context_policy_gate | required |
| consent_or_context_storage_for_v1 | keep_outside_mailerlite |
| crm_core_private_anchor_label_for_v1 | keep_private_only |
| adding_subscriber_to_confirmed_onboarding_group_triggers_confirmed_automation | yes |
| readding_existing_subscriber_to_same_group_retriggers_automation | unknown |
| unresolved_suppression_and_idempotency_should_block_until_final_packet_specific_check | yes |

## Confirmed Interpretation

- Email is native/top-level subscriber identity, not a custom MailerLite field to create by default.
- `source_channel` may be omitted from MailerLite fields for v1 if source provenance is preserved outside MailerLite.
- `source_context` may be omitted from MailerLite fields for v1 if context is preserved outside MailerLite.
- `onboarding_started_at` may be omitted from MailerLite fields for v1 if timing is preserved in private artifacts or redacted receipts.
- `consent_or_context` is required as a policy gate but may stay outside MailerLite for v1.
- `crm_core_private_anchor_label` must remain private-only outside MailerLite for v1.
- Group trigger behavior is CEO-confirmed as yes.
- Retrigger behavior is unknown and must block duplicate/re-add decisions until a final packet-specific check resolves safety.
- Suppression and idempotency continue to block real mutation until final packet-specific check.

## Field Mapping V1 Classification

| Field family | V1 classification | MailerLite field action | Mutation blocker status |
| --- | --- | --- | --- |
| email | native_top_level_required | no custom field creation by default | blocks until top-level payload semantics confirmed |
| name | confirmed_existing_field | may map if present in evidence | not a field-mapping blocker |
| country | confirmed_existing_field | may map if present in evidence | not a field-mapping blocker |
| city | confirmed_existing_field | may map if present in evidence | not a field-mapping blocker |
| source_channel | omit_for_v1 | no field creation now | not blocker if provenance preserved privately |
| source_context | omit_for_v1 | no field creation now | not blocker if context preserved privately |
| onboarding_started_at | omit_for_v1 | no field creation now | not blocker if timing receipted |
| consent_or_context | required_policy_gate_keep_outside_mailerlite | no field creation now | policy gate remains required |
| crm_core_private_anchor_label | keep_private_only | no field creation by default | not MailerLite field blocker for v1 |

## Trigger / Retrigger Classification

- group_trigger_behavior: `confirmed_yes_by_Alejandro`
- retrigger_behavior: `unknown`
- implication:
  - New subscriber path may proceed to future no-write mutation review only if other gates are satisfied.
  - Existing subscriber / re-add path remains blocked unless final packet-specific idempotency check confirms it is safe.
  - No duplicate group assignment should occur while retrigger behavior is unknown.

## Suppression / Idempotency Classification

- suppression_status: `not_verified_no_subscriber_read`
- idempotency_status: `not_verified_no_subscriber_read`
- Alejandro answer: `unresolved_suppression_and_idempotency_should_block_until_final_packet_specific_check=yes`

Implication:

- Any future mutation packet must include a final packet-specific check before execution.
- No subscriber row read is authorized by this intake.
- No mutation is authorized by this intake.

## Minimal Payload V1 Readiness

minimal_payload_v1_review_status: `ready_for_no_write_mutation_review_packet_design_with_final_gates`

Not ready for actual mutation.

- Field requiredness is resolved enough to prepare a no-write mutation review packet.
- Real mutation remains blocked by final idempotency/suppression checks and packet-specific approval.
- Top-level email payload semantics must be verified in the no-write packet.
- Consent/context evidence must be present privately before mutation.

## Recommended Next Step

Recommended next step: `prepare_mailerlite_minimal_no_write_mutation_review_packet`

The next packet must remain no-write and must not execute MailerLite API/UI/mutation.

It should define:

- top-level email payload semantics.
- use of confirmed fields `name`, `country`, and `city` only if available in approved evidence.
- omission of `source_channel`, `source_context`, and `onboarding_started_at` from MailerLite fields for v1.
- `consent_or_context` as private evidence/policy gate.
- `crm_core_private_anchor_label` as private-only outside MailerLite.
- group assignment to confirmed onboarding group as planned mutation, not executed.
- final idempotency/suppression check required before any real mutation.
- duplicate/re-add safety because retrigger behavior is unknown.
- exact future mutation approval boundary.

## Closed Gates

This intake does not authorize:

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

Complete when CRM Core has recorded Alejandro's no-secret field requiredness and trigger/retrigger answers and can proceed to a no-write mutation review packet design without authorizing mutation.
