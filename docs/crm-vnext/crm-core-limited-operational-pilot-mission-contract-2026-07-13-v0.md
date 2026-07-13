# CRM Core Limited Operational Pilot Mission Contract 2026-07-13 v0

Date prepared: 2026-07-12
Mission ID: `crm_core_limited_operational_pilot_hardening_v0_2026-07-13`
Mode: `hardening`
Status: `approved_central_integration_pending_no_campaign_launched`

## Mission Operator Contract Schema

```yaml
mission_id: crm_core_limited_operational_pilot_hardening_v0_2026-07-13
business_outcome: >-
  Remove Alejandro from routine follower-to-onboarding handoffs while proving
  one bounded standing operation from approved Instagram follower observation
  through verified MailerLite onboarding.
observable_success:
  - redacted counts for observations, eligible candidates, sends, replies,
    handoffs, upserts, verifications, blocks, and exceptions
  - zero duplicate welcome audio, duplicate upsert, private-data leakage,
    campaign action, or CRM write
  - explicit final separation of technical progress, product outcome, and
    readiness to graduate
mode: hardening
approval_gate:
  contract_version: 2026-07-13.v0
  execution_explicitly_approved: true
  approval_received_at: 2026-07-13 America/Bogota
  approval_message: Go
  approval_context: >-
    Direct user-authored reply to the immediately preceding exact contract and
    approval phrase; no scope change was introduced.
  exact_targets_sources_private_reads_effects_and_stop_rules:
    - approved Instagram new-follower source and bounded DM route
    - eligible candidates discovered during this pilot only, maximum 5
    - approved private audio, history, dedupe, reply, and operation-state labels
    - maximum 5 exact welcome-audio sends and 5 Vercel-proxy upserts
    - exact two onboarding memberships
    - all stop rules and forbidden scope in this contract
approved_effects:
  repo_reads:
    - /Users/alejandrogomez/CRM-core at approved branch and freshness checks
  live_source_reads:
    - Safari Instagram notifications and relevant candidate DM threads only
    - bounded read-only MailerLite verification through the approved route
  private_artifact_reads:
    - approved welcome-audio asset
    - pilot history, dedupe, candidate reply, and operation-state artifacts
    - approved proxy readiness labels without secret output
  repo_or_source_writes:
    - one central docs-only commit and push before pilot activation
    - owner-only pilot history, lock, operation, and redacted receipt artifacts
    - one bounded Codex automation definition
  sends:
    - at most 5 exact welcome audios, each once, to eligible pilot candidates
  mutations:
    - at most 5 unique Vercel-proxy subscriber upserts with two memberships
  permission_changes: []
  irreversible_actions: []
  UI_actions:
    - bounded Safari notification and relevant DM inspection
    - approved audio upload and send only after fresh dedupe and identity gates
  recipients_or_targets:
    - at most 5 eligible candidates discovered inside the approved source
forbidden_scope:
  - campaign launch, edit, configuration, or advertising action
  - recipient, source, group, automation, account, or permission expansion
  - unrelated Instagram profile, notification, DM, follow, comment, or reaction
  - Gmail, Meta Business Suite, direct MailerLite UI, or direct MailerLite API
  - delete, resend, retrigger, second upsert, or retry after unknown effect
  - CRM cards, Fact Store, ledgers, enrichment, scoring, or CRM writes
  - Launch OS, Mantis general memory, or /Users/alejandrogomez/CRM work
source_private_boundaries:
  authoritative_repo: /Users/alejandrogomez/CRM-core
  target_branch: codex/crm-core-reentry
  expected_base_commit: 1bf0b77d41a9db175c6e9a461f3490c81c913203
  approved_live_sources:
    - Safari Instagram approved new-follower and relevant DM boundary
    - existing approved Vercel proxy and bounded verification route
  approved_private_input_labels:
    - saludo_welcome_audio_v1
    - pilot_candidate_history
    - pilot_dedupe_state
    - pilot_reply_state
    - pilot_operation_state
  prohibited_output_classes:
    - secrets
    - raw_identities
    - private_values
    - source_payloads
    - raw_target_urls
autonomy_budget:
  max_elapsed_minutes: 1440
  max_repair_cycles: 3
  max_candidates: 5
  max_welcome_audio_sends: 5
  max_mailerlite_upserts: 5
  routine_CEO_interruptions: 0
  platform_mandated_action_time_confirmations: only_if_required_by_UI_policy
self_repair_budget:
  allowed:
    - mechanical_schema_repair
    - safe_test_repair
    - pre_mutation_route_repair
    - receipt_format_repair
    - atomic_snapshot_refresh
    - one_local_retry_per_recoverable_UI_step
  forbidden:
    - scope_broadening
    - new_unlisted_real_effect
    - privacy_boundary_change
    - retry_after_possible_mutation_without_known_state
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
    - preflight
    - approved_real_action
    - immediate_verification
    - redacted_receipt
    - one_closeout
  maximum_snapshot_age: 5_minutes_before_send_or_mutation
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
    - privacy_and_identity_boundaries
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
  source_commits:
    - 1bf0b77d41a9db175c6e9a461f3490c81c913203
  exact_changed_file_allowlist:
    - docs/crm-vnext/crm-core-controlled-welcome-flow-fresh-dual-group-proof-closeout-v0.md
    - docs/crm-vnext/crm-core-limited-operational-pilot-mission-contract-2026-07-13-v0.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/workstreams/integration.md
  deterministic_checks:
    - complete tracked and untracked whitespace check
    - exactly one Active Next Action
    - six-file allowlist match
    - private-value and secret-pattern redaction scan
    - upstream freshness and zero divergence
  central_coordination_files:
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/workstreams/integration.md
  integration_packet_id: crm_core_limited_operational_pilot_docs_integration_2026_07_13_v0
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
  synchronize_clean_canonical_lanes: false
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
initial_mission_metrics:
  time_to_verified_outcome: not_verified
  CEO_touch_count: 1
  human_copy_paste_handoffs: 0
  exception_escalation_count: 0
  repair_cycle_count: 0
  manual_intervention_count: 0
  source_action_count: 0
  real_effect_count: 0
  central_integration_count: 0
  leverage_filter_result: removes_recurring_human_labor_and_required_for_autonomy
```

