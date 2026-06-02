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

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_null_audience_replacement_execution_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 Null Audience replacement drafts created - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_preflight_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_seed_test_approval_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 seed tests completed - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_preflight_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_current_state_refresh_current_2026-06-02.json`
- `completion_note`: The execution receipt is the authoritative v2 seed-test
  evidence for this boundary. It records four UI-assisted MailerLite test sends
  as `safety.mailerLiteTestEmailsSent=4`; the general current-state refresh is
  context, not the v2 seed-inbox authority.

## Active Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_seed_inbox_readback_qa_inteligencia_descansar`
- `status`: `active`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 seed tests completed - 2026-06-02`
- `objective`: Review the four received compact-footer v2 seed/test emails for
  visual, copy, link and footer readback QA before any public/audience-send
  approval packet is considered.
- `why_now`: The exact compact-footer v2 seed-test approval was consumed after
  fresh API QA stayed green, and four test emails were sent by the MailerLite
  UI/Computer Use route to the approved seed recipient. The next useful work is
  CEO/seed inbox readback, not another draft creation or resend.
- `allowed_scope`:
  - Inspect local v2 receipts, local render QA and current-state reports.
  - Use the seed inbox readback approval packet to request the exact read-only
    inbox QA phrase before inspecting the seed inbox.
  - Review only the four received seed/test emails through a user-approved
    read-only inbox route or user-provided evidence.
  - Compare visible email rendering against the v2 canon: compact footer,
    single postal-address display, no duplicate typed `Alejandro` before the
    signature, CTA link behavior and no visible placeholder/token artifacts.
  - Produce a local readback QA packet or short CEO decision note.
- `forbidden_scope`:
  - Do not recreate replacement drafts.
  - Do not resend seed/test emails without a new exact approval.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, recipient lists or broad mailbox inspection.
- `expected_files`:
  - `docs/crm-vnext/launch-os-next-action.md`
  - `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_readback_qa_approval_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - Optional local readback QA packet under `/Users/alejandrogomez/Documents/Mantis-Reports/`.
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Read-only inbox/UI inspection only after Alejandro provides the exact
    phrase from the seed inbox readback QA approval packet.
- `validation_commands`:
  - `git diff --check`
- `live_gate_status`: V2 replacement-draft creation approval and v2 seed-test
  approval are consumed. Public/audience sends, MailerLite publish/schedule,
  subscribers, workflows, Shopify and CRM remain closed until a separate exact
  approval.
- `human_boundary_id`: `mailerlite_footer_compact_v2_seed_inbox_readback_qa_inteligencia_descansar`
- `human_boundary_notification_status`: `pending`
- `human_boundary_packet`:
  `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_readback_qa_approval_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - The exact read-only seed inbox QA phrase is absent or materially changed.
  - The requested route would inspect unrelated inbox/mailbox content.
  - Any requested action would resend tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Continue with compact-footer v2 seed inbox/readback QA
  only. If the exact read-only seed inbox QA phrase has not been provided, give
  Alejandro the phrase from the approval packet and stop. Use the v2 execution
  receipt as the authoritative seed-test evidence; do not treat the general
  current-state refresh or older seed inbox QA artifacts as proof of v2 inbox
  quality.
- `completion_definition`: The four compact-footer v2 seed emails are reviewed
  for visual/copy/link/footer quality and the next boundary is declared as
  either correction, resend approval, or a separate public/audience-send
  readiness packet. No live audience action occurs.
- `next_checkpoint_expected`: `Launch OS v0 compact footer v2 seed inbox readback QA - 2026-06-02`

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
