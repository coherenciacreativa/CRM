# CRM Core Workstream: MailerLite Onboarding

- `workstream_id`: `mailerlite-onboarding`
- `branch`: `codex/crm-core-mailerlite-onboarding`
- `worktree_path`: `/Users/alejandrogomez/CRM-core-mailerlite`
- `consultant_chat`: MailerLite onboarding consultant
- `codex_worker`: MailerLite onboarding lane worker
- `status`: `live_readonly_setup_verification_completed_mutation_blocked_field_mapping`
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
- `latest_commit`: pending central closeout commit for live read-only
  MailerLite setup verification result.
- `latest_receipt`: redacted receipt path labels recorded in
  `docs/crm-vnext/mailerlite-onboarding-live-readonly-setup-verification-result-v0.md`
- `blockers`: field mapping has six missing/not found expected fields;
  trigger behavior remains unknown; retrigger behavior blocks mutation;
  suppression is not verified because subscriber rows were not read;
  idempotency for mutation is not verified because subscriber rows were not
  read
- `setup_verification_live_mode_status`: `implemented_and_mock_tested`
- `live_setup_verification_status`: `completed_live_readonly_setup_config_metadata`
- `previous_blocker`: `live_readonly_setup_verification_not_implemented_in_fixture_task`
- `mutation_readiness`: `blocked_field_mapping`
- `next_recommended_step`: Prepare MailerLite setup drift / missing field
  mapping resolution packet.
- `next_approval_needed`: choose setup drift / missing mapping resolution,
  field creation proposal, minimal-payload no-write mutation review only if
  missing fields are optional, idempotency/suppression strategy, or pause.
- `proposed_integration_note`: MailerLite lane now has the first private
  no-write payload preview from controlled Instagram email-handoff evidence.
  The preview proves CRM Core can prepare a private onboarding payload preview
  without calling MailerLite or mutating subscribers, groups, fields,
  automations, campaigns, CRM state, or source state. The lane now also has a
  implemented and mocked-live-tested redaction-safe setup verification guard.
  The first live read-only setup/config verification now confirms current group
  and automation mapping, but mutation readiness remains blocked by missing
  field mapping, trigger/retrigger behavior, suppression, and idempotency.
- `closeout_format`: use template in
  `docs/crm-vnext/workstreams/_workstream-status-template-v0.md`.
