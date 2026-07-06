# CRM Core Workstream: MailerLite Onboarding

- `workstream_id`: `mailerlite-onboarding`
- `branch`: `codex/crm-core-mailerlite-onboarding`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-mailerlite`
- `consultant_chat`: MailerLite onboarding consultant
- `codex_worker`: MailerLite onboarding lane worker
- `status`: `manual_no_secret_answers_completed_no_write_packet_needed`
- `objective`: No-secret setup inventory, no-write payload, future mutation
  packet.
- `why_now`: MailerLite onboarding is the highest-leverage downstream lane once
  Instagram/DM/manual evidence provides email handoff.
- `allowed_files`:
  - `docs/crm-vnext/mailerlite-*.md`
  - `docs/crm-vnext/workstreams/mailerlite-onboarding.md`
  - future MailerLite-specific scripts/tests after explicit approval
- `forbidden_files`:
  - `docs/crm-vnext/crm-core-next-action.md` unless integration approves
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - private artifacts
  - Mantis-Reports receipts
  - Launch OS docs
- `allowed_scope`:
  - design only until exact approval
  - no-secret setup inventory prompts
  - no-write payload planning
  - redacted receipt planning
- `forbidden_scope`:
  - MailerLite API calls
  - MailerLite UI
  - Gmail
  - Instagram
  - secrets
  - subscriber/group/field/automation mutation
  - candidate queue generation
  - CRM writes
  - source mutation
- `private_artifact_policy`: Do not inspect private artifacts unless a future
  exact approval names the artifact and route.
- `redacted_receipt_policy`: Receipt paths may be referenced by label/path only;
  do not commit receipts.
- `current_tasks`:
  - current task seed:
    `crm_core_mailerlite_onboarding_setup_inventory_awaiting_approval_v0`
  - current task completed as no-run design:
    `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md`
  - no-secret setup inventory packet, setup decision path, receipt model,
    idempotency expectations, and future approval language drafted.
  - CEO-friendly no-secret setup inventory questionnaire drafted:
    `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`
  - setup inventory questionnaire reconciled with prior local MailerLite
    onboarding history so Alejandro does not need to answer already-resolved
    facts from scratch.
  - local history prefilled the protected v1 onboarding posture, v2 migration
    posture, known trigger/completion labels, canonical supporting groups,
    prior aggregate scan families, and onboarding policy blockers.
  - next suggested task: either collect only the reduced no-secret answers from
    Alejandro or request exact approval for one read-only no-secret MailerLite
    setup verification using existing internal credentials.
  - consultant UI relay pilot selected and drafted no-run answer-intake packet:
    `docs/crm-vnext/mailerlite-onboarding-setup-inventory-answer-intake-packet-v0.md`
  - answer-intake packet defines safe answer types, forbidden content,
    validation rules, blocker handling, redacted receipt behavior, future
    approval phrases, stop conditions, and closed gates.
  - consultant UI relay pilot selected and drafted no-run no-write payload
    preview alignment:
    `docs/crm-vnext/mailerlite-onboarding-no-write-payload-preview-alignment-v0.md`
  - payload preview alignment connects approved private email handoff evidence
    to MailerLite preview schema, field/group/automation mapping, idempotency,
    suppression/status checks, redacted receipt behavior, future approval
    phrases, stop conditions, and closed gates.
  - no real private payload was prepared and no MailerLite API/UI/source action
    occurred.
  - first controlled email-handoff no-write payload preview completed under
    separate private no-write preview approval
  - result artifact:
    `docs/crm-vnext/mailerlite-onboarding-first-controlled-email-handoff-no-write-payload-preview-result-v0.md`
  - first_controlled_email_handoff_no_write_payload_preview_status:
    `completed_no_write_payload_preview_created_mutation_blocked`
  - prior_email_handoff_run_id:
    `crm_core_controlled_welcome_flow_first_controlled_reply_monitoring_email_handoff_2026-07-05`
  - no_write_payload_preview_created: true
  - payload_field_family_count: 9
  - field_mapping_status_counts: `confirmed_existing_field=1`;
    `requires_setup_inventory=8`
  - group_mapping_status: `requires_setup_inventory`
  - automation_mapping_status: `requires_setup_inventory`
  - idempotency_status: `no_write_preview_only`
  - suppression_status: `not_verified_no_mailerlite_read`
  - mutation_readiness: `blocked_missing_setup_inventory`
  - mailerlite_api_called: false
  - mailerlite_ui_used: false
  - mailerlite_mutation: false
  - production_onboarding_status: `not_enabled`
  - no raw email, raw handle, message text, private payload values, private
    candidate details, or private artifact contents are recorded in central docs
  - no execution gates: no MailerLite API, no MailerLite UI, no Gmail, no
    Instagram, no secrets, no CRM writes
  - setup_verification_script_status: `designed_and_tested_fixture_only`
  - setup_verification_live_mode_status: `implemented_and_mock_tested`
  - live_setup_verification_status: `not_run_after_v2`
  - previous_blocker: `live_readonly_setup_verification_not_implemented_in_fixture_task`
  - live-mode v2 now validates approval/path gates before credential lookup,
    enforces GET-only setup/config routes, blocks subscriber endpoints, writes
    private setup refs only under the approved private MailerLite artifact root,
    and writes redacted receipts only under the approved controlled-welcome-flow
    Mantis-Reports root.
  - live-mode v2 mocked tests cover redaction, path safety, credential precheck
    order, no subscriber-row reads, no mutation methods, and conservative
    mutation readiness.
  - mutation_readiness: `blocked_pending_live_readonly_setup_verification`
  - next recommended step: central integration closeout, then separate approval
    for one live read-only MailerLite setup verification run.
  - setup verification guard created:
    `docs/crm-vnext/mailerlite-onboarding-readonly-setup-verification-script-design-v0.md`
  - setup verification command created:
    `npm run crm:vnext:mailerlite-setup-readonly-verification`
  - setup verification tests created:
    `__tests__/crm-vnext-mailerlite-setup-readonly-verification.spec.ts`
  - setup verification fixture mode writes only redacted receipts and rejects
    repo output paths.
  - live setup verification completed under separate exact approval using only
    read-only setup/config metadata.
  - live_readonly_setup_verification_status:
    `completed_live_readonly_setup_config_metadata`
  - live_readonly_setup_verification_run_id:
    `crm_core_mailerlite_readonly_setup_verification_live_v1_2026-07-06`
  - live_readonly_setup_verification_result_doc:
    `docs/crm-vnext/mailerlite-onboarding-live-readonly-setup-verification-result-v0.md`
  - group_mapping_status: `confirmed_current_existing_label`
  - automation_mapping_status: `confirmed_current_existing_label`
  - field_mapping_status_counts:
    `confirmed_existing_field=3; missing_or_not_found=6`
  - trigger_behavior_status: `unknown_requires_behavior_check`
  - retrigger_behavior_status: `unknown_blocks_mutation`
  - suppression_status: `not_verified_no_subscriber_read`
  - idempotency_status: `not_verified_no_subscriber_read`
  - mutation_readiness: `blocked_field_mapping`
  - next recommended step: Prepare MailerLite setup drift / missing field
    mapping resolution packet.
  - setup_drift_resolution_packet_status: `integrated_no_run`
  - setup_drift_resolution_packet:
    `docs/crm-vnext/mailerlite-onboarding-setup-drift-missing-field-mapping-resolution-packet-v0.md`
  - latest_live_readonly_setup_verification_run_id:
    `crm_core_mailerlite_readonly_setup_verification_live_v1_2026-07-06`
  - latest_redacted_field_detail_extraction_run_id:
    `crm_core_mailerlite_setup_field_detail_redacted_extraction_2026-07-06`
  - confirmed_field_families: `name; country; city`
  - missing_field_families:
    `email; source_channel; source_context; onboarding_started_at; consent_or_context; crm_core_private_anchor_label`
  - email_interpretation: `native_top_level_subscriber_email_by_default`
  - private_anchor_policy: `keep_outside_mailerlite_by_default`
  - minimal_payload_v1_status: `not_ready`
  - group_mapping_status: `confirmed_current_existing_label`
  - automation_mapping_status: `confirmed_current_existing_label`
  - trigger_behavior_status: `unknown_requires_behavior_check`
  - retrigger_behavior_status: `unknown_blocks_mutation`
  - suppression_status: `not_verified_no_subscriber_read`
  - idempotency_status: `not_verified_no_subscriber_read`
  - mutation_readiness: `blocked_field_mapping`
  - recommended_next_step: collect manual no-secret field requiredness and
    trigger/retrigger answers.
  - manual_no_secret_answers_status: `completed`
  - manual_no_secret_answers_doc:
    `docs/crm-vnext/mailerlite-onboarding-manual-no-secret-field-requiredness-trigger-answers-v0.md`
  - email_native_top_level_subscriber_field: `yes`
  - source_channel_for_v1: `omit_for_v1`
  - source_context_for_v1: `omit_for_v1`
  - onboarding_started_at_for_v1: `omit_for_v1`
  - consent_or_context_policy_gate: `required`
  - consent_or_context_storage_for_v1: `keep_outside_mailerlite`
  - crm_core_private_anchor_label_for_v1: `keep_private_only`
  - group_trigger_behavior: `confirmed_yes_by_Alejandro`
  - retrigger_behavior: `unknown_blocks_duplicate_readd`
  - suppression_idempotency_policy: `final_packet_specific_check_required`
  - minimal_payload_v1_review_status:
    `ready_for_no_write_mutation_review_packet_design_with_final_gates`
  - mutation_readiness:
    `blocked_pending_no_write_mutation_review_and_final_packet_specific_checks`
  - recommended_next_step: prepare MailerLite minimal no-write mutation review
    packet.
- `latest_commit`: pending lane-local manual no-secret answers commit.
- `latest_receipt`: redacted receipt path labels recorded in
  `docs/crm-vnext/mailerlite-onboarding-live-readonly-setup-verification-result-v0.md`
- `blockers`: final top-level email payload semantics must be reviewed in
  the no-write packet; retrigger behavior remains unknown for duplicate/re-add
  paths; suppression and idempotency require final packet-specific checks before
  mutation.
- `setup_verification_live_mode_status`: `implemented_and_mock_tested`
- `live_setup_verification_status`: `completed_live_readonly_setup_config_metadata`
- `previous_blocker`: `live_readonly_setup_verification_not_implemented_in_fixture_task`
- `mutation_readiness`: `blocked_pending_no_write_mutation_review_and_final_packet_specific_checks`
- `next_recommended_step`: prepare MailerLite minimal no-write mutation
  review packet.
- `next_approval_needed`: central integration of manual no-secret answers,
  then separate approval for a no-write minimal mutation review packet design.
- `proposed_integration_note`: MailerLite lane now has the first private
  no-write payload preview from controlled Instagram email-handoff evidence.
  The preview proves CRM Core can prepare a private onboarding payload preview
  without calling MailerLite or mutating subscribers, groups, fields,
  automations, campaigns, CRM state, or source state. The lane now also has a
  implemented and mocked-live-tested redaction-safe setup verification guard.
  The first live read-only setup/config verification confirmed current group
  and automation mapping. The setup drift resolution packet is integrated, and
  Alejandro has now supplied no-secret field requiredness and trigger answers.
  Mutation remains blocked pending a no-write mutation review packet and final
  packet-specific suppression/idempotency checks.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.
