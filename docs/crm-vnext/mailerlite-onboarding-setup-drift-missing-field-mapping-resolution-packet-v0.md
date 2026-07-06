# MailerLite Onboarding Setup Drift / Missing Field Mapping Resolution Packet v0

Date: 2026-07-06
Status: no-run resolution packet; no mutation

## Purpose

Explain how CRM Core should resolve the MailerLite setup drift and missing field mapping blockers found by the first live read-only setup verification and the redacted field-detail extraction.

## Source Results

- live setup verification run id: `crm_core_mailerlite_readonly_setup_verification_live_v1_2026-07-06`
- redacted field-detail extraction run id: `crm_core_mailerlite_setup_field_detail_redacted_extraction_2026-07-06`
- central result doc: `docs/crm-vnext/mailerlite-onboarding-live-readonly-setup-verification-result-v0.md`
- setup_verification_status: `completed_live_readonly_setup_config_metadata`
- group_mapping_status: `confirmed_current_existing_label`
- automation_mapping_status: `confirmed_current_existing_label`
- field_mapping_status_counts: `confirmed_existing_field=3; missing_or_not_found=6`
- confirmed_field_families: `name`; `country`; `city`
- missing_field_families: `email`; `source_channel`; `source_context`; `onboarding_started_at`; `consent_or_context`; `crm_core_private_anchor_label`
- trigger_behavior_status: `unknown_requires_behavior_check`
- retrigger_behavior_status: `unknown_blocks_mutation`
- suppression_status: `not_verified_no_subscriber_read`
- idempotency_status: `not_verified_no_subscriber_read`
- mutation_readiness: `blocked_field_mapping`

## Confirmed Setup Facts

- Group mapping is confirmed.
- Automation mapping is confirmed.
- Confirmed existing field families:
  - `name`
  - `country`
  - `city`
- Missing field families:
  - `email`
  - `source_channel`
  - `source_context`
  - `onboarding_started_at`
  - `consent_or_context`
  - `crm_core_private_anchor_label`

Do not include group IDs, automation IDs, field IDs, raw payloads, raw emails, private artifact contents, or private setup refs in this packet.

## Important Interpretation: Email Field Family

`email` may be missing as a custom field family while still existing as the native/top-level MailerLite subscriber email identifier. CRM Core should not propose creating a custom `email` field unless a later exact setup review proves a custom field is actually needed.

For a future onboarding mutation, email should be treated as required top-level subscriber identity evidence, not as an ordinary custom field by default. Future mutation review must verify that the approved private email evidence can populate the subscriber email field or top-level email input without printing the email. If the implementation expects `email` inside custom `fields`, that implementation should be corrected or reviewed before mutation.

Recommended classification for `email`:

- required_for_first_controlled_onboarding: `required`
- can_be_omitted_from_first_controlled_mutation: `no`
- field_creation_needed: `no_by_default`
- field_creation_approval_required: `false_by_default`
- mutation_review_blocking_level: `blocks_mutation_until_top_level_email_payload_semantics_are_confirmed`
- recommended_resolution: `treat_as_native_subscriber_email_not_custom_field`

## Missing Field Mapping Analysis

| field_family_label | current_status | required_for_first_controlled_onboarding | can_be_omitted_from_first_controlled_mutation | could_be_replaced_by_group_or_context_label | field_creation_needed | field_creation_approval_required | mutation_review_blocking_level | recommended_resolution |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `email` | `missing_or_not_found_as_custom_field` | `required` | `no` | `no` | `no_by_default` | `false_by_default` | `blocks_mutation_until_top_level_email_payload_semantics_are_confirmed` | `treat_as_native_subscriber_email_not_custom_field` |
| `source_channel` | `missing_or_not_found` | `optional_for_v1` | `yes_if_private_receipt_preserves_source` | `yes` | `optional_later` | `true_if_created` | `blocks_payload_quality_not_minimal_mutation` | `omit_for_first_controlled_test_or_map_to_receipt/private_artifact` |
| `source_context` | `missing_or_not_found` | `optional_for_v1` | `yes_if_context_preserved_in_private_artifact_and_redacted_receipt` | `yes` | `optional_later` | `true_if_created` | `blocks_payload_quality_not_minimal_mutation` | `omit_for_first_controlled_test_or_preserve_context_outside_mailerlite` |
| `onboarding_started_at` | `missing_or_not_found` | `optional_for_v1` | `yes_if_onboarding_start_is_receipted_elsewhere` | `no` | `optional_later` | `true_if_created` | `advisory_or_payload_quality` | `omit_for_first_controlled_test_or_prepare_field_creation_proposal_later` |
| `consent_or_context` | `missing_or_not_found` | `required_as_policy_evidence_not_necessarily_mailerlite_field` | `yes_from_mailerlite_fields_only_if_private_evidence_and_receipt_preserve_context` | `yes_for_v1_if_approved` | `optional_later` | `true_if_created` | `blocks_mutation_as_policy_gate_until_evidence/context_classification_is_approved_but_not_necessarily_as_mailerlite_custom_field` | `keep_consent/context_as_private_evidence_receipt_gate_for_v1_field_creation_proposal_later_if_desired` |
| `crm_core_private_anchor_label` | `missing_or_not_found` | `not_required_for_v1` | `yes` | `no` | `not_recommended_for_v1` | `true_if_ever_created` | `advisory_private_anchors_should_remain_outside_mailerlite_by_default` | `do_not_write_private_anchor_to_mailerlite_for_v1_keep_in_private_crm_core_artifact` |

## Minimal Payload v1 Decision Matrix

