# Launch OS Active Next Action Contract

Purpose:

A persistent contract for Codex Goals/play resumes. It records the next intended
action after each milestone so a future play/resume continues from the active
contract instead of replanning from scratch unless there is a clear reason.

This file does not replace the Control Room, current-state refresh, operator
runbook, continuation guard, approval queue or validation receipt. It is the
small active pointer that tells the next run what to do first.

Use `docs/crm-vnext/launch-os-codex-profile.md` as the context-routing filter
for Goals/play resumes before broad hydration. This file remains the tactical
active pointer once the profile has set the hydration lane.

## Resume Policy

On each Goal/play resume:

1. Apply `docs/crm-vnext/launch-os-codex-profile.md` for hydration scope.
2. Read this file as the active next-action pointer.
3. Read the latest relevant checkpoint in
   `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`.
4. Check `git status --short`.
5. Continue the active `next_action_id` unless one of the stop/change
   conditions applies.
6. If choosing a different next action, explain why before editing files.

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
- `human_boundary_id`:
- `human_boundary_notification_status`: `not_needed | pending | sent | deferred`
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
- `source_checkpoint`: `Launch OS v0 asset-ready E04 seed resend and seed inbox QA green checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_asset_ready_inteligencia_descansar_2026-06-02.json`

- `next_action_id`: `mailerlite_asset_ready_e04_seed_resend_approval_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 asset-ready E04 seed resend and seed inbox QA green checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_e04_seed_resend_preflight_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_e04_seed_resend_execution_receipt_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-06-02.json`

- `next_action_id`: `mailerlite_footer_compact_canon_local_render_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 footer compact canon local render checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_canon_inteligencia_descansar_2026-06-02/`

- `next_action_id`: `mailerlite_footer_compact_null_audience_replacement_approval_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer Null Audience approval boundary checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_preflight_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`

- `next_action_id`: `mailerlite_footer_compact_null_audience_replacement_execution_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer Null Audience replacement drafts created - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_footer_compact_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_current_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`

## Active Next Action

- `next_action_id`: `mailerlite_footer_compact_seed_test_approval_boundary_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer Null Audience replacement drafts created - 2026-06-02`
- `objective`: Stop before any compact-footer seed/test email send. Treat the
  newly created compact-footer drafts as inert Null Audience draft evidence
  until the approved seed-test edge is executed through a semantic Computer Use
  UI route after fresh API QA.
- `why_now`: The compact-footer replacement execution receipt is green for four
  new draft-only campaigns assigned exclusively to the empty Null Audience
  safety group. The current approval queue now exposes the generic
  `mini_launch_null_audience_seed_test_send` boundary for the current compact
  evidence set, but that queue readiness is not approval and must not reuse the
  consumed asset-ready seed-test or E04-only resend approvals.
  Current-state refresh explicitly marks the historical asset-ready seed inbox
  QA as not applicable to the compact-footer replacement receipt, so effective
  seed inbox QA remains false until fresh compact-footer seed evidence exists.
  Alejandro provided the fresh exact compact-footer seed-test approval, and
  fresh API re-scans stayed green. A Computer Use semantic UI path exposed the
  `Send a test` control and completed the `E01` test send to the exact seed
  recipient, with semantic success text observed. The full approved edge is
  still not closed: `E02`, `E03` and `E04` were not sent, no full
  `record_ui_sent` receipt exists, and the approval is now partially consumed
  for `E01` only. Do not resend `E01`.
- `allowed_scope`:
  - Inspect compact-footer replacement receipts and current-state evidence.
  - Generate or refresh a compact-footer seed-test preflight/approval packet
    only as a local/reporting or read-only API action.
  - Use the received compact-footer seed-test approval only for the remaining
    unsent compact-footer labels after a fresh API re-scan remains green. Do
    not ask for the same approval again unless Alejandro supersedes it or the
    evidence set changes.
  - Route the remaining `E02`, `E03` and `E04` test sends through MailerLite UI
    by Computer Use semantic UI actions only in this Codex thread, then record a
    local receipt for the full `E01`-`E04` set; do not use API as the primary
    test-send route.
  - If Computer Use cannot expose and operate the required test-send controls
    semantically, stop and report the UI-route blocker. Do not use screenshots,
    coordinate clicks, system-click fallbacks or browser DOM/AppleScript click
    injection for MailerLite UI operations.
  - Before any seed-test send, re-scan by API and require QA green that the four
    current compact-footer drafts are still draft-only, unpublished,
    unscheduled, workflow-free and assigned only to
    `CC · Safety · Null audience · DO NOT SEND` with `active_count=0`.
  - Keep all evidence redacted and hashed where receipts identify campaigns,
    groups, recipients, private URLs or Gmail messages.
