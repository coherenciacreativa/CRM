# CRM Core Limited Operational Pilot Mission Contract 2026-07-13 v1

Date prepared: 2026-07-13
Mission ID: `crm_core_limited_operational_pilot_hardening_v1_2026-07-13`
Mode: `hardening`
Status: `approved_central_integration_and_start_gates_pending_no_campaign_launched`

## Mission Operator Contract Schema

```yaml
mission_id: crm_core_limited_operational_pilot_hardening_v1_2026-07-13
business_outcome: >-
  Remove Alejandro from routine follower-to-onboarding handoffs while proving
  one bounded standing operation from approved Instagram follower observation
  through verified MailerLite onboarding.
observable_success:
  - redacted counts for observations, eligible candidates, sends, replies,
    handoffs, direct upserts, verifications, blocks, and exceptions
  - zero duplicate welcome audio, duplicate upsert, private-data leakage,
    campaign action, CRM write, or Vercel proxy action
  - each MailerLite effect is one guarded direct POST carrying exactly two
    distinct approved private memberships in the same payload
  - explicit final separation of technical progress, product outcome, and
    readiness to graduate
mode: hardening
approval_gate:
  contract_version: 2026-07-13.v1
  execution_explicitly_approved: true
  limits_approval_message: Go
  architecture_correction_approval_message: adelante
  approval_context: >-
    Go approved the bounded v0 limits. After Codex explicitly stated that v0
    had mixed the legacy proxy lane with CRM Core and proposed CRM Core direct
    MailerLite API with exactly two memberships in one upsert while excluding
    further proxy access, Alejandro replied adelante. Before that correction,
    one bounded read-only production-configuration readiness check had inspected
    only the proxy membership count; the proxy was never called, configured,
    deployed, or modified. This approves the exact route correction and v1
    execution; it does not claim Alejandro saw this later written file word for
    word.
  approved_targets_and_stop_rules:
    - approved Instagram new-follower source and bounded relevant DM route
    - eligible candidates discovered during this pilot only, maximum 5
    - approved private audio, history, dedupe, reply, operation, and group-evidence labels
    - maximum 5 exact welcome-audio sends and 5 guarded direct MailerLite upserts
    - exactly two distinct approved private onboarding memberships per upsert
    - all stop rules and forbidden scope in this contract
approved_effects:
  repo_reads:
    - /Users/alejandrogomez/CRM-core at approved branch and freshness checks
  live_source_reads:
    - Safari Instagram notifications and relevant candidate DM threads only
    - packet-specific read-only MailerLite verification through guarded CRM Core code
  private_artifact_reads:
    - approved welcome-audio asset
    - pilot history, dedupe, candidate reply, operation, and approval state
    - fresh dual-group proof evidence used only to bind the two exact references
  repo_or_source_writes:
    - one central code-test-doc integration commit and push before pilot activation
    - owner-only pilot history, locks, packets, results, and redacted receipt artifacts
    - one bounded Codex automation definition update and activation after all gates pass
  sends:
    - at most 5 exact welcome audios, each once, to eligible pilot candidates
  mutations:
    - at most 5 unique guarded direct POST /api/subscribers requests
    - each request contains native top-level email, the approved existing field mapping,
      and groups of length exactly 2 in one atomic payload
  permission_changes: []
  irreversible_actions: []
  UI_actions:
    - bounded Safari notification and relevant DM inspection
    - approved audio upload and send only after fresh identity and dedupe gates
  recipients_or_targets:
    - at most 5 eligible candidates discovered inside the approved source
forbidden_scope:
  - campaign launch, edit, configuration, or advertising action
  - recipient, source, group, automation, account, or permission expansion
  - unrelated Instagram profile, notification, DM, follow, comment, or reaction
  - Gmail, Meta Business Suite, or direct MailerLite UI
  - any further legacy Custom GPT or Vercel proxy read, call, configuration, deploy, or modification
  - any MailerLite endpoint other than one POST /api/subscribers per approved operation
  - delete, resend, retrigger, second upsert, or retry after an attempted or unknown effect
  - CRM cards, Fact Store, ledgers, enrichment, scoring, or CRM writes
  - Launch OS, Mantis general memory, or /Users/alejandrogomez/CRM work
source_private_boundaries:
  authoritative_repo: /Users/alejandrogomez/CRM-core
  target_branch: codex/crm-core-reentry
  expected_base_commit: 78f03813392d2ccda4ba5face0f595291b4101a4
  approved_live_sources:
    - Safari Instagram approved new-follower and relevant DM boundary
    - CRM Core guarded direct MailerLite API route
  approved_private_input_labels:
    - saludo_welcome_audio_v1
    - pilot_candidate_history
    - pilot_dedupe_state
    - pilot_reply_state
    - pilot_operation_registry
    - pilot_exact_email_identity_anchor
    - pilot_contextual_approval_receipt
    - fresh_dual_group_proof_evidence
  prohibited_output_classes:
    - secrets
    - raw_identities
    - private_values
    - source_payloads
    - group_references
    - private_digests
    - raw_target_urls
autonomy_budget:
  max_elapsed_minutes: 1440
  max_observed_followers: 10
  max_candidates: 5
  max_welcome_audio_sends: 5
  max_mailerlite_upserts: 5
  max_repair_cycles: 3
  routine_CEO_interruptions: 0
  platform_mandated_action_time_confirmations: only_at_actual_representational_send_if_required
self_repair_budget:
  allowed:
    - mechanical_schema_repair
    - safe_test_repair
    - pre_effect_route_repair
    - receipt_format_repair
    - atomic_snapshot_refresh
    - one_local_retry_per_recoverable_UI_step_before_effect
  forbidden:
    - scope_broadening
    - new_unlisted_real_effect
    - privacy_boundary_change
    - retry_after_mutation_attempt_or_possible_mutation
    - resend_or_retrigger_to_test
manual_intervention_policy:
  allowed_in_proof_mode: false
  hardening_mode_requires_stop_rules: true
  manual_intervention_used: false
  hardening_candidate: true
leverage_filter:
  passes_if_any:
    - expected_reuse_at_least_three_times
    - removes_recurring_human_labor
    - prevents_material_harm
    - required_for_autonomous_operation
  result: removes_recurring_human_labor_and_is_required_for_autonomy
atomicity_freshness_requirements:
  required_sequence:
    - fresh_check
    - packet_digest_registered_pre_final_check
    - preflight
    - one_approved_real_action
    - immediate_private_verification
    - redacted_receipt
    - one_closeout
  maximum_packet_registry_and_final_check_age: 5_minutes_before_mutation
  immediate_pre_effect_revalidation: required_after_credential_resolution_before_effect_claim_and_after_claim_before_request
  stable_identity_rule: exact_email_anchor_preserves_full_local_part_plus_tag_and_domain
  mission_upsert_cap_claim: atomic_and_global_maximum_5
  effect_claim_mutex: atomic_directory_generation_marker_dead_process_recoverable_live_expired_owner_fail_closed
  effect_lock_writes: atomic_complete_file_only_partial_pending_files_never_count
  pre_effect_claim_rule: leased_retryable_and_excluded_from_cap_only_if_explicitly_cancelled_or_owner_process_dead_before_network
  no_retry_boundary: atomic_promotion_immediately_before_network_attempt
  public_receipt_privacy: opaque_packet_status_and_generic_private_artifact_labels_only
  mailerlite_first_verification_wait: at_least_120_seconds
  mailerlite_additional_verification_cap: 1
  no_handoff_inside_sequence: true
reviewer_plan:
  executor: primary Codex mission operator
  adversarial_reviewer: independent Codex worker
  review_checks:
    - observable_outcome
    - bureaucracy_and_copy_paste_loops
    - scope_and_effect_allowlists
    - privacy_identity_and_digest_bindings
    - stable_exact_email_identity_dedupe
    - atomic_mission_upsert_cap
    - immediate_pre_effect_freshness_revalidation
    - legacy_proxy_exclusion
    - hardening_stop_rules
    - narrow_escalations
    - one_central_integration
escalation_conditions:
  - genuine_business_or_identity_ambiguity
  - uncertain_privacy_or_source_boundary
  - additional_unapproved_real_effect_required
  - possible_duplicate_mutation_or_unknown_post_mutation_state
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - unapproved_irreversible_action
  - required_human_authentication_or_security_confirmation
  - required_UI_control_unavailable
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_branches:
    - codex/crm-core-reentry
  expected_base_commit: 78f03813392d2ccda4ba5face0f595291b4101a4
  exact_changed_file_allowlist:
    - scripts/crm-vnext-mailerlite-exact-onboarding-mutation.mjs
    - scripts/crm-vnext-mailerlite-final-idempotency-suppression-check.mjs
    - scripts/crm-vnext-mailerlite-limited-pilot-dual-group-approval-contract.mjs
    - __tests__/crm-vnext-mailerlite-exact-onboarding-mutation.spec.ts
    - docs/crm-vnext/crm-core-controlled-welcome-flow-fresh-dual-group-proof-closeout-v0.md
    - docs/crm-vnext/crm-core-limited-operational-pilot-mission-contract-2026-07-13-v0.md
    - docs/crm-vnext/crm-core-limited-operational-pilot-mission-contract-2026-07-13-v1.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/workstreams/integration.md
  deterministic_checks:
    - exact targeted guard tests
    - dual-group synthetic preflight with zero credential network or effect action
    - complete tracked and untracked whitespace check
    - exactly one Active Next Action
    - exact eleven-file allowlist match
    - private-value and secret-pattern redaction scan
    - upstream freshness and zero divergence
  integration_packet_id: crm_core_limited_operational_pilot_direct_api_integration_2026_07_13_v1
  reviewer_verdict_required: green_to_self_integrate
  reviewer_verdict_received: green_to_self_integrate_from_atomicity_and_adversarial_reviews
  targeted_verification: mutation_guard_101_of_101_combined_guard_and_final_check_122_of_122
  one_lock_for_all_sources: true
  integration_count: 1
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
  - remaining_risk_or_blocker
  - next_highest_leverage_decision
  - all_mission_metrics
initial_mission_metrics:
  time_to_verified_outcome: not_verified
  CEO_touch_count: 2
  human_copy_paste_handoffs: 0
  exception_escalation_count: 0
  repair_cycle_count: 1
  manual_intervention_count: 0
  source_action_count: 0
  real_effect_count: 0
  central_integration_count: 0
  leverage_filter_result: removes_recurring_human_labor_and_required_for_autonomy
```

