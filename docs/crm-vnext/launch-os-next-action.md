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

## Blocked Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_seed_inbox_readback_qa_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-02`
- `blocked_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 seed inbox readback QA blocked - 2026-06-02`
- `objective`: Review the four received compact-footer v2 seed/test emails for
  visual, copy, link and footer readback QA before any public/audience-send
  approval packet is considered.
- `blocked_reason`: The exact read-only seed inbox QA approval was consumed and
  a restricted Gmail connector readback found exactly four recent v2 seed
  messages, but the formal artifact QA is not green because the connector
  exposes a textual body and cannot verify the visual signature image or rendered
  footer hierarchy.
- `blocked_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_observation_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
- `green_evidence_from_readback`:
  - Exactly four recent compact-footer v2 seed messages found for E01-E04.
  - Three CTA links validated by safe GET with no exact URL output.
  - Visible raw URL count: `0`.
  - Canonical footer text verified in connector body.
  - Duplicate postal address observed: `false`.
  - Duplicate typed `Alejandro` after `Un abrazo,`: `false`.
- `blocker`: `visual_signature_asset_not_verified`
- `live_gate_status`: V2 replacement-draft creation approval, v2 seed-test
  approval and v2 read-only seed inbox QA approval are consumed. Public/audience
  sends, MailerLite publish/schedule, subscribers, workflows, Shopify and CRM
  remain closed until a separate exact approval.
- `resume_instruction`: Stop and report this QA blocker unless Alejandro
  provides user-side visual evidence for the four messages or gives a new exact
  approval for a narrow visual read-only UI inspection route. Do not resend test
  emails, recreate drafts, ask for public/audience send approval, or use stale
  seed inbox QA as v2 evidence.

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_visual_readback_evidence_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 seed inbox readback QA blocked - 2026-06-02`
- `objective`: Resolve only the missing visual readback evidence for the four
  compact-footer v2 seed emails before CEO-review readiness can be considered.
- `why_now`: Textual readback is mostly green, but formal QA remains blocked by
  visual signature evidence. This is a CEO-review quality gate, not a delivery
  or public-send gate.
- `allowed_scope`:
  - Accept user-provided visual evidence for the four v2 messages.
  - If Alejandro gives a fresh exact approval, inspect only those four messages
    through a narrow read-only visual UI route.
  - Update the redacted observation and artifact QA packet after visual evidence
    exists.
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
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_observation_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - Optional future visual evidence/readback packet under `/Users/alejandrogomez/Documents/Mantis-Reports/`.
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Read-only visual inspection only after a fresh exact approval for that
    route.
- `validation_commands`:
  - `git diff --check`
- `live_gate_status`: V2 replacement-draft creation approval and v2 seed-test
  approval are consumed. The read-only seed inbox QA approval was consumed and
  resulted in a visual-evidence blocker. Public/audience sends, MailerLite
  publish/schedule, subscribers, workflows, Shopify and CRM remain closed until
  a separate exact approval.
- `human_boundary_id`: `mailerlite_footer_compact_v2_visual_readback_evidence_boundary_inteligencia_descansar`
- `human_boundary_notification_status`: `pending`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - The requested route would inspect unrelated inbox/mailbox content or older
    same-subject test threads.
  - Any requested action would resend tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Ask for or use only the missing visual evidence. Do not
  revisit sends, draft creation or public/audience readiness.
- `completion_definition`: Visual signature and footer hierarchy evidence for
  the four v2 seed emails is captured or explicitly rejected, and the artifact
  QA packet is refreshed. No live audience action occurs.
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_visual_readback_observation_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_visual_readback_observation_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_footer_compact_v2_visual_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_footer_compact_v2_visual_canon_inteligencia_descansar_2026-06-02.md`
- `completion_note`: The visual read-only Computer Use inspection verified
  signature rendering, compact footer hierarchy, compact author-name scale, no
  duplicate postal address display and no duplicated typed `Alejandro` after
  `Un abrazo,` across all four recent v2 seed messages. The refreshed artifact
  QA packet is green for CEO review and does not authorize any send or live
  mutation.

## Active Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_ceo_review_readiness_packet_inteligencia_descansar`
- `status`: `active`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 visual readback QA green - 2026-06-02`
- `objective`: Convert the now-green compact-footer v2 seed inbox evidence into
  a CEO-review/readiness packet and a clear next decision boundary, without
  asking for or executing any public/audience send.
- `why_now`: Four current compact-footer v2 seed emails are now delivery,
  clickthrough, footer/copy and visual-readback green. The previous blocker
  `visual_signature_asset_not_verified` is closed by evidence, so the next
  useful move is a local CEO-review/readiness synthesis.
- `allowed_scope`:
  - Read the v2 visual observation and refreshed artifact QA packet.
  - Refresh local-only CEO-review/readiness/current-state evidence if needed.
  - Prepare a concise CEO-review packet or next-decision note with caveats and
    explicit closed live gates.
- `forbidden_scope`:
  - Do not recreate replacement drafts.
  - Do not resend seed/test emails.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, recipient lists or broad mailbox inspection.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_visual_readback_observation_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_footer_compact_v2_visual_canon_inteligencia_descansar_2026-06-02.json`
  - Optional refreshed CEO/current-state/readiness packets under `/Users/alejandrogomez/Documents/Mantis-Reports/`.
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Local-only report generation/validation commands that do not call live APIs.
- `validation_commands`:
  - `jq empty <new JSON reports>`
  - `node --check <local report scripts used>`
  - Focused `npx vitest run <relevant specs>` when a script is used.
  - `git diff --check`
- `live_gate_status`: V2 replacement-draft creation approval, v2 seed-test
  approval, v2 read-only seed inbox QA approval and v2 visual readback approval
  are all consumed. Public/audience sends, MailerLite publish/schedule,
  subscribers, workflows, Shopify and CRM remain closed until a separate exact
  approval.
- `human_boundary_id`: `mailerlite_footer_compact_v2_ceo_review_readiness_packet_inteligencia_descansar`
- `human_boundary_notification_status`: `not_required_for_local_readiness_synthesis`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Required local visual/QA evidence is missing or fails validation.
  - Any requested action would resend tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Prepare or refresh only the local CEO-review/readiness
  synthesis. Do not revisit sends, draft creation or public/audience execution.
- `completion_definition`: A local CEO-review/readiness synthesis is current,
  cites the visual-readback green packet, preserves all live gates as closed and
  names the next human decision without executing a live action.
- `next_checkpoint_expected`: `Launch OS v0 compact footer v2 CEO-review readiness packet - 2026-06-02`

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
