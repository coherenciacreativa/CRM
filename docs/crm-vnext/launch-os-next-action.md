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

- `next_action_id`: `mailerlite_replacement_draft_creation_asset_ready_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset-ready Null Audience replacement drafts created - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_asset_ready_inteligencia_descansar_2026-06-02.json`

## Active Next Action

- `next_action_id`: `mailerlite_asset_ready_seed_test_approval_boundary_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset-ready Null Audience replacement drafts created - 2026-06-02`
- `objective`: Stop at the human approval boundary before sending test emails
  from the asset-ready Null Audience replacement drafts to the seed recipient.
- `why_now`: Four new MailerLite replacement drafts now exist from the
  asset-ready/footer-canon payload, are still draft-only, and point exclusively
  to the empty Null Audience safety group. A read-only seed-test preflight is
  green, but sending test emails is a separate MailerLite live action and
  requires exact approval.
- `allowed_scope`:
  - Explain the seed-test decision if Alejandro asks.
  - Provide the exact approval phrase for seed-test sends only if Alejandro asks.
  - Before any execution after approval, run a fresh MailerLite/API preflight
    that verifies the four drafts still match the creation receipt, remain
    draft-only, point exclusively to Null Audience and contain no placeholders or
    redacted final-link tokens.
  - Keep any pre-approval work local-only/report-only.
- `forbidden_scope`:
  - Do not repeat the asset-ready replacement draft creation.
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
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_asset_ready_inteligencia_descansar_2026-06-02.json`
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
  seed-test sends from these four asset-ready Null Audience drafts.
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Any target draft or Null Audience evidence is stale or contradicts current
    reports.
  - A requested action would send, publish, schedule, assign a real audience,
    mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store without exact approval.
- `resume_instruction`: Continue from the asset-ready replacement execution
  receipt and seed-test preflight. Do not recreate drafts or ask again for draft
  creation approval. Stop before asking for or executing seed-test sends unless
  Alejandro explicitly requests that next approval boundary.
- `completion_definition`: Seed-test sends are performed only after exact
  approval, only to the approved seed recipient, from the four current
  asset-ready Null Audience drafts, with no publish, schedule, audience send,
  subscribers, group/segment changes, workflows, Shopify, CRM, ledgers, cards,
  scoring or Fact Store writes, followed by fresh seed inbox QA and local
  receipts.
- `next_checkpoint_expected`: `Launch OS v0 asset-ready seed test checkpoint - 2026-06-02`

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