## Architecture Decision

The two lanes are deliberately separate:

- Legacy manual lane: Alejandro's Custom GPT may use its own Vercel proxy. This
  mission permits no further inspection, call, configuration, deployment, or
  modification of it. Before the architecture correction, one bounded read-only
  production-configuration readiness check inspected only its membership count;
  it was never called, configured, deployed, or modified.
- CRM Core machine lane: the bounded operator uses the CRM Core guard and the
  MailerLite API directly. Each approved candidate can cause exactly one
  `POST /api/subscribers` with the two required private memberships together.

No second group-assignment endpoint is allowed. The historical one-group guard
contract remains compatible and unchanged; v1 adds a separate operation class
and contextual approval receipt for this dual-group pilot.

## Pilot Boundary

- Duration: 24 hours from actual approved start or 10 new followers observed,
  whichever occurs first.
- Capacity: at most 5 candidates processed end-to-end.
- Effect caps: at most 5 welcome audios and 5 MailerLite upserts.
- Cadence: every 20 minutes between 08:00 and 22:00 `America/Bogota`.
- Quiet hours: 22:00 to 08:00. No source read, send, reply check, or mutation.
- Campaign: remains off and is not authorized by this contract.
- Review model: one mission approval and one redacted final brief. The only
  intermediate confirmation is the platform-mandated action-time confirmation
  immediately before an actual representational audio send, if required.

