# CRM Core UI-Attested Claim/Host Completion No-Live Mission v1

Date: 2026-07-16

```yaml
mission_id: crm_core_welcome_audio_ui_attested_claim_host_completion_no_live_v1_20260716
contract_version: v1_20260716_repo_only_no_live_max_150m
implementation_status: completed_green_reviewed_awaiting_central_integration
business_outcome: >-
  Complete the smallest honest one-recipient UI-attested claim, PENDING,
  terminal, and Safari-composite rail so that the already-green publisher and
  PRECLAIM checkpoint can reach a confirmed synthetic audio send without
  weakening or disabling the existing sealed-manifest route.
observable_success:
  - one exact UI-attested claim family is separately versioned
  - one valid synthetic admission reaches one durable claim then one PENDING
  - one fake Safari composite performs exactly one upload and one Send
  - confirmation requires same-attempt same-thread plus-one outgoing audio strictly before five minutes
  - ambiguity and replay remain permanently no-retry
  - existing sealed-manifest claim and Safari routes remain available and regression-green
  - candidate_claim_pending_upload_and_send_caps_equal_1
  - exact_follow_timestamp_claimed=false
  - provider_event_id_claimed=false
  - campaign_membership_claimed=false
  - browser_used=false
  - network_used=false
  - external_effect_invoked=false
mode: proof
approval_gate:
  execution_explicitly_approved: true
  contract_version: v1_20260716_repo_only_no_live_max_150m
  approved_targets_and_stop_rules:
    - Alejandro approved saving the isolated checkpoint and this repo-only claim/host mission
    - maximum elapsed mission budget is 150 minutes
    - integration is allowed only if the complete bridge is independently GREEN
    - no private or live execution approval is created by this contract
approved_effects:
  repo_reads:
    - checkpoint commit 996ea7b in the isolated CRM Core worktree
    - exact runtime and tests needed for the four implementation paths
  live_source_reads: []
  private_artifact_reads: []
  repo_or_source_writes:
    - only the exact nine mission paths listed below
    - synthetic owner-only temporary test roots
  sends: []
  mutations:
    - one local completion commit
    - one source-branch push and one serialized central integration only after full GREEN
  permission_changes: []
  irreversible_actions: []
  UI_actions: []
forbidden_scope:
  - Safari Chrome in-app browser Instagram Computer Use OCR screenshots or accessibility reads
  - real followers identities profiles threads messages or private artifacts
  - fixed live authority roots fixed live claim stores or real operation registries
  - real claim PENDING upload attachment Send or retry
  - text follow-back reaction comment MailerLite CRM campaign Ads proxy or network
  - exact follow-time provider-event or campaign-membership inference
  - weakening renaming or fabricating the existing sealed-manifest authority family
  - an implementation that makes the existing sealed route unavailable after a UI claim
  - any file outside the exact mission allowlist
source_private_boundaries:
  source_of_truth: >-
    isolated branch codex/crm-core-ui-attested-live-admission-bridge-v1-20260716
    at checkpoint commit 996ea7b, with central baseline 725afd3d47147aa63c37f604d39e29ead9d51171
  private_inputs: none; synthetic fixtures only
  prohibited_outputs:
    - secrets
    - raw identities
    - private values
    - raw target URLs
    - private artifact contents
autonomy_budget:
  max_minutes: 150
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
  hardening_candidate: false
leverage_filter:
  passes_if_any:
    - unlocks_current_milestone
    - reused_at_least_three_times
    - removes_recurring_human_labor
    - prevents_material_harm
    - required_for_autonomy
  result: >-
    required for the current real-canary milestone and prevents duplicate or
    ambiguous sends while preserving the existing route.
atomicity_freshness_requirements:
  - consume the UI authority source and operation-context capabilities atomically
  - publish one permanent no-retry claim before every possible effect boundary
  - publish and stably reread PENDING before file selection or upload
  - mark one Send actuation before the one fake-driver click
  - confirm only same-attempt same-thread plus-one outgoing audio strictly before five minutes
  - leave durable PENDING or terminal UNKNOWN on ambiguity with no replay action
  maximum_snapshot_age: deterministic clocks only; no live snapshot is created
reviewer_plan:
  executor: two isolated Codex workers with disjoint claim and Safari-host ownership
  adversarial_reviewer: independent Codex worker after implementation
  required_checks:
    - observable_outcome
    - bureaucracy_and_copy_paste
    - overbuilding
    - effect_allowlists
    - privacy_and_identity
    - proof_manual_intervention
    - narrow_escalation
    - old_route_regression_and_availability
    - cross_family_identity_dedupe
    - crash_replay_and_ambiguity
    - one_integration
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
  - any_file_outside_exact_allowlist_required
  - old_sealed_route_cannot_remain_available_without_scope_expansion
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_commits:
    - 996ea7b
    - completion_source_tip_derived_from_git_at_integration
  changed_file_allowlist:
    - scripts/crm-vnext-instagram-welcome-audio-live-preflight.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-live-preflight.spec.ts
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.spec.ts
    - scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-live-claim-issuer.spec.ts
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
    - docs/crm-vnext/crm-core-welcome-audio-ui-attested-canary-packet-materialization-no-live-mission-v1.md
    - docs/crm-vnext/crm-core-welcome-audio-ui-attested-single-recipient-live-admission-bridge-no-live-mission-v1.md
    - docs/crm-vnext/crm-core-welcome-audio-ui-attested-claim-host-completion-no-live-mission-v1.md
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  current_mission_write_allowlist:
    - scripts/crm-vnext-instagram-welcome-audio-live-claim-issuer.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-live-claim-issuer.spec.ts
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
    - docs/crm-vnext/crm-core-welcome-audio-ui-attested-claim-host-completion-no-live-mission-v1.md
    - docs/crm-vnext/crm-core-welcome-audio-ui-attested-single-recipient-live-admission-bridge-no-live-mission-v1.md
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  deterministic_checks:
    - exact current nine-file write allowlist and exact fourteen-file integration union
    - node syntax and git diff check
    - focused claim issuer and Safari host suites
    - complete publisher preflight materializer and source-adapter compatibility
    - existing sealed-manifest claim and Safari regressions
    - cross-family identity dedupe and continued old-route availability
    - import inertness privacy no-live and hostile-input checks
  integration_packet_id: crm_core_ui_attested_claim_host_completion_integration_v1_20260716
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

## Exact Completion Design

The UI-attested family is a sibling record family with exact claim, PENDING,
and terminal schemas. It has no cancellation, reservation reuse, reclaim, or
retry path. A claim is permanent and no-retry from publication. A preparation
failure after claim therefore consumes the one candidate without creating an
effect; this is an intentional safety tradeoff for the one-recipient canary.

Shared claim-store scanning must recognize both exact families, preserve
cross-family identity dedupe, apply each family's own mission cap, and reject
unknown or mixed-invalid evidence. Existing sealed records and validators stay
exact. A valid UI record must not make the sealed route unavailable for a
different eligible identity.

The Safari host may reuse the post-PENDING UI state and confirmation rail, but
the family dispatch, PENDING validator, and one-use host capability must remain
exact. Compose reset, Sent/Seen alone, no-error-only evidence, timeout, wrong
thread, cross-attempt evidence, replay, and evidence at exactly five minutes
never confirm.

## Approval Meaning

Alejandro's exact authorization permits this bounded synthetic implementation,
safe repairs, independent review, one local completion commit, and one source
push plus serialized central integration only if the complete bridge is GREEN.
It permits no source read, private-artifact read, fixed-root access, real claim,
browser action, upload, Send, MailerLite, CRM, campaign, proxy, network, or
other external effect.

## Repo-Only Completion Receipt

- `implementation_result`: `complete_repo_only_synthetic_green`
- `focused_and_compatibility_tests`: `242/242`
- `claim_suite`: `60/60`
- `safari_host_suite`: `111/111`
- `source_materializer_publisher_preflight_compatibility`: `71/71`
- `node_syntax`: `green`
- `git_diff_check`: `green`
- `exact_current_write_allowlist`: `9/9`
- `exact_integration_union`: `14/14`
- `independent_code_security_review`: `green`
- `final_docs_rereview`: `green`
- `reviewer_verdict`: `green_to_self_integrate`
- `central_integration`: `not_started`
- `canary_ready`: false
- `production_ready`: false
- `fixed_authority_publication_enabled`: false
- `real_claim_issued`: false
- `browser_used`: false
- `network_used`: false
- `external_effect_invoked`: false

The complete synthetic chain now reaches one permanent UI claim, one durable
PENDING boundary, one fake-driver upload, one fake-driver Send, and one strong
same-thread confirmed terminal. Cross-family identity dedupe and continued
sealed-route availability are covered. No real authority, claim, browser, or
send capability was exercised.
