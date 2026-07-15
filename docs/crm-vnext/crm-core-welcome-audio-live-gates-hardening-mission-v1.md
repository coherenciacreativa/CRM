# CRM Core Welcome Audio Live Gates Hardening Mission v1

Date: 2026-07-15
Mission ID: `crm_core_welcome_audio_live_gates_hardening_v1_2026_07_15`
Mode: `hardening`
Status: `approved_repo_only_no_live_effects`
Approved central baseline: `502b0bc9cc3f5fa901a3377173d1dcf5bca7c8ab`

```yaml
mission_id: crm_core_welcome_audio_live_gates_hardening_v1_2026_07_15
business_outcome: >-
  Completar, revisar e integrar los gates tecnicos que faltan para que una
  mision posterior pueda ejecutar el canary de backlog sellado mediante
  Computer Use y Safari sin saltarse dedupe, claims, caps, manifest, asset,
  provenance, confirmacion fuerte ni no-retry terminal.
observable_success:
  - live_owner_only_claim_issuer_implemented_and_tested=true
  - mission_wide_exact_identity_dedupe_and_max_three_claim_cap_tested=true
  - sealed_manifest_max_eight_order_interval_and_digest_validator_tested=true
  - durable_manifest_cursor_enforces_order_and_max_eight=true
  - exact_audio_regular_file_no_symlink_and_sha256_validator_tested=true
  - safari_computer_use_live_host_seam_implemented_and_fake_driver_tested=true
  - fresh_state_before_each_action_and_one_send_max_enforced=true
  - stage_one_confirmation_required_before_claim_slots_two_or_three=true
  - bound_thread_observation_state_enforces_max_three_reads_and_72_hours=true
  - strong_confirmation_only_and_compose_reset_rejected=true
  - independent_adversarial_review=green_to_self_integrate
  - central_integration_count=1
  - browser_used=false
  - private_artifacts_read=0
  - live_source_reads=0
  - external_effects=0
mode: hardening
approval_gate:
  contract_version: crm_core_welcome_audio_live_gates_hardening_v1_2026_07_15
  execution_explicitly_approved: true
  approved_targets_and_stop_rules:
    - user_approved_the_four_iteration_no_live_technical_phase_after_the_gap_explanation
    - repo_changes_tests_commits_review_and_one_central_integration_only
    - no_instagram_no_real_safari_no_private_backlog_no_audio_send_no_mailerlite_no_campaign
approved_effects:
  repo_reads:
    - /Users/alejandrogomez/CRM-core_and_exact_new_worktrees_at_baseline_502b0bc
  live_source_reads: []
  private_artifact_reads: []
  repo_or_source_writes:
    - exact_allowlisted_code_tests_docs_commits_branch_pushes_and_one_central_integration
  sends: []
  mutations:
    - git_commits_and_pushes_only
  permission_changes: []
  irreversible_actions: []
  UI_actions:
    - optional_local_neutral_Safari_preflight_only_after_code_review_with_no_network_or_private_data
forbidden_scope:
  - Instagram_or_any_live_source
  - private_backlog_manifest_contents_or_private_identity_values
  - real_audio_upload_preview_or_send
  - MailerLite_credentials_API_UI_or_mutation
  - campaign_or_Ads_inspection_edit_reactivation_or_launch
  - Chrome_hybrid_text_fallback_follow_back_or_other_outreach
  - CRM_or_legacy_repo_reads_or_writes
  - production_ready_send_allowed_or_live_authority_claim_before_integrated_review_and_later_exact_canary_approval
source_private_boundaries:
  source_of_truth: /Users/alejandrogomez/CRM-core branch codex/crm-core-reentry at 502b0bc9cc3f5fa901a3377173d1dcf5bca7c8ab
  private_inputs: none
  prohibited_outputs: [secrets, raw_identities, private_values, raw_target_urls, paths_to_private_artifacts, digests_from_private_artifacts]
autonomy_budget:
  max_minutes: 840
  max_repair_cycles: 3
  new_targets_or_effects: 0
self_repair_budget:
  safe_mechanical_repairs: allowed
  scope_broadening: forbidden
manual_intervention_policy:
  allowed_in_proof: false
  max_minutes: 0
  requirements: [no_live_or_private_intervention]
  manual_intervention_used: false
  hardening_candidate: true
leverage_filter:
  passes_if_any: [unlocks_current_milestone, reused_at_least_three_times, removes_recurring_human_labor, prevents_material_harm, required_for_autonomy]
  result: required_for_autonomy_and_prevents_duplicate_or_wrong_recipient_effects
atomicity_freshness_requirements:
  - fresh_central_check_before_lane_creation
  - deterministic_test_and_redaction_check_before_review
  - fresh_source_SHA_allowlist_and_central_HEAD_check_before_integration
  - one_lock_one_integration_post_merge_validation_push_release
  maximum_snapshot_age: central_and_source_git_state_rechecked_immediately_before_integration
reviewer_plan:
  executor: two_independent_implementation_workers_plus_root_integrator
  adversarial_reviewer: independent_worker_not_used_for_implementation
  required_checks: [observable_outcome, bureaucracy_and_copy_paste, overbuilding, effect_allowlists, privacy_and_identity, concurrency_and_crash_safety, browser_host_provenance, no_hidden_live_effects, one_integration]
escalation_conditions:
  - business_or_identity_ambiguity
  - privacy_or_source_boundary_uncertainty
  - unapproved_real_effect_required
  - duplicate_mutation_risk_or_unknown_post_mutation_state
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - required_human_authentication_or_security_confirmation
  - required_UI_control_unavailable
  - browser_host_cannot_preserve_claim_pending_one_actuation_terminal_ordering
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_commits:
    - <live_claim_issuer_source_SHA>
    - <safari_live_host_source_SHA>
    - <assembly_source_SHA>
  changed_file_allowlist:
    - scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs
    - scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - scripts/crm-vnext-instagram-welcome-audio-operation-guard.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-live-claim-issuer.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-live-preflight.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-operation-guard.spec.ts
    - docs/crm-vnext/instagram-welcome-audio-live-claim-issuer-v1.md
    - docs/crm-vnext/instagram-welcome-audio-safari-live-host-v1.md
    - docs/crm-vnext/crm-core-welcome-audio-live-gates-hardening-mission-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/workstreams/integration.md
    - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  deterministic_checks:
    - node_syntax
    - focused_claim_preflight_and_host_tests
    - inherited_welcome_audio_guard_and_operational_rail_tests
    - sealed_backlog_source_class_and_provenance_binding_tests
    - concurrency_crash_replay_and_cap_adversarial_tests
    - ordered_cursor_stage_unlock_and_bound_observer_state_tests
    - exact_file_allowlist
    - git_diff_check
    - privacy_and_redaction_scan
    - no_browser_network_private_or_external_effect_evidence
  integration_packet_id: <redacted_live_gates_packet_id>
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
final_ceo_brief_fields:
  - outcome_and_evidence
  - technical_progress_vs_product_outcome
  - real_effects_executed
  - boundary_confirmation
  - metrics_and_exceptions
  - final_central_commit
  - remaining_risk
  - next_highest_leverage_decision
  - all_mission_metrics
```

## Execution boundary

This mission may make and integrate the exact repository changes above. It may
not inspect a real follower, open Instagram, read a private backlog, attach an
audio, call MailerLite, or touch campaign state. The first real canary remains
behind a later owner-only approval bound to the final integrated commit and the
sealed private inputs.
