# CRM Core Mission Contract Template v1

Date: 2026-07-11
Status: reusable mission template

Use one contract per business outcome. Keep it compact enough to approve once
and precise enough for autonomous execution.

## Contract

```yaml
mission_id: <stable redacted identifier>

business_outcome: >-
  <The user-visible or operator-visible outcome, not the artifact to create.>

observable_success:
  - <Fresh evidence that proves the outcome.>
  - <Explicit distinction between technical progress and product outcome.>

mode: proof | hardening

approval_gate:
  contract_version: <version>
  execution_explicitly_approved: false
  exact_targets_sources_private_reads_effects_and_stop_rules: []

approved_effects:
  repo_reads: []
  live_source_reads: []
  private_artifact_reads: []
  repo_or_source_writes: []
  sends: []
  mutations: []
  permission_changes: []
  irreversible_actions: []
  UI_actions: []
  recipients_or_targets: []

forbidden_scope:
  - <Excluded repos, lanes, sources, people, recipients, permissions, actions.>

source_private_boundaries:
  authoritative_repo: <path label>
  target_branch: <branch>
  expected_base_commit: <commit>
  approved_live_sources: []
  approved_private_input_labels: []
  prohibited_output_classes:
    - secrets
    - raw_identities
    - private_values
    - source_payloads
    - raw_target_urls

autonomy_budget:
  max_elapsed_minutes: 120
  max_repair_cycles: 3
  max_new_targets_people_sources_or_effects: 0
  routine_CEO_interruptions: 0

self_repair_budget:
  allowed:
    - mechanical_schema_repair
    - safe_test_repair
    - pre_mutation_route_repair
    - receipt_format_repair
    - atomic_snapshot_refresh
  forbidden:
    - scope_broadening
    - new_real_effect
    - privacy_boundary_change
    - retry_after_possible_mutation_without_known_state

manual_intervention_policy:
  allowed_in_proof_mode: true
  max_minutes: 10
  must_be_reversible_or_low_risk: true
  must_be_privacy_safe: true
  may_expand_recipients_or_permissions: false
  may_hide_production_critical_issue: false
  manual_intervention_used: false
  hardening_candidate: false

leverage_filter:
  passes_if_any:
    - unlocks_current_milestone
    - expected_reuse_at_least_three_times
    - removes_recurring_human_labor
    - prevents_material_harm
    - required_for_autonomous_operation
  result: <pass reason or bounded workaround plus backlog>

atomicity_freshness_requirements:
  required_sequence:
    - fresh_check
    - preflight
    - approved_real_action
    - immediate_verification
    - redacted_receipt
    - one_closeout
  maximum_snapshot_age: <mission-specific>
  no_handoff_inside_sequence: true

reviewer_plan:
  executor: <Codex worker>
  adversarial_reviewer: <independent Codex worker>
  review_checks:
    - observable_outcome
    - bureaucracy_and_copy_paste_loops
    - scope_and_effect_allowlists
    - privacy_and_identity_boundaries
    - proof_mode_manual_intervention
    - narrow_escalations
    - one_central_integration

escalation_conditions:
  - genuine_business_ambiguity
  - ambiguous_identity
  - uncertain_privacy_or_source_boundary
  - additional_unapproved_real_effect_required
  - possible_duplicate_mutation
  - unknown_post_mutation_state
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - unapproved_irreversible_action
  - required_human_authentication_or_security_confirmation
  - required_UI_control_unavailable

central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_branches: []
  source_commits: []
  exact_changed_file_allowlist: []
  deterministic_checks: []
  central_coordination_files: []
  integration_packet_id: <redacted id>
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
  synchronize_clean_canonical_lanes: true

final_ceo_brief_fields:
  - mission_id
  - business_outcome
  - observable_success_status
  - technical_progress_vs_product_outcome
  - approved_effects_executed
  - source_private_boundary_confirmation
  - repair_and_manual_intervention_metrics
  - exceptions
  - final_central_commit
  - synchronized_lanes
  - remaining_risk_or_blocker
  - next_highest_leverage_decision
  - all_mission_metrics
```

## Approval statement

The approval must identify this contract version, exact outcome, exact real
effects, target/recipient scope, and stop rules. Approval of investigation or
preflight does not imply approval of a later source action, write, send, or
mutation unless the same contract explicitly includes it.

## Mission closeout metrics

```yaml
time_to_verified_outcome: <duration or not_verified>
CEO_touch_count: <integer>
human_copy_paste_handoffs: <integer>
exception_escalation_count: <integer>
repair_cycle_count: <integer>
manual_intervention_count: <integer>
source_action_count: <integer>
real_effect_count: <integer>
central_integration_count: <integer>
leverage_filter_result: <pass reason or no-build decision>
```

Targets: `CEO_touch_count <= 2`, `human_copy_paste_handoffs = 0`,
`exception_escalation_count <= 1`, and `central_integration_count = 1`.
Include every metric above in the final CEO brief, even when its value is zero
or `not_verified`.
