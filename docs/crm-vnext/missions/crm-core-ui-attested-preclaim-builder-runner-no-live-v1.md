# CRM Core UI-Attested PRECLAIM Builder/Runner No-Live Mission v1

Date: 2026-07-18

```yaml
mission_id: crm_core_welcome_audio_ui_attested_preclaim_builder_runner_no_live_v1_20260718
contract_version: v1_20260718_repo_only_no_live
implementation_status: completed_repo_only_no_live_formal_review_green_centrally_integrated
business_outcome: >-
  Close the missing production composition edge from one private UI-attested
  canary draft to the already integrated fixed publisher, operation context,
  claim, Safari, PENDING, upload, one-Send, and confirmation rail, without
  exercising that rail in this mission.
observable_success:
  - one_fresh_safari_state_read_max=true
  - preclaim_observer_ui_action_count=0
  - one_use_observation_capability=true
  - observation_capability_burns_before_binding_or_freshness_rejection=true
  - exact_authorization_seed_bound_to_draft_recipient_audio_and_context=true
  - authorization_seed_recognized_burned_and_exact_bound_before_source_read=true
  - authorization_seed_admission_capability_consumed_once_by_builder_after_observation=true
  - cross_draft_seed_mismatch_burns_seed=true
  - exact_target_thread_owner_and_audio_path_binding=true
  - approved_audio_bytes_and_digest_revalidated=true
  - fixed_production_start_gates_precede_safari_read=true
  - observer_consumer_returns_only_three_narrow_timestamps=true
  - canonical_operation_digest_cycle_closed=true
  - canonical_operation_digest_copied_to_seven_positions=true
  - operation_guard_exact_preclaim_eligible=true
  - live_runner_public_inputs_equal_private_draft_plus_authorization_seed=true
  - existing_fixed_publisher_open_context_and_composite_reused=true
  - caller_selected_driver_root_store_clock_callback_or_outcome=false
  - alternate_or_second_send_path=false
  - synthetic_injections_test_only=true
  - browser_used=false
  - network_used=false
  - external_effect_invoked=false
mode: proof
approval_gate:
  contract_version: v1_20260718_repo_only_no_live
  execution_explicitly_approved: true
  approved_targets_and_stop_rules:
    - Alejandro authorized one repo-only mission to implement, test, review, and integrate the missing PRECLAIM builder/runner only if every gate is GREEN
    - authoritative baseline is feed2788fa0400b63483dd4b4e851a45f94b7bda
    - stop before real Safari, fixed roots, private artifact use, claim, PENDING, upload, or Send
approved_effects:
  repo_reads:
    - /Users/alejandrogomez/CRM-core at the exact approved baseline
    - /private/tmp/crm-core-preclaim-builder-runner-v1
  live_source_reads: []
  private_artifact_reads: []
  repo_or_source_writes:
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-preclaim-builder.mjs
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.mjs
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-preclaim-builder.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-preclaim-builder-and-live-canary-runner-v1.md
    - docs/crm-vnext/missions/crm-core-ui-attested-preclaim-builder-runner-no-live-v1.md
    - docs/crm-vnext/instagram-welcome-audio-safari-live-host-v1.md
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  sends: []
  mutations:
    - one isolated source commit and push after independent review is green
    - one serialized central integration only after formal Chief Architect green
  permission_changes: []
  irreversible_actions: []
  UI_actions: []
forbidden_scope:
  - real Safari Instagram Computer Use OCR screenshots accessibility reads or navigation
  - real private source artifacts identities profiles threads messages or audio contents
  - fixed live authority root fixed claim store operation registry or permanent claim
  - chooser attachment upload PENDING Send text follow-back resend or ambiguous retry
  - MailerLite CRM campaign Ads API proxy browser network or any external effect
  - caller-controlled live driver root store clock callback outcome verifier or actuation result
  - changing publisher operation-guard preflight claim-issuer or composite semantics
  - package.json or any file outside the exact twelve-file allowlist
source_private_boundaries:
  source_of_truth: >-
    isolated branch codex/crm-core-preclaim-builder-runner-v1-20260718 from
    central baseline feed2788fa0400b63483dd4b4e851a45f94b7bda
  private_inputs: none; synthetic fixtures only
  prohibited_outputs:
    - secrets
    - raw_identities
    - private_values
    - private_artifact_contents
    - source_payloads
    - raw_target_urls
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
  requirements:
    - reversible_or_low_risk
    - privacy_safe
    - no_permission_or_recipient_expansion
    - does_not_hide_production_critical_issue
  manual_intervention_used: false
  hardening_candidate: true
leverage_filter:
  passes_if_any:
    - unlocks_current_milestone
    - removes_recurring_human_labor
    - prevents_material_harm
    - required_for_autonomy
  result: >-
    pass; this is the missing reusable production composition edge that blocked
    the one-recipient canary while preserving the single existing Send rail
atomicity_freshness_requirements:
  - later live runner order is exact seed recognition burn binding and admission-capability issuance then audio validation then fixed production start-gate validation then one-read observation then builder consumption of admission and observation capabilities then fixed publication/open/context/composite
  - exact seed is bound to central HEAD mission next action approval draft projection operation authorization source evidence candidate thread owner dedupe audio and nonce digests
  - recognized seed is atomically burned and exact-bound before source read; cross-draft mismatch burns it and successful binding issues a module-private admission capability consumed once by the builder after observation
  - observation capability is exact-bound fresh and one-use and burns before mismatch or freshness rejection
  - observer consumer exposes only observed_at audio_validated_at and central_context_checked_at
  - canonical digest is computed rebound into seven positions recomputed and guard-validated
  - any attempted authority publication with lost malformed thrown or later blocked zero-effect result is terminal zero-external-effect permanent no-retry
  - no handoff or pause is introduced inside the later effect sequence
  maximum_snapshot_age: strictly under five minutes in the later live run
reviewer_plan:
  executor: CRM Core PRECLAIM builder/runner mission worker
  adversarial_reviewer: independent Codex worker
  required_checks:
    - observable_outcome
    - bureaucracy_and_copy_paste
    - overbuilding
    - exact_twelve_file_allowlist
    - privacy_and_identity
    - zero_action_observer
    - fixed_start_gates_before_source_read
    - exact_seed_binding_and_pre_source_one_use_admission
    - one_use_capability_and_replay
    - publication_attempt_terminal_zero_effect_no_retry
    - digest_cycle_and_exact_guard_preclaim
    - no_caller_controlled_effect_surface
    - no_second_send_path
    - synthetic_only_execution
    - one_central_integration
escalation_conditions:
  - any real or private read write or effect is required
  - any file outside the exact allowlist is required
  - exact UI facts cannot be proven without inference
  - the existing fixed publisher context or composite cannot be reused unchanged
  - duplicate or alternate Send path appears
  - unresolved P0-P2 review finding
  - central drift conflict dirty work or unavailable lock
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_branches:
    - codex/crm-core-preclaim-builder-runner-v1-20260718
  source_commits:
    - a3f4a7f7d4d1991709f9f1d7f510e04f61fa278b
  changed_file_allowlist:
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-preclaim-builder.mjs
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.mjs
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-preclaim-builder.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-live-canary-runner.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-preclaim-builder-and-live-canary-runner-v1.md
    - docs/crm-vnext/missions/crm-core-ui-attested-preclaim-builder-runner-no-live-v1.md
    - docs/crm-vnext/instagram-welcome-audio-safari-live-host-v1.md
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  deterministic_checks:
    - exact twelve-file baseline-to-source and staged allowlists
    - node syntax and git diff check
    - focused builder runner and Safari-host suites
    - exact sixteen-suite welcome-audio compatibility boundary
    - fresh-process import inertness privacy hostile-input replay ambiguity and no-live checks
  integration_packet_id: crm_core_ui_attested_preclaim_builder_runner_integration_v1_20260718
  reviewer_verdict_required: green_to_self_integrate
  safe_to_self_integrate_now_required: true
  ceo_decision_needed_required: false
  one_lock_for_all_sources: true
  integration_count: 1
final_ceo_brief_fields:
  - outcome_and_evidence
  - technical_progress_vs_product_outcome
  - real_effects_executed
  - source_private_boundary_confirmation
  - metrics_and_exceptions
  - final_central_commit
  - remaining_risk
  - next_highest_leverage_decision
  - all_mission_metrics
```