## Approved Operating Path

1. Complete one central code-test-doc integration before activating the pilot.
2. Confirm synthetic dual-group guard tests, private state, exact audio, Safari
   source health, contextual approval receipt, operation registry, and approved
   dual-group evidence are green.
3. Observe only the approved Instagram new-follower source and relevant DM
   boundary in Safari.
4. Check private history and dedupe state within five minutes before a send.
5. Send the exact approved welcome audio once to an eligible candidate, using
   action-time confirmation only when the platform requires it.
6. Recheck replies at the bounded cadence. A voluntarily supplied valid email
   is sufficient; name, country, city, and phone remain optional.
7. Prepare one private candidate packet with a unique operation ID and the two
   exact proven private group references by role. Anchor the packet's exact-byte
   digest in the owner-only operation registry before the final check. Bind a
   stable private identity digest to the exact supplied email after trim and
   lowercase only, preserving the complete local part, `+tag`, and domain; do
   not perform Gmail alias or dot normalization.
8. Run the packet-specific final idempotency and suppression check. The final
   private result must bind the same packet ID, the exact packet-byte digest,
   operation ID, and operation class. The packet, registry record, and final
   check must each be at most five minutes old.
9. Run no-effect preflight. After credential resolution and immediately before
   any effect claim, re-read and revalidate the packet, registry, private
   final-check binding, contextual approval, repository context, and all
   five-minute freshness gates.
