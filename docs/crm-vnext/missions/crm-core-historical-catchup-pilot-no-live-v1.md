# CRM Core Historical Catch-Up Pilot — No-Live Mission v1

Date: 2026-07-22

```yaml
mission_id: crm_core_historical_catchup_pilot_no_live_v1_20260722
contract_version: crm_core_historical_catchup_pilot_no_live_v1
status: approved_for_repo_only_implementation_no_live_effect
central_parent: efddb21ef6c598e1452ea2a9912235dea431e2ef
approved_lane_baseline: 3616461a04324c927d2c3510827ff983a27e759d
source_branch: codex/crm-core-historical-catchup-pilot-v1
chief_architect_provenance: canonical_private_response_validated_owner_only
business_outcome: >-
  Add one bounded historical catch-up policy to the existing semantic follower
  source chain so an older visible follower notification can be prepared for a
  later, separately authorized one-recipient canary without weakening the
  ordinary recent-follower policy or creating another browser/runtime rail.
selection_policies:
  ordinary_recent_v1: unchanged
  historical_catchup_pilot_v1:
    max_candidates: 1
    relationship_gate: current_visible_follows_owner_required
    age_evidence_role: secondary_visible_label_only
    accepted_day_labels:
      integer_min: 8
      integer_max: 30
      units: [d, day, days, dia_accented, dias_accented]
      evidence_kind: displayed_day
    accepted_week_labels:
      integer_min: 1
      integer_max: 4
      units: [w, week, weeks, sem, semana, semanas]
      evidence_kind: coarse_week
    exact_fields_bound_end_to_end:
      - selection_policy
      - age_evidence_raw
      - age_evidence_kind
      - age_bucket
      - actual_elapsed_age_claimed
    actual_elapsed_age_claimed: false
    campaign_membership_claimed: false
    reject:
      - ordinary_recent_3_to_7_day_labels
      - day_31_or_greater
      - week_5_or_greater
      - decimal_approximate_range_inequality_or_mixed_labels
      - unknown_or_ambiguous_labels
      - inferred_follow_timestamp_or_campaign_membership
architecture:
  source_backend: existing_codex_in_app_browser_semantic_read_only_v1
  runtime_facade: existing_environment_owned_same_process_v1
  new_runtime_or_facade: forbidden
  historical_host_policy: separate_versioned_family
  historical_source_artifact: separate_v4_family
  historical_packet: separate_v3_family
  no_send_operator:
    stage_2: qualification_only_zero_complete_source_capabilities
    command_surface: exact_stage_2_only
    real_stage_2_entry: blocked_before_source_until_new_authorized_mission
    stage_2_to_stage_3_handoff: absent
    stage_3_command_or_path: absent
    source_artifact_or_packet_preparation: forbidden
    capability_persistence_or_serialization: forbidden
    capability_or_private_material_return: forbidden
    send_or_live_actuation: forbidden
authority:
  safe_to_implement_repo_only_now: true
  integration_authorized: false
  stage2_authorized: false
  stage3_authorized: false
  live_access_authorized: false
  send_authorized: false
  ceo_decision_needed_for_later_real_stage: true
exact_allowlist:
  - scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.spec.ts
  - scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs
  - __tests__/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.spec.ts
  - docs/crm-vnext/instagram-welcome-audio-iab-semantic-follower-source-host-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-artifact-materializer-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-canary-packet-materializer-v1.md
  - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
  - docs/crm-vnext/missions/crm-core-historical-catchup-pilot-no-live-v1.md
forbidden_scope:
  - legacy_adapter_or_native_binder_changes
  - live_runner_or_safari_host_changes
  - chrome_or_second_browser_backend
  - caller_supplied_identity_age_policy_relationship_runtime_or_browser_truth
  - caller_supplied_commit_authorization_or_audio_binding_truth
  - exact_elapsed_age_or_follow_timestamp_inference
  - campaign_membership_inference
  - PRECLAIM_claim_PENDING_file_chooser_upload_preview_or_Send
  - MailerLite_CRM_campaign_Ads_proxy_or_any_external_mutation
  - central_integration_before_independent_and_formal_review
acceptance:
  - ordinary_recent_v1_regression_green_and_behavior_identical
  - historical_acceptance_boundaries_8d_30d_1w_4w_green
  - historical_rejection_boundaries_7d_31d_5w_and_ambiguous_green
  - current_visible_follows_owner_required
  - policy_age_relation_tampering_fails_closed
  - production_test_and_cross_family_capabilities_are_one_use_and_disjoint
  - operator_exports_exact_stage_2_command_only
  - removed_stage_3_literal_rejected_before_runtime_or_source_use
  - real_stage_2_entry_rejected_before_source_use_even_if_facade_is_available
  - stage_2_success_holds_zero_handoffs_capabilities_or_private_material
  - operator_imports_no_source_artifact_or_packet_materializer
  - unaccented_spanish_dia_or_dias_labels_are_rejected_by_all_three_layers
  - source_mode_is_bound_to_only_the_blockers_and_phases_that_mode_can_reach
  - zero_send_zero_live_zero_new_browser_runtime_zero_network_mutation_adversarial_test_green
  - source_read_usage_truthful_synthetic_false_production_zero_source_attempt_and_progress_with_browser_and_network_explicit_unknown
  - every_operator_receipt_requires_zero_downstream_capability_state
  - reset_failure_receipts_preserve_only_stage_2_source_progress
  - receipts_are_aggregate_redacted_and_contain_no_raw_age_or_private_identity
  - exact_allowlist_and_git_diff_check_green
  - independent_review_has_no_unresolved_P0_P2
  - formal_integration_review_completed_separately
```

