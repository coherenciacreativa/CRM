# CRM Core Problem Reality Gate Repo-Only Mission v1

Date: 2026-07-25

```yaml
mission_id: crm_core_problem_reality_gate_repo_only_v1_20260725
business_outcome: >-
  Make proof of blocker reality, causality, and engineering indispensability a
  mandatory, testable prerequisite for new CRM Core engineering.
observable_success:
  - the nine-path allowlist contains one canonical gate, two nested template blocks, entrypoint hydration, relay enforcement, and deterministic tests
  - Mission Contract root fields and order remain unchanged
  - three synthetic acceptance cases return the required fail-closed outcomes
  - independent diagnosis review precedes artifact review
  - no source action, private read, browser action, model-routing change, or live effect occurs
mode: hardening
approval_gate:
  contract_version: crm_core_problem_reality_gate_repo_only_v1_20260725
  execution_explicitly_approved: true
  exact_targets_sources_private_reads_effects_and_stop_rules:
    - exact baseline 71501f1b699950319ee9829e6ccc530c3331f94f
    - exact nine-path allowlist
    - one implementation pass and one mechanical repair pass
    - commit, push, formal Chief Architect review, and one locked central integration only if every review is GREEN
  problem_reality_gate:
    applicability: required
    claimed_blocker: blocker-driven engineering lacks one mandatory evidence and diagnosis gate across canonical entrypoints
    evidence_level: repo_verified
    canonical_state_verified: true
    expected_behavior: canonical entrypoints require evidence thresholds and diagnosis review before blocker-driven engineering
    observed_behavior: canonical entrypoints contain leverage and review guidance but omit the complete shared gate
    first_divergence: the current templates and hydration entrypoints have no problem_reality_gate block
    existing_solution_search: exact baseline search found no gate field, closed evidence levels, or closed diagnosis verdicts
    existing_component_loaded_and_invoked: false
    alternative_explanations_tested:
      - existing leverage_filter was inspected and does not establish blocker reality or reviewer order
      - existing artifact review was inspected and does not independently verify diagnosis first
    minimal_reproduction: zero-effect repo search returned no canonical problem_reality_gate occurrence
    causal_link_to_proposed_fix: adding one shared docs-and-tests contract to existing entrypoints directly closes the verified omission
    no_build_option: relying on leverage_filter alone was rejected because it cannot produce the required evidence block or fail-closed verdict
    new_engineering_indispensable: true
    remaining_uncertainty: none at the repo-contract level
    diagnosis_verdict: verified_problem
approved_effects:
  repo_reads:
    - exact approved CRM Core baseline and allowlisted contracts
  live_source_reads: []
  private_artifact_reads: []
  repo_or_source_writes:
    - AGENTS.md
    - .agents/skills/crm-core-mission-operator/SKILL.md
    - .agents/skills/crm-core-mission-operator/references/mission-contract-template.md
    - docs/crm-vnext/crm-core-mission-contract-template-v1.md
    - docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md
    - docs/crm-vnext/crm-core-codex-profile.md
    - docs/crm-vnext/crm-core-problem-reality-gate-v1.md
    - docs/crm-vnext/missions/crm-core-problem-reality-gate-repo-only-v1.md
    - __tests__/crm-vnext-crm-core-problem-reality-gate.spec.ts
  sends: []
  mutations:
    - one isolated commit and push only after independent review is GREEN
    - one central integration under lock only after formal green_to_self_integrate
  permission_changes: []
  irreversible_actions: []
  UI_actions: []
  recipients_or_targets: []
forbidden_scope:
  - crm-core-next-action or Welcome Audio implementation and contracts
  - central coordination files, package files, .codex configuration, or model routing
  - source reads, private artifacts, browser, Send, MailerLite, CRM, campaigns, Ads, proxy, or live effects
  - new backend, runtime, emitter, bridge, source family, capability family, or authority
source_private_boundaries:
  authoritative_repo: CRM Core isolated lane
  target_branch: codex/crm-core-reentry
  expected_base_commit: 71501f1b699950319ee9829e6ccc530c3331f94f
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
  max_repair_cycles: 1
  max_new_targets_people_sources_or_effects: 0
  routine_CEO_interruptions: 0
self_repair_budget:
  allowed:
    - one mechanical docs, test, fence, or formatting repair
  forbidden:
    - scope broadening
    - new architecture
    - new real effect
    - privacy boundary change
manual_intervention_policy:
  allowed_in_proof_mode: false
  max_minutes: 0
  must_be_reversible_or_low_risk: true
  must_be_privacy_safe: true
  may_expand_recipients_or_permissions: false
  may_hide_production_critical_issue: false
  manual_intervention_used: false
  hardening_candidate: false
leverage_filter:
  passes_if_any:
    - removes recurring human diagnosis and CEO interruption
    - prevents material waste from redundant engineering
    - required for autonomous operation
  result: pass; one shared policy and test surface governs existing entrypoints without a new runtime
atomicity_freshness_requirements:
  required_sequence:
    - fresh exact Git check
    - repo-verified diagnosis
    - bounded implementation
    - deterministic validation
    - independent diagnosis review
    - artifact review only if diagnosis is verified
    - commit and push only if GREEN
    - formal Chief Architect integration review
    - one locked integration only if green_to_self_integrate
  maximum_snapshot_age: one mission pass
  no_handoff_inside_sequence: true
reviewer_plan:
  executor: CRM Core mission worker
  adversarial_reviewer: independent Codex worker
  review_checks:
    - diagnosis evidence and first divergence before artifact quality
    - exact nine-path allowlist
    - Mission Contract root-order preservation
    - shared evidence levels and diagnosis verdicts
    - three synthetic outcomes
    - privacy and no-giant-log boundary
    - zero source, live, and model-routing authority
    - no unresolved P0-P2
escalation_conditions:
  - a tenth file is required
  - a runtime or source claim is needed
  - a private read or live effect is required
  - Mission Contract root fields or order must change
  - independent review leaves any P0-P2 unresolved
  - central drift, lock failure, or dirty integration context
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_branches:
    - codex/crm-core-problem-reality-gate-repo-only-v1-20260725
  source_commits: []
  exact_changed_file_allowlist:
    - AGENTS.md
    - .agents/skills/crm-core-mission-operator/SKILL.md
    - .agents/skills/crm-core-mission-operator/references/mission-contract-template.md
    - docs/crm-vnext/crm-core-mission-contract-template-v1.md
    - docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md
    - docs/crm-vnext/crm-core-codex-profile.md
    - docs/crm-vnext/crm-core-problem-reality-gate-v1.md
    - docs/crm-vnext/missions/crm-core-problem-reality-gate-repo-only-v1.md
    - __tests__/crm-vnext-crm-core-problem-reality-gate.spec.ts
  deterministic_checks:
    - exact nine-path diff
    - focused Problem Reality Gate suite
    - Markdown and YAML fence hygiene
    - Mission Contract root-order preservation
    - three synthetic acceptance outcomes
    - git diff --check
    - redaction and no-positive-authority scan
  central_coordination_files: []
  integration_packet_id: crm_core_problem_reality_gate_integration_review_20260725
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
  synchronize_clean_canonical_lanes: true
final_ceo_brief_fields:
  - policy files changed
  - root-order preservation
  - three synthetic gate outcomes
  - diagnosis-review result
  - artifact-review result
  - final central SHA
  - source_actions
  - real_effects
  - product outcome unchanged
  - next product boundary preserved
```

## Outcome Boundary

This mission changes governance contracts and tests only. It does not claim
`bootstrap_ready`, `source_qualified`, `candidate_handoff_ready`, `send_ready`,
`canary_confirmed`, or `production_ready`. It grants no authority beyond the
repo-only mission explicitly approved above.
