# Compact CRM Core Mission Contract

Complete this before execution. Use redacted labels for private values.

```yaml
mission_id: <stable redacted id>
business_outcome: <one outcome>
observable_success:
  - <evidence that a CEO can verify>
mode: proof | hardening
approval_gate:
  contract_version: <version>
  execution_explicitly_approved: false
  approved_targets_and_stop_rules: []
  problem_reality_gate:
    applicability: required | not_applicable
    claimed_blocker: <redacted blocker label or none>
    evidence_level: codex_claimed | repo_verified | reproduced_no_effect | runtime_empirical | product_observed
    canonical_state_verified: false
    expected_behavior: <redacted expected behavior>
    observed_behavior: <redacted observed behavior>
    first_divergence: <first verified divergence or unknown>
    existing_solution_search: <paths and aggregate search state>
    existing_component_loaded_and_invoked: false
    alternative_explanations_tested: []
    minimal_reproduction: <redacted no-effect reproduction or not_run>
    causal_link_to_proposed_fix: <verified link or unproven>
    no_build_option: <tested route and result>
    new_engineering_indispensable: false
    remaining_uncertainty: <redacted uncertainty>
    diagnosis_verdict: verified_problem | existing_solution_or_route | insufficient_evidence
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
forbidden_scope:
  - <explicit exclusions>
source_private_boundaries:
  source_of_truth: <repo branch and commit or approved live source>
  private_inputs: <allowed labels only>
  prohibited_outputs: [secrets, raw identities, private values, raw target URLs]
autonomy_budget:
  max_minutes: 120
  max_repair_cycles: 3
  new_targets_or_effects: 0
self_repair_budget:
  safe_mechanical_repairs: allowed
  scope_broadening: forbidden
manual_intervention_policy:
  allowed_in_proof: true
  max_minutes: 10
  requirements: [reversible_or_low_risk, privacy_safe, no_permission_or_recipient_expansion, does_not_hide_production_critical_issue]
  manual_intervention_used: false
  hardening_candidate: false
leverage_filter:
  passes_if_any: [unlocks_current_milestone, reused_at_least_three_times, removes_recurring_human_labor, prevents_material_harm, required_for_autonomy]
  result: <criterion or bounded workaround plus backlog>
atomicity_freshness_requirements:
  - fresh_check_preflight_action_verify_receipt_closeout
  maximum_snapshot_age: <mission-specific>
reviewer_plan:
  executor: <worker>
  adversarial_reviewer: <independent worker>
  required_checks: [observable_outcome, bureaucracy_and_copy_paste, overbuilding, effect_allowlists, privacy_and_identity, proof_manual_intervention, narrow_escalation, one_integration]
escalation_conditions:
  - business_or_identity_ambiguity
  - privacy_or_source_boundary_uncertainty
  - unapproved_real_effect_required
  - duplicate_mutation_risk_or_unknown_post_mutation_state
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - unapproved_irreversible_action
  - required_human_authentication_or_security_confirmation
  - required_UI_control_unavailable
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_commits: []
  changed_file_allowlist: []
  deterministic_checks: []
  integration_packet_id: <redacted id>
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
