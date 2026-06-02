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

- `next_action_id`: `mailerlite_asset_ready_seed_test_approval_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset-ready seed test checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_asset_ready_inteligencia_descansar_2026-06-02.json`

- `next_action_id`: `mailerlite_asset_ready_seed_inbox_qa_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset-ready seed inbox QA partial checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_asset_ready_inteligencia_descansar_2026-06-02.json`

## Active Next Action

- `next_action_id`: `mailerlite_asset_ready_e04_seed_resend_approval_boundary_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset-ready seed inbox QA partial checkpoint - 2026-06-02`
- `objective`: Stop at the human approval boundary before any additional send.
  The only useful live-adjacent recovery is an E04-only asset-ready test resend
  to the approved seed recipient after fresh MailerLite API QA.
- `why_now`: Read-only Gmail seed inbox QA found current asset-ready/footer-canon
  messages for `E01`, `E02` and `E03`, but did not find the current
  asset-ready `E04` at the approved seed recipient. The latest matching E04
  seed message is stale/non-footer-canon and cannot close the current receipt.
- `allowed_scope`:
  - Explain the E04 seed inbox blocker if Alejandro asks.
  - Provide an exact E04-only approval phrase only if Alejandro asks for the
    next approval boundary.
  - If exact E04-only approval is later provided, run a fresh MailerLite API
    preflight proving the E04 asset-ready draft still matches the creation
    receipt, remains draft-only, points only to the empty Null Audience group,
    and has no placeholders or redacted tokens.
  - After an approved E04-only resend, rerun read-only seed inbox QA and keep
    all reports redacted.
- `forbidden_scope`:
  - Do not repeat the asset-ready replacement draft creation.
  - Do not resend `E01`, `E02` or `E03`.
  - Do not rerun the consumed four-email seed-test approval.
  - No additional MailerLite test send, draft creation, edit, publish, schedule
    or audience action without a new exact E04-only approval.
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
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_asset_ready_inteligencia_descansar_2026-06-02.json`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Read-only local report inspection and approval-packet preparation for the
    E04-only boundary.
  - Fresh MailerLite/API read-only preflight commands only after exact E04-only
    approval and only to verify safety before the E04 resend.
- `validation_commands`:
  - `git diff --check`
  - Focused syntax/tests for any touched local scripts.
- `live_gate_status`: blocked until Alejandro gives a new exact approval for
  E04-only seed resend. Public/audience sends, MailerLite draft mutations,
  subscribers, workflows, Shopify and CRM remain closed.
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Any evidence suggests `E01`-`E03` would be resent.
  - E04 no longer matches the asset-ready creation receipt or no longer points
    exclusively to the empty Null Audience group.
  - A requested action would send, publish, schedule, assign a real audience,
    mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store without a new exact approval.
- `resume_instruction`: Continue from the partial asset-ready seed inbox QA
  receipt. Do not recreate drafts, do not ask again for draft creation approval,
  and do not ask again for the already consumed four-email seed-test approval.
  Stop at the E04-only approval boundary unless Alejandro explicitly approves
  that narrow resend.
- `completion_definition`: With exact E04-only approval, one fresh E04 test
  email is sent only to the approved seed after fresh API QA, then read-only
  seed inbox QA proves whether all four current asset-ready messages reached the
  seed. Without that approval, this action remains blocked.
- `next_checkpoint_expected`: `Launch OS v0 asset-ready E04 seed resend checkpoint - 2026-06-02`

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