- `forbidden_scope`:
  - Do not repeat the asset-ready replacement draft creation.
  - Do not repeat the compact-footer replacement draft creation.
  - Do not resend `E01`; Computer Use semantic UI already observed a successful
    `E01` test send under this approval.
  - Do not send `E02`, `E03` or `E04` more than once under this approval.
  - Do not record any `record_ui_sent` receipt unless the test emails were
    actually sent through Computer Use semantic UI operation.
  - Do not rerun the consumed four-email seed-test approval.
  - Do not rerun the consumed E04-only seed resend approval.
  - Do not perform artifact/CEO-readiness QA from the stale oversized-footer
    seed evidence.
  - No MailerLite test send without a fresh exact compact-footer seed-test
    approval after green re-scan/preflight.
  - No public/audience send, publish or schedule from this boundary.
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
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_e04_seed_resend_execution_receipt_asset_ready_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_preflight_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_footer_compact_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_footer_compact_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_ui_blocker_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_ui_blocker_footer_compact_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_current_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Fresh MailerLite API read-only re-scan/preflight before any compact-footer
    seed-test approval request or execution.
  - Local seed-test approval packet generation that does not send email.
  - Local report generation commands that do not call MailerLite, Shopify, CRM,
    ledgers, cards, scoring or Fact Store.
- `validation_commands`:
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs`
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs`
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send.mjs`
  - `node --check scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs`
  - `npx vitest run __tests__/crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send.spec.ts __tests__/crm-vnext-mailerlite-mini-launch-null-audience-replacement.spec.ts __tests__/crm-vnext-mailerlite-launch-os-current-state-refresh.spec.ts`
  - `git diff --check`
- `live_gate_status`: partially consumed after approval. `E01` was sent through
  MailerLite UI by Computer Use semantic controls after fresh API re-scan, but
  `E02`, `E03` and `E04` remain unsent and the full `record_ui_sent` receipt
  has not been created. Continue only after another fresh API re-scan and only
  if Computer Use can operate the remaining test-send UI semantically. Queue
  readiness is not approval. Public/audience sends, MailerLite publish/schedule,
  subscribers, workflows, Shopify and CRM remain closed.
- `human_boundary_id`: `mailerlite_footer_compact_seed_test_approval_boundary_inteligencia_descansar`
- `human_boundary_notification_status`: `pending`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Any requested action would send a test email without a fresh API re-scan.
  - Any requested action would use screenshots, coordinate clicks, system-click
    fallbacks or browser DOM/AppleScript click injection for MailerLite UI.
  - Any requested action would resend `E01`.
  - Any requested action would prepare a public send approval before fresh
    compact-footer seed inbox evidence exists.
  - A requested action would send, publish, schedule, assign a real audience,
    mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store without a new exact approval.
- `resume_instruction`: Continue from the compact-footer replacement execution
  receipt and compact-footer seed-test preflight. Do not recreate old
  asset-ready drafts, do not recreate the compact replacements, do not rerun
  either consumed asset-ready seed approval, and do not perform
  artifact/CEO-readiness QA from the stale oversized-footer seed messages.
- `completion_definition`: A later compact-footer seed-test checkpoint has a
  fresh API re-scan/preflight, the received exact approval consumed exactly
  once, a Computer Use semantic UI-recorded test-send receipt and then seed
  inbox QA, all without public/audience send, publish, schedule,
  subscriber/workflow, Shopify, CRM, ledger, card, scoring or Fact Store
  effects.
- `next_checkpoint_expected`: `Launch OS v0 compact footer seed-test approval boundary checkpoint - 2026-06-02`

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
