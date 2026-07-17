# CRM Core UI-Attested Welcome-Audio Live Activation Proof v1

Date: 2026-07-16
Status: `completed_green_centrally_integrated_repo_only_no_live`

```yaml
mission_id: crm_core_ui_attested_welcome_audio_live_activation_proof_v1_20260716
business_outcome: Unlock the smallest trustworthy path from the integrated UI-attested rail to one later real confirmed welcome-audio canary.
observable_success:
  - The fixed owner-only UI-attested authority publisher is reachable only with one exact private draft and authorization and keeps every fixed repo, asset, freshness, and publication check.
  - The UI-attested live composite reuses the already-tested claim, Safari, PENDING, upload, Send, and strong-confirmation sequence without accepting a caller-selected driver, store root, clock, callback, or outcome.
  - Synthetic tests prove the live dispatch seam without opening Safari or any fixed live root.
  - The result remains production_ready=false until one separately authorized real canary is visibly confirmed.
mode: proof
approval_gate:
  contract_version: crm_core_ui_attested_welcome_audio_live_activation_proof_v1
  execution_explicitly_approved: true
  approved_targets_and_stop_rules:
    - current integrated commit c28c1ba2d69761baa039377d0d32bb7c7ea02f62
    - repo-only implementation, tests, independent review, and one central integration only if green
    - stop before Safari, private source reads, fixed live-root writes, claim, PENDING, upload, or Send
approved_effects:
  repo_reads:
    - /Users/alejandrogomez/CRM-core
    - /Users/alejandrogomez/CRM-core-live-activation-proof-v1-20260716
  live_source_reads: []
  private_artifact_reads: []
  repo_or_source_writes:
    - exact seven-file allowlist below
  sends: []
  mutations:
    - one feature-branch commit and one central integration if every gate is green
  permission_changes: []
  irreversible_actions: []
  UI_actions: []
forbidden_scope:
  - Safari, Chrome, Instagram, Computer Use, screenshots, OCR, private identities, fixed live roots, claims, PENDING, uploads, Send, text, follow-back, MailerLite, CRM writes, campaign, Ads, proxy, and network effects
  - a resumable pause between upload and Send
  - production worker, scheduler, multi-recipient execution, or cap expansion
  - any file outside the exact allowlist
source_private_boundaries:
  source_of_truth: codex/crm-core-reentry at c28c1ba2d69761baa039377d0d32bb7c7ea02f62
  private_inputs: none in this repo-only mission
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
  requirements: [privacy_safe, no_live_effect, no_permission_or_recipient_expansion, production_gap_remains_explicit]
  manual_intervention_used: false
  hardening_candidate: true
leverage_filter:
  passes_if_any: [unlocks_current_milestone, required_for_autonomy]
  result: enable only the already-tested fixed publisher and one-shot composite seam; defer autonomous worker hardening until a real canary proves value
atomicity_freshness_requirements:
  - later_live_run_must_remain_fresh_check_preflight_claim_pending_upload_send_verify_receipt_closeout
  maximum_snapshot_age: five minutes in the later live run; no live snapshot exists in this mission
reviewer_plan:
  executor: CRM Core live-activation proof worker
  adversarial_reviewer: independent Codex reviewer
  required_checks: [observable_outcome, overbuilding, caller_controlled_effect_surfaces, privacy_and_identity, exact_allowlist, zero_live_effects, old_route_regression, one_integration]
escalation_conditions:
  - any need for a caller-selected driver, store root, clock, callback, outcome, or raw UI state
  - any live or private read or write
  - any weakening of exact identity, dedupe, claim-before-upload, no-retry, or strong confirmation
  - any file outside the allowlist
  - unresolved P0-P2 review finding
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_commits: [to_be_created]
  changed_file_allowlist:
    - docs/crm-vnext/crm-core-welcome-audio-ui-attested-live-activation-proof-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.mjs
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-live-authority-publisher.spec.ts
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
  deterministic_checks:
    - syntax and diff checks
    - focused authority publisher and Safari host suites
    - welcome-audio compatibility suite
    - redaction and namespace confinement
  integration_packet_id: crm_core_ui_attested_live_activation_proof_integration_v1
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

## Proof-first rule

This mission intentionally does not build the autonomous scheduler or a
two-phase upload pause. It opens only the missing live seam around the already
tested single-recipient rail. The next separately authorized mission must prove
one real confirmed audio bubble. Only that evidence may justify broader
autonomous-worker hardening.

## Implementation Result

The fixed authority publisher now accepts only the exact private draft and
authorization records. It selects the owner-only authority root, fixed mode,
and `Date.now()` internally; caller-selected root, mode, clock, driver, or
outcome fields fail closed.

The UI-attested live composite now shares one internal sequence with the
synthetic composite. In live mode it opens only the fixed claim store, mints
only the installed Safari Computer Use host capability, and uses internal
clocks. Its public input is restricted to the private exact binding
capabilities and values plus the audio path already bound by the approved
audio capability. It accepts no caller driver, store, clock, callback,
confirmation outcome, or actuation result.

Focused synthetic and namespace validation is `117/117` green, and the full
welcome-audio compatibility set is `637/637` green across 13 suites. It proves
the shared dispatch seam and generic-surface rejection without opening Safari,
reading private inputs, touching a fixed live root, issuing a claim, or
invoking an external effect. `production_ready=false` remains controlling
until one separately authorized real canary produces an unambiguous new audio
bubble in the exact bound thread.

Independent review packet
`crm_core_ui_attested_live_activation_proof_integration_v1` found no P0-P2
issue and returned `GREEN_TO_SELF_INTEGRATE`. The exact allowlist is `7/7`,
focused validation is `117/117`, and welcome-audio compatibility is `637/637`.
One serialized central integration completed; Git history is authoritative for
the integration commit. No live or private boundary was entered.
