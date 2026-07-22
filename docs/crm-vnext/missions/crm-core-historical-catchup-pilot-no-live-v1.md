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
    stage_2_to_stage_3_handoff: opaque_one_use_same_process_only
    repeated_stage_2_with_pending_handoff: blocked_before_source_and_original_handoff_preserved
    stage_3: conditional_complete_source_to_v4_artifact_to_v3_packet_same_process
    production_packet_binding: environment_owned_required_currently_fail_closed
    synthetic_packet_binding: fixed_module_derived_test_fixture_only
    capability_persistence_or_serialization: forbidden
    final_draft_admission_capability: consumed_and_burned_before_return
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
  - stage_2_to_stage_3_operator_handoff_stays_in_one_process
  - stage_3_handoff_time_is_not_before_issue_and_is_strictly_before_expiry
  - unaccented_spanish_dia_or_dias_labels_are_rejected_by_all_three_layers
  - source_mode_is_bound_to_only_the_blockers_and_phases_that_mode_can_reach
  - zero_send_zero_live_zero_new_browser_runtime_zero_network_mutation_adversarial_test_green
  - source_read_usage_truthful_synthetic_false_production_attested_or_explicit_unknown
  - stage_3_direct_invocation_without_same_process_stage_2_handoff_fails_closed
  - repeated_stage_2_blocks_before_source_without_replacing_or_burning_first_handoff
  - all_downstream_capabilities_consumed_before_aggregate_receipt_return
  - every_blocker_validates_only_its_exact_reachable_capability_registry_matrix
  - reset_failure_receipts_preserve_semantic_artifact_and_packet_progress_already_reached
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

The no-Send operator composes only the existing environment-owned facade and
the historical capability chain. Its Stage 2 command proves qualification and
issues no complete-source capability. Instead, a green Stage 2 creates one
module-private, opaque, expiring, one-use handoff. Stage 3 is not directly
callable: it consumes or terminally burns that handoff before any observation.
It may then prepare one candidate through complete source, owner-only v4
artifact, and inert v3 packet admission during the same process lifetime. The
complete-source, artifact, and final draft-admission capabilities are all
consumed before the aggregate Stage 3 receipt returns. No opaque capability may
be written to disk, serialized, cloned, logged, or accepted back from a caller.

The synthetic proof path uses a fixed packet-request fixture derived inside the
operator. Callers cannot supply commit, authorization, audio binding, policy,
age, relationship, runtime, or browser truth. The production path accepts no
packet request from a caller and remains fail-closed before Stage 3 observation
until an environment-owned packet binding exists.

Only one Stage 2 handoff may be pending. A repeated Stage 2 call is rejected
before any source action and leaves the original handoff intact for its single
Stage 3 presentation. The presentation time must be at or after issuance and
strictly before expiry; a backward or expired clock burns the handoff and fails
closed. If two Stage 2 calls interleave during source qualification, the later
handoff-issue failure reports and preserves the already-live prior handoff;
cleanup burns it if cleanup itself fails. Every blocked receipt is validated
against the exact
capability issue, consume, hold, and registry state reachable at that blocker;
generic or historically plausible counter combinations are not accepted. If
test-runtime cleanup fails, the blocker receipt preserves every green phase
already completed, including packet admission after a fully prepared Stage 3,
while still burning any capability that cannot safely remain live.

Receipts distinguish synthetic proof from the production environment facade.
Synthetic proof truthfully reports no browser or network use. Production
source reads report the attested browser/read-only facts and leave network use
explicitly unknown when the facade does not attest it; they never publish a
guessed `false`. Internal opaque registries and aggregate capability
issue/consume/conditional-hold counts are reported separately from the
unchanged fact that no external operation registry, claim, PRECLAIM, send, or
mutation was written.

This repository mission does not authorize invoking either real stage. It adds
composition and deterministic synthetic proof only. A missing environment
facade or environment-owned packet binding fails closed and does not justify a
new runtime or browser fallback.

## Review and later authority

A green implementation remains isolated. It requires independent adversarial
review and a later formal Chief Architect integration verdict before any
central integration. After integration, the CEO must separately authorize a
real Stage 2 observation. Stage 3 requires a fresh, conditional authorization
after Stage 2; Send remains another separate future boundary.
