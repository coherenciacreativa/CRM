# CRM Core Workstream: MailerLite Onboarding

- `workstream_id`: `mailerlite-onboarding`
- `branch`: `codex/crm-core-mailerlite-onboarding`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-mailerlite`
- `consultant_chat`: MailerLite onboarding consultant
- `codex_worker`: MailerLite onboarding lane worker
- `status`: `exact_mutation_approval_packet_design_complete_no_run`
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

- `exact_mutation_execution_guard_status`:
  `scaffolded_blocked_safe_mutation_client_contract_missing`
- `exact_mutation_execution_guard_design_doc`:
  `docs/crm-vnext/mailerlite-onboarding-exact-mutation-execution-guard-design-v0.md`
- `exact_mutation_execution_guard_command`:
  `npm run crm:vnext:mailerlite-exact-onboarding-mutation`
- `mutation_execution_route_previous_status`:
  `not_implemented`
- `live_mutation_status`:
  `not_run`
- `actual_mutation_status`:
  `not_executed`
- `mutation_readiness`:
  `blocked_pending_safe_mutation_client_contract`
- `recommended_next_step`: central integration of exact mutation execution
  guard as a blocked scaffold, then resolve the safe mutation client contract
  before exact CEO mutation approval.
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
  - manual_no_secret_answers_status: `integrated`
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
  - minimal_no_write_mutation_review_packet_design_status: `integrated_no_run`
  - minimal_no_write_mutation_review_packet_design_doc:
    `docs/crm-vnext/mailerlite-onboarding-minimal-no-write-mutation-review-packet-design-v0.md`
  - preferred_future_operation_class:
    `subscriber_upsert_then_add_to_confirmed_onboarding_group_if_final_checks_pass`
  - top_level_email_semantics: `native_top_level_subscriber_email_required`
  - mapped_field_families_for_v1: `name; country; city when present in approved private evidence`
  - omitted_mailerlite_field_families_for_v1:
    `source_channel; source_context; onboarding_started_at; consent_or_context; crm_core_private_anchor_label`
  - consent_context_gate: `required_keep_outside_mailerlite`
  - private_anchor_policy: `keep_outside_mailerlite`
  - group_trigger_behavior: `confirmed_yes_by_Alejandro`
  - retrigger_behavior: `unknown_blocks_duplicate_readd`
  - final_idempotency_suppression_check_required: true
  - no_write_packet_preparation_readiness:
    `ready_after_central_integration_and_separate_private_evidence_approval`
  - actual_mutation_readiness:
    `blocked_pending_no_write_packet_preparation_final_idempotency_suppression_check_and_exact_mutation_approval`
  - recommended_next_step: approve or pause no-write packet preparation from
    approved private controlled email-handoff evidence.
  - minimal_no_write_packet_from_private_evidence_status:
    `prepared_no_write`
  - minimal_no_write_packet_from_private_evidence_result_doc:
    `docs/crm-vnext/mailerlite-onboarding-minimal-no-write-mutation-review-packet-from-private-evidence-result-v0.md`
  - mutation_readiness:
    `no_write_packet_prepared_final_checks_required`
  - final_idempotency_status: `required_not_run`
  - final_suppression_status: `required_not_run`
  - duplicate_readd_status: `blocked_retrigger_unknown`
  - recommended_next_step: prepare final packet-specific
    idempotency/suppression check approval boundary.

- `final_idempotency_suppression_check_route_status`:
  `integrated_implemented_and_mock_tested`
- `final_idempotency_suppression_check_route_design_doc`:
  `docs/crm-vnext/mailerlite-onboarding-final-idempotency-suppression-check-route-design-v0.md`
- `final_idempotency_suppression_check_command`:
  `npm run crm:vnext:mailerlite-final-idempotency-suppression-check`
- `previous_blocker`: `route_not_implemented_or_not_redaction_safe`
- `live_final_check_status`: `not_run_after_guard_integration`
- `mutation_readiness`:
  `blocked_pending_final_packet_specific_check`
- `recommended_next_step`: approve or pause one final packet-specific
  idempotency/suppression check using the implemented guard.

- `final_check_route_contract_fix_status`: `integrated_completed_mock_tested`
- `previous_live_final_check_status`:
  `blocked_route_result_contract_inconsistent`
- `previous_live_final_check_api_called`: false
- `current_live_final_check_status`: `not_run_after_contract_fix`
- `private_packet_email_anchor_status`:
  `repaired_resolvable_for_final_check`
- `private_packet_email_anchor_repair_status`: `completed`
- `private_packet_email_anchor_repair_result_doc`:
  `docs/crm-vnext/mailerlite-onboarding-private-packet-email-anchor-repair-result-v0.md`
- `internal_lookup_input_resolvable_for_final_check`: true
- `internal_lookup_input_storage`: `private_packet_only`
- `final_idempotency_suppression_check_status`:
  `completed_live_readonly_ready_for_exact_mutation_approval`
- `final_idempotency_suppression_check_result_doc`:
  `docs/crm-vnext/mailerlite-onboarding-final-idempotency-suppression-check-result-v0.md`
- `live_lookup_ran`: true
- `subscriber_lookup_status`: `not_found`
- `onboarding_group_membership_status`: `not_found`
- `suppression_status`: `pass`
- `idempotency_status`: `pass`
- `duplicate_readd_status`: `safe_new_or_not_in_group`
- `mutation_readiness`:
  `ready_for_exact_mutation_approval_packet`
- `actual_mutation_status`: `not_executed`
- `recommended_next_step`: prepare exact MailerLite mutation approval packet.
- `exact_mutation_approval_packet_design_status`: `completed_no_run`
- `exact_mutation_approval_packet_design_doc`:
  `docs/crm-vnext/mailerlite-onboarding-exact-mutation-approval-packet-design-v0.md`
- `final_check_status`: `completed_live_readonly_ready_for_exact_mutation_approval`
- `mutation_readiness`: `blocked_pending_safe_mutation_client_contract`
- `mutation_execution_route_previous_status`: `not_implemented`
- `mutation_execution_route_guard_status`:
  `scaffolded_safe_mutation_client_contract_missing`
- `live_mutation_status`: `not_run`
- `actual_mutation_status`: `not_executed`
- `recommended_next_step`: resolve safe mutation client contract before asking
  for packet-specific mutation approval.
- `latest_commit`: pending central closeout commit for minimal no-write packet
  from private evidence; source run id
  `crm_core_mailerlite_minimal_no_write_mutation_review_packet_from_private_evidence_2026-07-06`
- `latest_receipt`: redacted receipt path labels recorded in
  `docs/crm-vnext/mailerlite-onboarding-minimal-no-write-mutation-review-packet-from-private-evidence-result-v0.md`
- `blockers`: safe mutation client contract is missing for the exact subscriber
  upsert plus onboarding-group assignment operation class; MailerLite mutation,
  CRM enrichment/write, assistant reply, and production automation remain closed
- `setup_verification_live_mode_status`: `implemented_and_mock_tested`
- `live_setup_verification_status`: `completed_live_readonly_setup_config_metadata`
- `previous_blocker`: `live_readonly_setup_verification_not_implemented_in_fixture_task`
- `mutation_readiness`:
  `blocked_pending_safe_mutation_client_contract`
- `next_recommended_step`: resolve safe mutation client contract for the exact
  mutation guard before requesting exact mutation approval.
- `next_approval_needed`: safe mutation client contract implementation or
  validation, then later exact mutation approval if the route becomes
  implemented and tested.
- `proposed_integration_note`: MailerLite lane now has the first private
  no-write payload preview from controlled Instagram email-handoff evidence.
  The preview proves CRM Core can prepare a private onboarding payload preview
  without calling MailerLite or mutating subscribers, groups, fields,
  automations, campaigns, CRM state, or source state. The lane now also has a
  implemented and mocked-live-tested redaction-safe setup verification guard.
  The first live read-only setup/config verification confirmed current group
  and automation mapping. The setup drift resolution packet is integrated, and
  Alejandro has now supplied no-secret field requiredness and trigger answers.
  The contract fix now blocks missing packet email anchors consistently and
  prevents false ready/pass/not_found statuses when precheck blocks. The private
  packet email anchor repair is complete, and the repaired private packet now
  contains a final-check-route-resolvable internal lookup input stored only in
  the private packet. Final check v2 completed as a live read-only
  packet-specific idempotency/suppression check with subscriber lookup not
  found, suppression pass, idempotency pass, safe duplicate/re-add status, and
  receipt consistency passed. CRM Core may prepare an exact mutation approval
  packet for review. The exact mutation approval packet design is now complete
  as no-run docs. The exact mutation execution guard is now scaffolded and
  mock-tested, but repo-only discovery did not find a reviewed redaction-safe
  MailerLite mutation client contract for the exact subscriber upsert plus
  onboarding-group assignment operation class, so actual mutation remains
  blocked pending safe client contract resolution and later exact future
  mutation approval.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.