## Chief Architect Decision

- `decision`: `go_for_one_bounded_operational_pilot`
- `not_authorized`: normal operation, broad campaign, CRM cards, enrichment,
  heat scoring, or adjacent source expansion
- `why_now`: The controlled product slices are green. The remaining question
  is whether the existing operator path can run safely without Alejandro
  manually announcing each new follower during the start of paid traffic.

## Business Outcome

Prove one limited standing operation from an approved new Instagram follower,
through one-time welcome audio and bounded reply handling, to one verified
MailerLite onboarding upsert and one redacted final receipt, while removing
Alejandro from routine handoffs.

## Pilot Boundary

- Duration: 24 hours from approved start or 10 new followers observed,
  whichever occurs first.
- Capacity: at most 5 candidates processed end-to-end.
- Effect caps: at most 5 welcome audios and at most 5 MailerLite upserts.
- Cadence: observe every 20 minutes between 08:00 and 22:00
  `America/Bogota`.
- Quiet hours: 22:00 to 08:00. No source action, send, or reply check.
- Review model: one CEO approval at the start and one redacted final brief.
  No routine CEO handoffs are part of the mission.

## Approved Operating Path

1. Perform one central docs-only integration before activating the pilot.
2. Use the bounded Codex/Computer Use operator in Safari for the approved
   Instagram notification and DM route.
3. Observe only candidates discovered inside the approved new-follower source
   boundary. No per-candidate CEO approval is required.
4. Check private history and dedupe state before any send.
5. Send the exact approved welcome audio once to an eligible candidate.
6. Recheck replies on the bounded cadence.
7. Treat a voluntarily supplied valid email as sufficient for handoff; name,
   country, city, and phone remain optional.
8. Use the existing approved Vercel proxy for one MailerLite subscriber upsert
   with the two confirmed onboarding memberships.
9. Wait at least 120 seconds before the first MailerLite verification. Permit
   at most one additional read-only verification before classifying the
   outcome as unknown.
10. Record private history and evidence outside the repository and produce
    only redacted aggregate receipts and the final CEO brief.

## Terminal States

- `already_welcomed`
- `blocked_duplicate`
- `blocked_ambiguous`
- `welcome_sent`
- `reply_seen`
- `email_handoff_ready`
- `mailerlite_onboarded_verified`
- `unknown_blocked`
- `manual_review_required`

Success requires zero duplicate audio, zero duplicate upsert, and zero private
data leakage.