## Approval Meaning

Alejandro's authorization covers this exact repo-only implementation,
synthetic validation, bounded safe repairs, independent adversarial review,
one source commit/push, one formal Chief Architect integration review, and one
serialized central integration only if every gate is green. It grants no real
Safari or private-source access and no fixed-root publication, claim, PENDING,
attachment, upload, Send, MailerLite, CRM, campaign, Ads, proxy, network, or
other external effect.

No additional routine CEO approval is required inside this unchanged mission.
Any scope expansion or later live invocation remains separately gated.

## Current Checkpoint

- `implementation_status`: `completed_repo_only_no_live_formal_review_green_centrally_integrated`
- `validation_status`: `focused_166_of_166_and_exact_sixteen_suite_759_of_759_green`
- `independent_review_status`: `green_no_unresolved_p0_p1_p2_p3`
- `formal_chief_architect_integration_review`: `green_to_self_integrate`; `safe_to_self_integrate_now=true`; `ceo_decision_needed=false`
- `central_integration_status`: `completed_under_central_integration_lock`
- `source_execution`: false
- `canary_ready`: false
- `production_ready`: false
- `execution_approval_published`: false
- `authority_published`: false
- `claim_issued`: false
- `pending_effect_recorded`: false
- `send_allowed`: false
- `browser_used`: false
- `network_used`: false
- `external_effect_invoked`: false

The validation used synthetic fixtures, owner-only temporary roots, a fake
driver, deterministic clocks, and a fresh child process for inert-import
proof. It performed no live/browser/network/private-artifact/fixed-root action
or effect. Exact twelve-file scope, syntax, replay, privacy, hostile-input,
ambiguity, and `git diff --check` gates are green. The formal review, exact
fast-forward integration, and central focused `166/166` plus exact sixteen-suite
`759/759` validation completed green.
