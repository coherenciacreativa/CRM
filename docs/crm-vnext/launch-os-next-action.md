# Launch OS Active Next Action Contract

Purpose:

A persistent contract for Codex Goals/play resumes. It records the next intended
action after each milestone so a future play/resume continues from the active
contract instead of replanning from scratch unless there is a clear reason.

This file does not replace the Control Room, current-state refresh, operator
runbook, continuation guard, approval queue or validation receipt. It is the
small active pointer that tells the next run what to do first.

## Resume Policy

On each Goal/play resume:

1. Read this file first.
2. Read the latest relevant checkpoint in
   `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`.
3. Check `git status --short`.
4. Continue the active `next_action_id` unless one of the stop/change
   conditions applies.
5. If choosing a different next action, explain why before editing files.

## Existing Related Controls

- `scripts/crm-vnext-mailerlite-launch-os-continuation-guard.mjs` prevents old
  closed boundaries from being reopened after compaction/resume.
- `scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs` regenerates
  local current-state evidence and downstream reports.
- `scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs` summarizes
  current reports, command catalog, approval matrix and operating scenarios.

These are related, but they do not by themselves declare the single active next
action that a resumed Goal should continue before replanning.

## Active Next Action Schema

- `next_action_id`:
- `status`: `active | blocked | superseded | completed`
- `created_at`:
- `updated_at`:
- `source_checkpoint`:
- `objective`:
- `why_now`:
- `allowed_scope`:
- `forbidden_scope`:
- `expected_files`:
- `allowed_commands`:
- `validation_commands`:
- `live_gate_status`:
- `stop_conditions`:
- `resume_instruction`:
- `completion_definition`:
- `next_checkpoint_expected`:

## Completed Next Action

- `next_action_id`: `asset_destination_readiness_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset destination readiness checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_integrated_experience_qa_packet_current_inteligencia_descansar_2026-06-02.json`

## Active Next Action

- `next_action_id`: `mailerlite_replacement_draft_approval_boundary_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset destination readiness checkpoint - 2026-06-02`
- `objective`: Stop at the human approval boundary before creating new
  MailerLite replacement drafts from the updated, asset-ready local payload.
- `why_now`: Destination/assets and Product/Value are now locally green. The next
  material move toward CEO-review readiness is to create fresh Null Audience
  replacement drafts in MailerLite, but that is a live MailerLite mutation and
  requires exact approval.
- `allowed_scope`:
  - Explain the decision and provide the exact approval phrase if Alejandro asks.
  - Before any execution after approval, run a fresh MailerLite/API preflight
    that verifies draft target scope, Null Audience group exclusivity and
    `active_count=0`.
  - Keep any pre-approval work local-only/report-only.
- `forbidden_scope`:
  - No MailerLite draft creation, edit, send, publish, schedule or audience
    action without exact approval.
  - No Shopify additional mutation, publish, theme push, live form wiring or
    public navigation/SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No subscriber, group, segment, workflow or automation mutation.
  - No secret reads, env dumps, raw token output, raw private URLs or recipient
    lists.
- `expected_files`:
  - `docs/crm-vnext/launch-os-next-action.md`
  - `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_reason_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-02.json`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Fresh preflight commands only after confirming they do not mutate drafts,
    sends, subscribers, groups, workflows, Shopify, CRM, ledgers, cards, scoring
    or Fact Store.
- `validation_commands`:
  - `git diff --check`
  - Focused syntax/tests for any touched local scripts.
- `live_gate_status`: closed until Alejandro gives an exact approval phrase for
  MailerLite replacement draft creation.
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Any target draft or Null Audience evidence is stale or contradicts current
    reports.
  - A requested action would send, publish, schedule, assign a real audience,
    mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store without exact approval.
- `resume_instruction`: Explain that the next move is MailerLite replacement
  draft creation from the updated local payload, why it is a live mutation, and
  ask for exact approval before proceeding. Do not create or edit drafts from a
  generic "adelante".
- `completion_definition`: Fresh MailerLite replacement drafts are created only
  after exact approval, remain draft-only, point exclusively to the empty Null
  Audience safety group, contain the updated asset-ready payload, pass
  post-create QA, and generate a local execution receipt.
- `next_checkpoint_expected`: `Launch OS v0 MailerLite replacement drafts checkpoint - 2026-06-02`

## Stop/Change Conditions

A future resume may choose a different action only if:

- Newer user instruction supersedes this contract.
- Git state is unexpected.
- Required evidence is missing or stale.
- Validation fails.
- A live/approval boundary appears.
- Current action is blocked by a human/product decision.
- Control Room says the phase changed.
- The active `next_action_id` is already completed.

## Hydration Policy

Use light hydration by default:

- This file.
- Latest Control Room checkpoint.
- `git status --short`.
- Files directly related to `next_action_id`.

Use deep hydration only for:

- Phase changes.
- Live-adjacent gates.
- Missing/stale evidence.
- Failed validation.
- Unexpected git state.
- Several commits without a checkpoint.
- Updated goal or strategic clarification.