## Atomicity And Dedupe

- Run the final already-welcomed and dedupe check no more than five minutes
  before a welcome send.
- Hold one logical lock on the private follower anchor while processing.
- Write a terminal private-history state before advancing the candidate.
- Use one unique operation ID for each MailerLite upsert.
- If source health, history, identity, or idempotency is unknown, block rather
  than act.

## Self-Repair And Stop Rules

- At most one local retry for a recoverable UI step.
- At most one additional MailerLite read-only verification after the required
  wait.
- Never resend an audio, retrigger an automation, or issue a second upsert just
  to test whether the first effect occurred.
- Unknown effect or identity becomes `unknown_blocked`; pause recurrence,
  preserve a redacted state, and take no further action for that candidate.
- Pause and escalate only for a real boundary condition: authentication or
  CAPTCHA, persistent UI instability, identity ambiguity, unknown history,
  possible duplicate, missing approved audio, ambiguous private reply, invalid
  email, suppression/bounce/unsubscribe state, group mismatch, missing
  telemetry after the wait plus second check, privacy risk, or required scope
  expansion.
- Reaching a capacity cap or quiet hours is handled automatically by pausing or
  ending the bounded recurrence; it does not require a routine CEO decision.
- Any corrective mutation requires separate approval.

## Forbidden Scope

- No campaign launch, edit, configuration, or advertising action.
- No recipient expansion beyond eligible pilot candidates, no source expansion
  beyond the approved Instagram follower boundary, and no group expansion
  beyond the two exact onboarding memberships. No automation or account
  expansion.
- No Meta Business Suite.
- No unrelated Instagram profile, notification, or DM navigation.
- No follow, comment, reaction, or unrelated message.
- No Gmail use.
- No MailerLite UI or direct MailerLite API use outside the approved Vercel
  proxy.
- No delete, resend, retrigger, automation modification, or campaign mutation.
- No CRM card, Fact Store, ledger, enrichment, heat score, source-result,
  next-best-action, or other CRM write.
- No Launch OS, Mantis general memory, or legacy `/Users/alejandrogomez/CRM`
  work.
- No raw private values, screenshots, messages, email addresses, subscriber
  rows, IDs, tokens, headers, credentials, or payloads in repository docs or
  chat.

## Central Integration Gate

Before source operation begins, the Integration Worker must preserve Mission
v2 history, register the fresh proof closeout, register this contract as the
active next action, pass diff and redaction checks, and commit and push the
single central docs-only integration. That integration performs no source
action.

## Pilot Start Gate

Advertising remains off until all of the following are true:

- the exact mission approval below has been received;
- the central docs-only integration is complete;
- Safari source health is green;
- the exact welcome audio is confirmed;
- the existing Vercel proxy and two onboarding memberships are confirmed;
- caps, cadence, quiet hours, pause behavior, and stop behavior are active.

Codex does not launch or edit the campaign under this contract.

## Final CEO Brief

The final brief will report only redacted aggregates:

- pilot start and terminal reason;
- followers observed and candidates eligible;
- welcome audios sent and blocked states;
- replies seen and email handoffs ready;
- MailerLite upserts attempted and verified;
- unknown or manual-review states;
- duplicate, privacy, and scope-breach counts;
- whether the pilot is ready to graduate, needs one repair, or should pause;
- a separate campaign go/no-go recommendation.

## Exact CEO Approval Phrase

> Apruebo que Codex/Computer Use en Safari ejecute
> `crm_core_limited_operational_pilot_hardening_v0_2026-07-13` exactamente como
> está escrito: una integración central docs-only previa, 24h o 10 nuevos
> followers, máximo 5 welcome audios, máximo 5 MailerLite upserts por el proxy
> Vercel existente con dos pertenencias, quiet hours 22:00–08:00
> America/Bogota, cero campaña/configuración adicional, cero CRM writes y brief
> final redactado.

This is one mission-level approval. After it is received, Codex should execute
the bounded mission without routine questions and return only the final brief,
unless a listed stop rule requires a genuine CEO decision.

## Approval Receipt

- `received_at`: `2026-07-13 America/Bogota`
- `user_message`: `Go`
- `interpretation`: Direct approval by reference to the exact contract and
  approval phrase immediately preceding the user message.
- `execution_explicitly_approved`: true
- `campaign_authorized`: false