1. Native email/top-level subscriber identity plus confirmed name/country/city fields plus confirmed group assignment.
   - Potentially viable only after top-level email payload semantics are confirmed, consent/context evidence is approved privately, group trigger behavior is known or accepted, retrigger/idempotency is safe, and the suppression gate is handled.
   - Current status: not ready.

2. Email plus existing confirmed fields only.
   - Current status: not ready until top-level email semantics, trigger/retrigger, suppression, and idempotency are resolved.

3. Omit tracking fields for first controlled test.
   - Potentially acceptable for `source_channel`, `source_context`, `onboarding_started_at`, and `crm_core_private_anchor_label` if private artifacts/receipts preserve provenance.
   - `consent_or_context` cannot be omitted as a policy gate, but may remain outside MailerLite for v1.

4. Field creation proposal before mutation review.
   - No field creation in this task.
   - Recommended later only for `source_channel`, `source_context`, `onboarding_started_at`, and `consent_or_context` if Alejandro wants richer MailerLite tracking.
   - Not recommended for `crm_core_private_anchor_label` by default.

5. Minimal-payload no-write mutation review packet.
   - Not recommended until trigger/retrigger and suppression/idempotency gates are resolved.

## Trigger / Retrigger Resolution

- trigger_behavior_status: `unknown_requires_behavior_check`
- retrigger_behavior_status: `unknown_blocks_mutation`

Possible no-mutation resolution routes:

1. Alejandro no-secret answer.
   - Ask whether adding a subscriber to the confirmed onboarding group triggers the confirmed automation.
   - Ask whether re-adding an existing subscriber to the same group retriggers.
   - Answer format: yes/no/unknown only.
   - No API/UI required.
   - Recommended first route.

2. Read-only automation trigger metadata verification.
   - Separately approved read-only metadata only.
   - No mutation.
   - No subscriber rows.

3. Controlled mutation-safe behavior test.
   - Not recommended yet.
   - Would require separate test-account and mutation approval.

Recommended default: ask Alejandro for no-secret trigger/retrigger behavior facts first.

## Suppression / Idempotency Resolution

- suppression_status: `not_verified_no_subscriber_read`
- idempotency_status: `not_verified_no_subscriber_read`

Possible routes:

1. Conservative final pre-mutation check.
   - Keep suppression/idempotency unresolved until a packet-specific final check.
   - No subscriber rows now.
   - Recommended.

2. One controlled-email subscriber status/idempotency check.
   - Requires separate approval because it may read subscriber-specific state.
   - Not part of this task.

3. Manual policy answer.
   - Alejandro can define policy: block unsubscribed, bounced, complained, unknown, and any ambiguous status.
   - This does not verify the controlled email status.

Recommended default: keep suppression/idempotency as final pre-mutation gates. Do not read subscriber rows now.

## Recommended Next Decision

Choose one:

A. Manual no-secret field requiredness and trigger/retrigger answer packet.
   - Recommended default.
   - Alejandro answers only yes/no/unknown, required/optional/omit_for_v1, and non-secret labels.
   - No API.
   - No UI.
   - No mutation.

B. Field creation proposal packet.
   - No field creation.
   - Only prepares proposed fields and approval boundary.

C. Minimal-payload no-write mutation review packet.
   - Not recommended yet.
   - Only viable if missing fields are confirmed optional/omittable, top-level email semantics are confirmed, and trigger/retrigger/suppression/idempotency gates are resolved.

D. Additional read-only setup verification.
   - Only if this packet cannot resolve ambiguity from redacted details.
   - No mutation.

E. Pause.

Recommended default: manual no-secret field requiredness and trigger/retrigger answer packet.

## Proposed CEO Question Set

Allowed answer values: `yes`, `no`, `unknown`, `required`, `optional`, `omit_for_v1`, `prepare_field_creation_proposal_later`, `keep_private_only`.

1. For `source_channel`:
   - Is this required for the first controlled MailerLite onboarding mutation?
   - May CRM Core omit it for v1 if source is preserved in private artifact and redacted receipt?
   - Should CRM Core prepare a field creation proposal later?

2. For `source_context`:
   - Is this required for v1?
   - May CRM Core omit it for v1 if context is preserved privately?
   - Should CRM Core prepare a field creation proposal later?

3. For `onboarding_started_at`:
   - Is this required for v1?
   - May CRM Core omit it for v1 if the onboarding receipt records timing?
   - Should CRM Core prepare a field creation proposal later?

4. For `consent_or_context`:
   - Is consent/context required as a policy gate before mutation?
   - May CRM Core keep this outside MailerLite for v1 and preserve it in private evidence/receipt?
   - Should CRM Core prepare a field creation proposal later?

5. For `crm_core_private_anchor_label`:
   - Should this stay private-only outside MailerLite for v1?
   - Should CRM Core avoid creating a MailerLite field for this by default?

6. For `email`:
   - Confirm that email should be treated as the native/top-level MailerLite subscriber email, not as a custom field to create.
   - Answer yes/no/unknown.

7. Trigger behavior:
   - Does adding a subscriber to the confirmed onboarding group trigger the confirmed automation?
   - Answer yes/no/unknown.

8. Retrigger behavior:
   - If the subscriber already exists and is re-added to the same group, does the automation retrigger?
   - Answer yes/no/unknown.

9. Suppression/idempotency policy:
   - Should unresolved suppression/idempotency continue to block mutation until final packet-specific check?
   - Answer yes/no/unknown.

Do not ask for IDs, screenshots, subscriber rows, emails, tokens, credentials, raw payloads, or private subscriber content.

## Closed Gates

This packet does not authorize:

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

Complete when CRM Core has a no-run resolution packet that identifies how to resolve missing field mapping and setup drift before any mutation review, without exposing private data or executing any MailerLite action.