## Controlling interpretation

The historical label is evidence about what Instagram visibly displays, not a
clock. The system preserves the exact private label inside the opaque chain but
never turns it into an exact elapsed duration, follow timestamp, campaign
membership claim, or public receipt field. A currently visible
`follows_owner` signal remains mandatory and dominates the secondary age
label.

The ordinary recent policy and all of its v1/v3/v2 contracts remain unchanged.
Historical material is admitted only through the new policy and versioned
historical capability families. Cross-family presentation burns and rejects
the capability; it never upgrades, translates, or retries it.

## Operator boundary

The no-Send operator composes only the existing environment-owned facade with
historical Stage 2 qualification. Its sole command proves two exact
notification-to-profile pairs and issues no complete-source capability,
handoff, artifact capability, packet capability, or private material. Every
green Stage 2 receipt reports zero downstream capabilities and no active opaque
registry. The operator has no Stage 3 command, no Stage 2-to-Stage 3 handoff,
and no source-artifact or packet-materializer import.

The synthetic proof path exercises the Stage-2-only boundary with fixed source
scenarios. Callers cannot supply identity, age, relationship, policy, runtime,
browser, artifact root, packet request, authorization, commit, or audio-binding
truth. The removed Stage 3 command literal and every extra input shape fail
closed before runtime installation or source use. The production entry accepts
only the exact Stage 2 command but always returns the explicit real-Stage-2
authorization blocker before source use, even if an environment-owned facade
is available.

Every blocked receipt is validated against an exact Stage-2-only lifecycle. A
test-runtime cleanup failure may preserve source qualification progress already
observed, but it cannot claim or burn a handoff, artifact, packet, or any other
downstream capability because none exists in this operator.

Receipts distinguish synthetic proof from the blocked production entry.
Synthetic proof truthfully reports no browser or network use. The production
entry reports no source attempt and leaves browser and network use explicitly
unknown; it never publishes a guessed `false`. All downstream capability
counts remain exactly zero, alongside the unchanged fact that no external
operation registry, claim, PRECLAIM, send, or mutation was written.

This repository mission does not authorize invoking real Stage 2. It adds the
Stage-2-only composition and deterministic synthetic proof only. Real Stage 2
requires a new mission that adds and reviews an environment-owned authority
gate; facade availability alone can never authorize a read. No Stage 3
implementation is present in the operator.

## Review and later authority

A green implementation remains isolated. It requires independent adversarial
review and a later formal Chief Architect integration verdict before any
central integration. After integration, real Stage 2 still requires a new
mission, implementation, independent and formal review, and fresh CEO
authorization. Any future Stage 3 requires its own new mission, implementation,
review, and fresh conditional CEO authorization after Stage 2. Send remains
another separate future boundary.

## Combined Repo-Only Integration Closure — 2026-07-22

This controlling closure supersedes the prior Stage-2-and-Stage-3-before-
integration requirement only for this combined repo-only integration. Its
pinned reviewed implementation subrange runs from
`efddb21ef6c598e1452ea2a9912235dea431e2ef` through
`fb2a40497b24938f1a2dcc818b8fedab7d0d82c2`. That pinned subrange is exactly
3 commits across 21 files. All remaining test, independent-review,
formal Chief Architect review, and serialized central-integration gates remain
in force.

The subsequent docs-only closeout commit is not part of that pinned
3-commit/21-file implementation subrange. The fresh integration packet must
count and identify the docs-only commit separately and report the complete
final integration range.

The historical catch-up repo-only implementation is closed as complete and
no-live. Its controlling state is `real_stage_2_executed=false`,
`real_stage_3_executed=false`, `source_actions=0`, `canary_ready=false`,
`production_ready=false`, `send_allowed=false`, and `live_authority=false`.
The semantic bridge is foundation only and is not a canary or production
admission.

The historical v3 draft-admission capability is disjoint from productive live
v2 admission. If it is presented to the live v2 consumer, that capability is
burned and rejected; no historical v3 draft is admitted to the runner or to
the Safari actuation rail.

Real Stage 2 now belongs exclusively to a separate future productive-authority
mission with its own implementation and reviews. Real Stage 3 belongs to a
separate later mission after Stage 2 evidence. The sole next product boundary
is design and review of productive Stage 2 authority, with zero source action
under this mission.