10. Under one mission-wide atomic claim, reject any prior operation for the same
    stable exact-email identity and reject any claim above the mission-wide cap
    of 5 MailerLite upserts. The owner-bound leased mutex uses an atomic
    directory plus one generation-specific owner marker and may recover
    automatically only when its recorded process is dead. An expired owner that
    remains alive must stay fail-closed until it resumes and cancels or exits.
    Effect-lock creation/update must be
    atomic so a crash can leave only an ignored pending file, never a partial
    counted lock. Create only a leased retryable pre-effect reservation here.
11. The effect lock permanently forbids retry after any attempted or unknown
    effect. Revalidate the five-minute binding once more after the reservation;
    cancel it without consuming the cap if that gate fails before network. A
    merely expired reservation with a still-live owner must not be reaped by a
    competing run. Only
    at the immediate network boundary atomically promote the reservation to the
    permanent no-retry effect lock and use the guarded canonical route for one
    `POST /api/subscribers`. Wait at least 120 seconds before the first
    MailerLite verification and permit at most one additional read-only
    verification.
12. Keep raw results private. Public receipts must expose neither packet IDs nor
    private artifact paths; use only opaque binding state, generic private
    artifact labels, and redacted aggregates.

## Terminal States And Stop Rules

- `already_welcomed`
- `blocked_duplicate`
- `blocked_ambiguous`
- `welcome_sent`
- `reply_seen`
- `email_handoff_ready`
- `mailerlite_onboarded_verified`
- `unknown_blocked_no_retry`
- `manual_review_required`

If identity, history, exact-email dedupe, packet digest, operation binding,
group evidence, five-minute packet/registry/final-check freshness, source health,
or idempotency is unknown, no effect occurs. If the atomic mission-wide cap
cannot be proven below 5, no effect occurs. If a mutation request is attempted
and its outcome is unknown or verification fails, the operation ends terminally
with no retry, resend, or retrigger. Quiet hours and capacity limits pause or end
recurrence automatically.

## Pilot Start Gate

The pilot remains paused until all are green:

- central v1 integration committed and pushed from a clean current branch;
- targeted legacy and dual-group tests pass;
- synthetic dual-group preflight performs no credential, network, or effect action;
- contextual private approval receipt is bound to this contract and the proven
  private dual-group evidence;
- owner-only operation registry and no-retry effect lock route are ready;
- private final-check output binds exact packet bytes plus operation ID and class;
- stable exact-email identity dedupe and the atomically enforced 5-upsert
  mission-wide cap are ready;
- packet, registry, and final-check freshness are revalidated within five
  minutes immediately pre-effect;
- exact approved welcome audio and private dedupe stores are ready;
- Safari source health is green;
- the bounded automation references v1 and the direct CRM Core guard;
- caps, cadence, quiet hours, pause behavior, and stop rules are active.

Codex does not launch, edit, or configure a campaign under this contract.

## Approval Receipt

- `v0_limits_received`: `Go` on `2026-07-13`, by direct reference to the
  immediately preceding v0 contract.
- `architecture_correction_received`: `adelante` on `2026-07-13`, immediately
  after Codex stated that it would replace the proxy route with CRM Core direct
  MailerLite API, use exactly two memberships in one upsert, and leave the
  Vercel proxy out of scope with no further access.
- `historical_proxy_read`: one bounded read-only production-configuration
  membership-count inspection occurred before the correction; there was no
  proxy call, configuration, deployment, or modification.
- `v0_effects_before_supersession`: zero pilot source reads, sends, or mutations.
- `execution_explicitly_approved`: true.
- `campaign_authorized`: false.
- `proxy_authorized`: false.
