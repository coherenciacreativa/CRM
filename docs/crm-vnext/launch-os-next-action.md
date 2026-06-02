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

## Active Next Action

- `next_action_id`: `mailerlite_footer_compact_null_audience_replacement_approval_boundary_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 footer compact canon local render checkpoint - 2026-06-02`
- `objective`: Stop at the next exact approval boundary before applying the
  compact footer canon to real MailerLite Null Audience drafts.
- `why_now`: The current seed inbox evidence is green for delivery, but
  Alejandro's screenshot showed the author/legal footer overpowering the email
  body. Local render QA now proves a compact footer hierarchy for all four
  emails. Existing MailerLite drafts and received seed messages still reflect
  the prior footer scale, so artifact/CEO-readiness QA should not proceed from
  those stale visuals.
- `allowed_scope`:
  - Explain the compact footer local QA result.
  - Prepare a redacted approval packet for creating a new compact-footer Null
    Audience replacement set or updating only safe draft replacements, after
    fresh MailerLite API preflight.
  - Keep the replacement strategy aligned with the existing Launch OS pattern:
    Null Audience only, draft-only, safety group active count `0`, rollback or
    stop on failed QA.
  - Keep all evidence redacted and hashed where receipts identify campaigns,
    groups, recipients, private URLs or Gmail messages.
- `forbidden_scope`:
  - Do not repeat the asset-ready replacement draft creation.
  - Do not resend `E01`, `E02`, `E03` or `E04`.
  - Do not rerun the consumed four-email seed-test approval.
  - Do not perform artifact/CEO-readiness QA from the stale oversized-footer
    seed evidence.
  - No MailerLite draft creation, draft edit, test send, publish, schedule or
    audience action without a fresh exact approval for that separate boundary.
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
  - A new compact-footer replacement approval packet, if generated.
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Fresh MailerLite API read-only preflight only when preparing the exact
    compact-footer draft replacement/update approval packet.
  - Local report generation commands that do not call MailerLite, Shopify, CRM,
    ledgers, cards, scoring or Fact Store.
- `validation_commands`:
  - `git diff --check`
  - Focused syntax/tests for any touched local scripts.
- `live_gate_status`: blocked until Alejandro gives a new exact compact-footer
  MailerLite draft replacement/update approval. Public/audience sends,
  MailerLite test sends, subscribers, workflows, Shopify and CRM remain closed.
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - A requested action would apply the compact footer to MailerLite without an
    exact approval.
  - Any requested action would send another test email or prepare a public send
    approval before compact-footer drafts and seed evidence exist.
  - A requested action would send, publish, schedule, assign a real audience,
    mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store without a new exact approval.
- `resume_instruction`: Continue from the compact footer local render QA. Do
  not recreate the prior asset-ready drafts, do not rerun either consumed
  seed-test approval, and do not perform artifact/CEO-readiness QA from the
  stale oversized-footer seed messages.
- `completion_definition`: A redacted approval packet exists for the next
  exact human decision: create/update compact-footer Null Audience drafts only,
  with no sends and no live audience/workflow/subscriber/Shopify/CRM effects.
- `next_checkpoint_expected`: `Launch OS v0 compact footer Null Audience approval boundary checkpoint - 2026-06-02`

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
