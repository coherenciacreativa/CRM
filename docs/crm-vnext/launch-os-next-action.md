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

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_seed_test_approval_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer seed tests completed - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_footer_compact_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`

## Superseded Next Action

- `next_action_id`: `mailerlite_footer_compact_seed_inbox_qa_read_only_inteligencia_descansar`
- `status`: `superseded`
- `created_at`: `2026-06-02`
- `superseded_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer seed tests completed - 2026-06-02`
- `superseded_by`: `mailerlite_footer_compact_v2_null_audience_replacement_approval_boundary_inteligencia_descansar`
- `reason`: Seed inbox review exposed visual/copy footer problems in the
  compact-footer test emails: duplicate postal address, oversized footer name
  and duplicated typed `Alejandro` before the visual signature. The next useful
  boundary is replacement-draft approval for the corrected local v2 canon, not
  inbox QA of the superseded drafts.

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_local_render_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 footer compact v2 local render checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_v2_canon_inteligencia_descansar_2026-06-02/`

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_null_audience_replacement_approval_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 Null Audience replacement approval packet checkpoint - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`

## Active Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_null_audience_replacement_execution_boundary_inteligencia_descansar`
- `status`: `active`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 Null Audience replacement approval packet checkpoint - 2026-06-02`
- `objective`: Wait for exact human approval, then run fresh MailerLite API
  preflight and create exactly four new compact-footer v2 Null Audience
  replacement drafts if every QA gate stays green.
- `why_now`: Alejandro locally reviewed the v2 HTML and confirmed it works. The
  v2 replacement approval packet is green with four targets, 0 blockers,
  Null Audience recipe ready, local render ready, no visible link tokens and no
  live mutations. Current State is green and treats the missing v2 execution
  receipt as `pending_exact_approval_not_created_yet`, not as reusable compact
  evidence. The remaining step is a MailerLite draft mutation, so it needs the
  exact approval phrase from the v2 packet.
- `allowed_scope`:
  - On exact approval only, run fresh API preflight for the four compact-footer
    v2 replacement targets.
  - Confirm the safety group is still empty with `active_count=0`.
  - Confirm replacement draft names do not already exist.
  - Create exactly four new MailerLite draft campaigns assigned exclusively to
    the empty safety group.
  - Keep old asset-ready and compact-footer drafts intact as no-use evidence.
  - Delete drafts created by this execution if post-create QA fails.
  - Generate local preflight/execution receipts with redacted/hash-only
    evidence.
- `forbidden_scope`:
  - Do not proceed on vague approval such as `adelante`; require exact phrase.
  - Do not send or resend any test email from this boundary.
  - Do not reuse consumed asset-ready, E04-only, compact-footer replacement or
    compact-footer seed-test approvals.
  - Do not ask for or execute public/audience send approval from this boundary.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs or recipient lists.
- `expected_files`:
  - `docs/crm-vnext/launch-os-next-action.md`
  - `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
  - `scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs`
  - `scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs`
  - `scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.md`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - `npm run crm:vnext:mailerlite-mini-launch-null-audience-replacement-create -- --approval-packet <v2 packet> --email-render-qa <v2 render> --replacement-suffix "API Null Audience compact footer v2 canon" --out <v2 preflight path> --markdown-out <v2 preflight md>`
  - Same command with `--execute --approval-phrase <exact phrase>` only after
    exact approval is provided.
  - `npm run crm:vnext:mailerlite-launch-os-current-state-refresh -- --date 2026-06-02`
- `validation_commands`:
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs`
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs`
  - `node --check scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs`
  - `npx vitest run __tests__/crm-vnext-mailerlite-mini-launch-null-audience-replacement.spec.ts __tests__/crm-vnext-mailerlite-launch-os-current-state-refresh.spec.ts`
  - `git diff --check`
- `live_gate_status`: The v2 approval packet is local-only and not itself an
  approval. Draft creation remains blocked until exact phrase is provided.
  Test sends, public/audience sends, MailerLite publish/schedule, subscribers,
  workflows, Shopify and CRM remain closed.
- `human_boundary_id`: `mailerlite_footer_compact_v2_null_audience_replacement_execution_boundary_inteligencia_descansar`
- `human_boundary_notification_status`: `pending`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Exact approval phrase is missing or does not match the v2 packet.
  - Fresh API preflight shows the safety group is not empty.
  - Any replacement name already exists.
  - Any source draft is no longer draft/available.
  - Any created draft fails post-create QA or is not exclusively assigned to
    the empty safety group.
  - Any requested action would send/resend email, publish, schedule, assign a
    real audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/
    cards/scoring/Fact Store without a separate exact approval.
- `resume_instruction`: If Alejandro provides the exact v2 approval phrase,
  execute the fresh preflight and replacement-create route. If approval is not
  exact, report the needed phrase and stop.
- `completion_definition`: Four new compact-footer v2 Null Audience
  replacement drafts exist in MailerLite, post-create QA is green, old drafts
  remain intact as no-use, local preflight and execution receipts are generated,
  and no test sends/public sends/publish/schedule/subscriber/workflow/Shopify/
  CRM/ledger/card/scoring/Fact Store action occurred.
- `next_checkpoint_expected`: `Launch OS v0 compact footer v2 Null Audience replacement drafts created - 2026-06-02`

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
