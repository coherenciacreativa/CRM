# CRM Core Historical Catch-Up Productive Stage 2 Authority v1

Date: 2026-07-22

```yaml
mission_id: crm_core_historical_catchup_productive_stage2_authority_gate_repo_only_v1_20260722
contract_version: v1_preimplementation_chief_architect_review_no_live
status: isolated_repo_only_implementation_complete_validation_and_independent_review_green_formal_ratification_and_central_integration_pending_no_live
mode: proof
central_baseline: a746c6faba706b6331e86268f4edb4ab78d218e9
target_branch: codex/crm-core-reentry
source_branch: codex/crm-core-productive-stage2-authority-design-v1-20260722
business_outcome: >-
  Remove the single deliberate authorization blocker in the already integrated
  historical Stage 2 operator by adding one environment-owned, one-use gate.
  The later separately approved proof can then verify the existing semantic
  notification-to-profile route without opening a thread or approaching Send.
observable_success:
  repo_only_implementation:
    - authority gate and productive operator composition are deterministic and synthetic-test green
    - no source browser private artifact fixed root network or external effect is used
    - no new browser backend source host materializer packet Stage 3 or Safari rail is created
  later_real_stage_2_under_separate_approval:
    - one operator invocation and one isolated source-tab lifecycle
    - at_most_eight_notification_rows_total
    - exactly_two_distinct_notification_to_profile_traversals
    - zero_thread_opens
    - zero_seen_transitions
    - zero_source_or_downstream_capabilities
    - aggregate_redacted_receipt_only
approval_gate:
  contract_review_authorized: true
  repo_only_implementation_requested: true
  chief_architect_preimplementation_verdict_required: green_to_execute_repo_only_implementation
  chief_architect_preimplementation_advisory: favorable_but_structurally_incomplete_not_formal_authority
  preimplementation_review_complete: false
  real_stage_2_execution_explicitly_approved: false
  stage_3_execution_explicitly_approved: false
  send_explicitly_approved: false
  integration_requires_later_formal_verdict: true
approved_effects_for_this_review:
  repo_reads:
    - current CRM Core contracts implementation tests and Git metadata
  repo_or_source_writes:
    - this proposed mission contract on the isolated source branch
  live_source_reads: []
  private_artifact_reads: []
  sends: []
  mutations: []
  permission_changes: []
  irreversible_actions: []
  UI_actions:
    - one canonical Chief Architect contract review relay only
proposed_repo_only_implementation_allowlist:
  - scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.spec.ts
  - docs/crm-vnext/missions/crm-core-historical-catchup-productive-stage2-authority-v1.md
  - docs/crm-vnext/crm-core-next-action.md
  - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
architecture:
  source_backend: existing_codex_in_app_browser_semantic_read_only_v1
  source_host: existing_historical_stage_2_zero_argument_productive_entry
  operator: existing_historical_catchup_no_send_operator
  authority_gate: new_dedicated_environment_owned_same_process_one_use_gate
  additional_browser_backend: forbidden
  source_host_change: forbidden
  materializer_or_packet_change: forbidden
  stage_3_or_runner_change: forbidden
  safari_or_actuation_change: forbidden
authority_contract:
  installation_owner: environment_only
  symbol: crm-core/historical-catchup-stage2-authority-runtime/v1
  alias: crmCoreHistoricalCatchupStage2AuthorityRuntimeV1
  brand: crm_core_historical_catchup_stage2_authority_runtime_v1
  binding_descriptors: exact_own_nonwritable_nonenumerable_nonconfigurable_data_properties
  alias_identity: exact_same_object
  facade_shape:
    prototype: Object.prototype
    frozen: true
    proxy: false
    exact_own_data_fields:
      - brand
      - consume_historical_catchup_stage2_authority_once
    method_arguments: zero
  production_vs_test:
    production_binding: fixed_global_symbol_and_alias_only
    test_binding: module_internal_ForTest_seam_only
    registries: disjoint
    cross_mode_use: recognized_burn_and_reject
  issuance:
    recognized_authority_instances_per_approval: 1
    environment_installations_per_approval: 1
    mission_ledger_claims_per_approval: 1
    authority_method_successes_per_approval: 1
  mission_wide_durability: >-
    Before returning a recognized authority, the environment must atomically
    claim its private approval nonce in an owner-only mission ledger. A process
    restart, crash, second installation, or second process observes that claim
    and fails closed. The repository gate receives only the closed private
    attestation and never the ledger path or contents.
  capture_and_consumption_order:
    - absent_hostile_or_malformed_global_binding_is_rejected_without_method_call_or_burn_claim
    - exact_facade_is_captured_before_any_method_call
    - consume_historical_catchup_stage2_authority_once_is_invoked_exactly_once
    - the_environment_atomically_claims_the_approval_nonce_before_returning_any_record
    - a_stale_wrong_bound_or_malformed_return_is_already_consumed_or_claimed_and_cannot_retry
    - repository_validation_of_the_return_occurs_only_after_that_irreversible_claim
    - source_action_occurs_only_after_the_claimed_return_is_exact_and_green
  caller_authority_fields: forbidden
  caller_input: exact_command_only
  ttl_ms: 300000
  gate_owned_clock: true
  freshness_rule:
    - issued_at_ms_is_safe_integer
    - expires_at_ms_minus_issued_at_ms_equals_300000
    - issued_at_ms_less_than_or_equal_to_gate_owned_now_ms
    - gate_owned_now_ms_strictly_less_than_expires_at_ms
  renewal: forbidden
  authority_capability_persistence_or_serialization: forbidden
  permitted_durable_state: approval_nonce_attempt_claim_only_in_environment_owned_owner_only_ledger
  recognized_replay_wrong_binding_wrong_mission_wrong_policy_or_cross_mode_use: burn_and_reject
  unrecognized_foreign_or_clone_use: reject_without_claiming_burn
  exact_private_authority_result_fields:
    - authority_schema_version
    - mission_id
    - contract_version
    - approval_instance_sha256
    - approved_central_commit
    - observed_central_commit
    - observed_upstream_commit
    - target_branch
    - observed_branch
    - upstream_present
    - repository_clean
    - mission_contract_sha256
    - next_action_sha256
    - approved_owner_account_anchor_sha256
    - source_runtime_owner_account_anchor_sha256
    - source_runtime_account_binding_attested
    - source_backend
    - selection_policy
    - command
    - issued_at_ms
    - expires_at_ms
    - max_rows_total
    - exact_distinct_traversals
    - max_threads
    - max_seen_transitions
    - capabilities_issued
    - stage_3_authorized
    - send_authorized
    - mission_ledger_claimed_once
    - prior_mission_ledger_claims
  exact_private_authority_invariants:
    authority_schema_version: crm_core_historical_catchup_stage2_private_authority_v1
    mission_id: crm_core_historical_catchup_productive_stage2_authority_gate_repo_only_v1_20260722
    contract_version: v1_preimplementation_chief_architect_review_no_live
    sha256_fields: exact_lowercase_64_hex
    commit_relation: approved_central_commit_equals_observed_central_commit_equals_observed_upstream_commit
    target_branch: codex/crm-core-reentry
    observed_branch: codex/crm-core-reentry
    upstream_present: true
    repository_clean: true
    mission_contract_sha256: equals_current_tracked_mission_contract_bytes
    next_action_sha256: equals_current_tracked_next_action_bytes
    owner_anchor_relation: approved_owner_account_anchor_sha256_equals_source_runtime_owner_account_anchor_sha256
    source_runtime_account_binding_attested: true
    source_backend: codex_in_app_browser_semantic_read_only_v1
    selection_policy: historical_catchup_pilot_v1
    command: stage_2_qualification_only
    max_rows_total: 8
    exact_distinct_traversals: 2
    max_threads: 0
    max_seen_transitions: 0
    capabilities_issued: 0
    stage_3_authorized: false
    send_authorized: false
    mission_ledger_claimed_once: true
    prior_mission_ledger_claims: 0
    timestamp_type: safe_integer_milliseconds
    timestamp_relation: issued_at_ms_less_than_or_equal_to_gate_now_strictly_less_than_expires_at_ms
    ttl_relation: expires_at_ms_minus_issued_at_ms_equals_300000
  account_scope: >-
    The authority and source runtime are installed by the same environment and
    share one hidden exact owner-account anchor. The authority succeeds only
    when its approved and runtime anchors match, and the source facade must
    refuse its own open action if the authenticated source account does not
    match that same anchor. This scopes the read without changing the host
    schema and does not claim that Stage 2 itself observed the owner account.
  exact_private_bindings:
    - mission_id
    - contract_version
    - approved_integrated_commit_equal_to_clean_upstream
    - tracked_mission_and_next_action_digests
    - exact_owner_approval_reference
    - semantic_iab_backend
    - historical_catchup_pilot_v1_policy
    - stage_2_qualification_only_command
    - max_rows_total_8
    - exact_distinct_traversals_2
    - max_threads_0
    - max_seen_transitions_0
    - capabilities_issued_0
    - stage_3_false
    - send_false
productive_sequence:
  - validate_exact_operator_command_without_accepting_private_or_truth_inputs
  - capture_and_consume_environment_owned_authority_once
  - stop_before_source_on_any_authority_failure
  - invoke_existing_productive_historical_stage_2_host_exactly_once
  - preserve_truthful_source_attempt_performed_and_progress_state
  - require_exact_finalize_once_receipt
  - return_only_validated_aggregate_redacted_operator_receipt_v2
real_stage_2_caps:
  operator_invocations: 1
  source_host_invocations: 1
  isolated_tabs_opened_max: 1
  notification_rows_scanned_total_max: 8
  notification_profile_traversals_exact: 2
  threads_opened: 0
  seen_transitions: 0
  source_capabilities_issued: 0
  downstream_capabilities_issued: 0
  finalization:
    before_valid_source_runtime_capture: 0
    after_valid_source_runtime_capture_attempts_exact: 1
    successful_qualification_requires_finalize_green: true
    failed_finalize_preserves_progress_and_blocks: true
  retries_after_source_action_attempted: 0
truth_boundary:
  proves:
    - bounded_notification_to_profile_mechanism_health
    - two_distinct_byte_exact_private_pair_bindings
    - zero_thread_and_seen_progress
  does_not_prove:
    - eligible_candidate
    - current_follows_owner_relationship
    - exact_owner_account_observed_in_source
    - thread_binding
    - dedupe_or_prior_welcome_absence
    - composer_or_attachment_availability
    - exact_elapsed_age_or_campaign_membership
  controlling_label: mechanism_only_stage_2_qualification
receipt_contract:
  version: v2_required
  public_content: aggregate_counts_booleans_fixed_enums_and_allowlisted_blockers_only
  must_distinguish:
    - authority_absent_or_invalid_before_source
    - authority_consumed
    - source_action_attempted
    - source_action_performed
    - exact_qualification_progress
    - effect_possible_or_unknown
    - finalization_success_or_failure
  prohibited_content:
    - identity_handle_name_profile_or_thread_reference
    - owner_account_reference
    - notification_text_or_age_label
    - URL_selector_DOM_screenshot_coordinate_or_OCR
    - approval_reference_digest_timestamp_path_or_private_payload
  browser_network_truth: >-
    Production may claim false only with mechanical attestation. Otherwise use
    explicit unknown. Source progress and post-entry ambiguity must never be
    reset to zero.
  reachable_state_table:
    input_invalid:
      authority_recognized: false
      authority_consumed: false
      source_action_attempted: false
      source_action_performed: false
      browser_used: false
      network_used: null
      progress: zero
    authority_absent_or_unrecognized:
      authority_recognized: false
      authority_consumed: false
      source_action_attempted: false
      source_action_performed: false
      browser_used: false
      network_used: null
      progress: zero
    recognized_authority_rejected_after_burn:
      authority_recognized: true
      authority_consumed: true
      source_action_attempted: false
      source_action_performed: false
      browser_used: false
      network_used: null
      progress: zero
    authority_valid_source_runtime_absent_or_invalid:
      authority_recognized: true
      authority_consumed: true
      source_host_invoked: true
      source_action_attempted: false
      source_action_performed: false
      browser_used: false
      network_used: null
      isolated_tab_finalize_attempts: 0
      progress: zero
      retry_allowed: false
    source_open_throw_or_malformed:
      authority_recognized: true
      authority_consumed: true
      source_action_attempted: true
      source_action_performed: false
      browser_used: null_unless_isolated_tab_opened_is_mechanically_true
      network_used: null
      external_effect_possible_or_unknown: true
      progress: truthful_lower_bound
    source_qualification_blocked_after_open:
      authority_recognized: true
      authority_consumed: true
      source_action_attempted: true
      source_action_performed: true
      browser_used: true
      network_used: null
      external_effect_possible_or_unknown: exact_validated_source_receipt_value
      progress: exact_safe_aggregates_from_validated_source_receipt
    source_finalize_failed:
      authority_recognized: true
      authority_consumed: true
      source_action_attempted: true
      source_action_performed: source_receipt_exact_value
      browser_used: true_only_if_isolated_tab_opened_else_null
      network_used: null
      isolated_tab_finalized: false
      external_effect_possible_or_unknown: exact_validated_source_receipt_value
      primary_source_blocker: exact_validated_source_receipt_value
      retry_allowed: false
    qualified:
      authority_recognized: true
      authority_consumed: true
      source_action_attempted: true
      source_action_performed: true
      browser_used: true
      network_used: null
      rows_scanned_total: 1_to_8
      notification_profile_pairs_qualified: 2
      threads_opened: 0
      seen_transitions: 0
      capabilities_issued: 0
      isolated_tab_finalized: true
      external_effect_possible_or_unknown: false
forbidden_scope:
  - any real Stage 2 invocation during design implementation test review or integration
  - any Stage 3 candidate observation or eligible-candidate claim
  - thread open Seen transition private material capability artifact or packet
  - PRECLAIM claim PENDING file chooser attachment upload preview or Send
  - text follow-back reaction comment or relationship change
  - MailerLite CRM campaign Ads proxy API mutation or any external effect
  - Chrome Safari-as-source OCR screenshot coordinate or fallback backend
  - caller-supplied identity policy runtime URL selector clock approval or truth boolean
  - source host materializer packet runner or Safari actuator modifications
  - fixed private artifact roots or real authority installation
  - files outside the exact implementation allowlist
source_private_boundaries:
  source_of_truth: codex/crm-core-reentry_at_a746c6faba706b6331e86268f4edb4ab78d218e9
  private_inputs: none_for_repo_only_implementation
  prohibited_outputs:
    - secrets
    - raw identities
    - private_values
    - raw_target_URLs
    - private_artifact_contents
autonomy_budget:
  max_minutes: 120
  max_repair_cycles: 2
  new_targets_or_effects: 0
self_repair_budget:
  safe_mechanical_repairs: allowed_within_exact_allowlist
  scope_broadening: forbidden
manual_intervention_policy:
  allowed_in_proof: false
  max_minutes: 0
  requirements: []
  manual_intervention_used: false
  hardening_candidate: false
leverage_filter:
  passes_if_any:
    - unlocks_current_milestone
    - removes_recurring_human_authority_injection_from_operator_inputs
    - prevents_unapproved_source_reads
    - required_for_autonomous_operation
  result: required_for_current_vertical_slice_without_new_pipeline
atomicity_freshness_requirements:
  - future_real_run_is_authority_consume_then_source_then_finalize_then_redacted_receipt
  - no_consultant_or_human_handoff_inside_the_freshness_sequence
  maximum_authority_age_ms: 300000
reviewer_plan:
  executor: primary_codex_in_isolated_worktree
  adversarial_reviewer: independent_codex
  required_checks:
    - observable_outcome
    - bureaucracy_and_copy_paste
    - overbuilding_and_redundant_infrastructure
    - effect_allowlists
    - privacy_identity_and_truthfulness
    - one_use_burn_and_replay
    - source_action_cap_and_no_retry
    - one_integration
validation_plan:
  focused:
    - new_authority_gate_suite_green
    - operator_and_source_host_suites_green
  compatibility:
    - exact_five_suite_semantic_source_to_runner_boundary_green_or_fresh_central_equivalent_fingerprint
    - complete_welcome_audio_suite_compared_freshly_to_clean_central
  static:
    - node_check_changed_scripts
    - exact_eight_file_allowlist
    - git_diff_check
    - redaction_and_forbidden_import_scan
  mandatory_cases:
    - missing_stale_replayed_foreign_cloned_wrong_commit_wrong_branch_dirty_context_missing_upstream_upstream_divergence_wrong_mission_wrong_mission_digest_wrong_next_action_digest_wrong_approval_reference_wrong_policy_wrong_caps_authority_zero_source_calls
    - hostile_or_malformed_authority_zero_source_calls
    - malformed_global_facade_zero_method_calls_zero_ledger_claims_zero_source_calls
    - exact_facade_one_method_call_one_ledger_claim_and_invalid_return_permanently_consumed_zero_source_calls
    - wrong_authority_schema_version_wrong_contract_version_wrong_backend_wrong_authority_command_zero_source_calls
    - invalid_TTL_future_issued_at_expired_or_non_gate_clock_relationship_zero_source_calls
    - owner_account_attestation_false_or_owner_anchor_mismatch_zero_source_calls
    - stage_3_true_send_true_or_nonzero_capabilities_zero_source_calls
    - ledger_claim_false_prior_claim_nonzero_or_duplicate_claim_zero_source_calls
    - valid_authority_one_productive_host_call_only
    - green_source_at_most_eight_rows_exactly_two_distinct_pairs_zero_threads_zero_seen_zero_capabilities
    - valid_authority_with_missing_or_invalid_source_runtime_zero_source_action_zero_finalize_no_retry
    - runtime_missing_throw_malformed_report_or_finalize_failure_authority_burned_progress_truthful_and_no_retry
    - process_restart_second_install_or_second_process_same_approval_nonce_blocked_by_mission_ledger_before_source
    - crash_after_authority_claim_before_source_then_second_process_same_approval_nonce_zero_source_calls
    - crash_after_source_attempt_before_receipt_then_second_process_same_approval_nonce_zero_source_calls
    - approved_and_runtime_owner_account_anchor_mismatch_blocks_before_source
    - extra_operator_input_or_stage_3_literal_rejected_before_authority_or_source
escalation_conditions:
  - business_or_identity_ambiguity
  - privacy_or_source_boundary_uncertainty
  - any_real_source_action_required
  - duplicate_or_unknown_authority_consumption_state
  - receipt_schema_cannot_represent_truth_without_widening
  - source_host_backend_materializer_packet_stage_3_runner_or_safari_change_required
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - any_P0_to_P2_residual
stop_conditions:
  - any file outside the exact implementation allowlist
  - any real browser private source fixed root network or external effect
  - any attempt to install or mint a real authority
  - any additional browser backend or source family
  - any claim that Stage 2 proves candidate eligibility owner identity or current relationship
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_commits: pending_until_implementation_commit
  changed_file_allowlist: exact_proposed_eight_files
  deterministic_checks: exact_validation_plan_above
  integration_packet_id: pending_after_implementation
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
chief_architect_authority_boundaries:
  preimplementation_contract_verdict: green_to_execute_repo_only_implementation
  postimplementation_integration_verdict: green_to_self_integrate
  later_real_stage_2_execution_field: safe_to_execute_later_real_stage2_under_fresh_ceo_approval
  merge_verdict_is_not_source_execution_authority: true
later_real_stage_2_gate:
  requires:
    - final_repo_only_implementation_centrally_integrated
    - formal_Chief_Architect_safe_to_execute_later_real_stage2_under_fresh_ceo_approval_true
    - fresh_exact_CEO_approval_bound_to_final_integrated_commit_and_contract
    - fresh_environment_owned_authority_installed_privately
    - clean_current_central_equal_to_upstream
    - source_runtime_preflight_green
  explicitly_not_authorized_here: true
later_stage_3_boundary:
  separate_mission_after_real_stage_2_evidence: true
  explicitly_not_authorized_here: true
implementation_checkpoint:
  isolated_repo_only_implementation_complete: true
  focused_synthetic_tests_green: true
  focused_gate_operator_source_tests: 169_of_169_green
  exact_five_suite_boundary_tests: 259_of_259_green
  full_welcome_audio_comparison: 1071_green_plus_exact_three_known_central_failures_and_matching_emfile_fingerprint
  independent_final_review_complete: true
  independent_final_review_verdict: green_no_residual_P0_P1_P2
  formal_chief_architect_ratification_complete: false
  central_integration_complete: false
  real_stage_2_executed: false
  source_actions: 0
  real_authority_installed: false
  browser_used: false
  network_used: false
  external_effect_invoked: false
  stage_3_authorized: false
  live_authority: false
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

## Controlling interpretation

The current source host and its productive historical Stage 2 export are
already integrated. On the central baseline, the operator still blocks before
that export on purpose. In the isolated implementation, the operator consumes
the new authority gate before it can invoke the unchanged productive source
host. This mission adds only that missing authority boundary and a receipt
state that can truthfully describe a real, bounded, read-only qualification
later.

Stage 2 is deliberately a mechanism proof. It does not produce an eligible
candidate and cannot flow into Stage 3. A green repo-only implementation still
performs zero source actions. A later real Stage 2 invocation remains a
separate, fresh approval boundary tied to the final integrated commit.

The canonical Chief Architect returned a favorable initial advisory response,
but it omitted the required structured fields and sentinel. It is therefore
not a completed preimplementation review, formal integration authority, or
live/source authority. The isolated repo-only implementation, validation, and
independent final review are complete and green with no residual P0-P2. A
complete formal Chief Architect ratification tied to the implementation commit
and central integration remain pending. Any requested host, backend, materializer,
packet, Stage 3, runner, or Safari expansion returns this mission to HOLD rather
than widening it silently.
