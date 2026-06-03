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

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_ceo_review_readiness_packet_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 CEO-review readiness packet - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_visual_readback_observation_footer_compact_v2_canon_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_footer_compact_v2_visual_canon_inteligencia_descansar_2026-06-02.json`
- `completion_note`: The local CEO-review/readiness synthesis is green with
  `ceoReviewPackageReady=true`, `ceoProposalReviewReady=true`,
  `compactFooterSeedInboxArtifactQaReady=true`,
  `compactFooterVisualReadbackGreen=true`, `blockerCount=0`,
  `readyForPublicSendApprovalNow=false` and `liveActionAllowedNow=false`.
  It names the next no-live human decision without authorizing any send or live
  mutation.

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_ceo_review_decision_boundary_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 pilot distribution decision packet no-send - 2026-06-02`
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.json`
- `completion_note`: The no-send pilot distribution decision packet is ready
  with `decisionPacketReady=true`, `canAskPilotLaneDecisionNow=true`,
  `asksPublicSendApprovalNow=false`, `canAskFinalSendApprovalNow=false`,
  `exactApprovalPhraseAvailable=false`, `liveActionAllowedNow=false`,
  `wouldAuthorizeSend=false`, `wouldAuthorizeAudienceAssignment=false` and
  `blockerCount=0`.

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_sibo_review_packet_no_send_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `completed_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 compact footer v2 pilot distribution decision packet no-send - 2026-06-02`
- `objective`: Prepare a CEO/SIBO-facing no-send review packet so Alejandro can
  review the current pilot distribution choice before any local decision intake.
- `why_now`: Alejandro clarified that the operating goal is to build and
  rehearse the frequent-launch machine, not distribute this microproduct to
  real people now. The existing no-send decision packet needs a human-facing
  review layer, not a live-send path.
- `allowed_scope`:
  - Read the no-send pilot distribution decision packet and current
    compact-footer v2 CEO evidence.
  - Generate only local JSON, Markdown and HTML review artifacts.
  - Include the exact strategy decision phrase for
    `keep_null_audience_no_public_send`.
  - Keep all live gates closed.
- `forbidden_scope`:
  - Do not recreate replacement drafts.
  - Do not resend seed/test emails.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - Do not assign any audience, group or segment.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, recipient lists or broad mailbox inspection.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.html`
- `allowed_commands`:
  - `npm run crm:vnext:mailerlite-mini-launch-sibo-review-packet`
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-sibo-review-packet.mjs`
  - `npx vitest run __tests__/crm-vnext-mailerlite-mini-launch-sibo-review-packet.spec.ts`
  - `jq empty <new JSON report>`
  - `git diff --check`
- `validation_commands`:
  - `node --check scripts/crm-vnext-mailerlite-mini-launch-sibo-review-packet.mjs`
  - `npx vitest run __tests__/crm-vnext-mailerlite-mini-launch-sibo-review-packet.spec.ts`
  - `jq empty /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `git diff --check`
- `live_gate_status`: All prior compact-footer v2 approvals are consumed.
  Public/audience sends, MailerLite publish/schedule, audience assignment,
  subscribers, workflows, Shopify and CRM remain closed until a separate exact
  approval.
- `human_boundary_id`: `mailerlite_footer_compact_v2_sibo_review_packet_no_send_inteligencia_descansar`
- `human_boundary_notification_status`: `not_needed`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Required no-send decision packet evidence is missing or fails validation.
  - Any requested action would resend tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Generate/present only the SIBO review packet. After it
  is ready, ask for the strategy-only no-send decision phrase; do not ask for
  public/audience send approval.
- `completion_definition`: The local SIBO review packet exists, validates, and
  gives Alejandro a reviewable artifact plus exact no-send strategy phrase. No
  live audience action occurs.
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.html`
- `completion_note`: The SIBO review packet is ready with
  `reviewPacketReady=true`,
  `recommendedStrategyChoice=keep_null_audience_no_public_send`,
  `strategyDecisionPhraseAvailable=true`,
  `exactApprovalPhraseAvailable=false`,
  `asksPublicSendApprovalNow=false`, `liveActionAllowedNow=false`,
  `wouldAuthorizeSend=false` and `wouldAuthorizeAudienceAssignment=false`.
- `next_checkpoint_expected`: `Launch OS v0 compact footer v2 SIBO review packet no-send - 2026-06-02`

## Completed Next Action

- `next_action_id`: `mailerlite_footer_compact_v2_pilot_distribution_lane_choice_no_send_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `source_checkpoint`: `Launch OS v0 compact footer v2 SIBO review packet no-send - 2026-06-02`
- `objective`: Capture Alejandro's strategy-only no-send pilot lane choice for
  `Inteligencia para descansar`, without asking for or executing any public/
  audience send.
- `why_now`: The compact-footer v2 CEO packet, no-send pilot distribution
  decision packet and SIBO review packet are green. Alejandro clarified that the
  current operating goal is to build and rehearse the frequent-launch machine,
  and delegated routine seed/test emails to approved seed recipients under
  strict Null Audience QA conditions. The recommended immediate strategy choice
  remains `keep_null_audience_no_public_send`.
- `allowed_scope`:
  - Read the no-send pilot distribution decision packet.
  - Present the SIBO review packet and exact strategy decision phrase.
  - Present only the three strategy choices:
    `keep_null_audience_no_public_send`, `manual_micro_cohort_next`,
    `opt_in_testers_next`.
  - If Alejandro chooses `manual_micro_cohort_next` or `opt_in_testers_next`,
    prepare only the matching local roster/preflight packet boundary.
  - If Alejandro chooses `keep_null_audience_no_public_send`, record the no-send
    hold locally.
- `forbidden_scope`:
  - Do not recreate replacement drafts.
  - Do not resend seed/test emails.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - Do not assign any audience, group or segment.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, recipient lists or broad mailbox inspection.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.html`
  - Optional future lane-specific no-live roster/preflight packet under `/Users/alejandrogomez/Documents/Mantis-Reports/`.
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
- `live_gate_status`: All prior compact-footer v2 approvals are consumed.
  Routine seed/test email sends are standing-delegated only under
  `docs/crm-vnext/launch-os-standing-delegation-policy.md`. Public/audience
  sends, MailerLite publish/schedule, audience assignment, subscribers,
  workflows, Shopify and CRM remain closed until a separate exact approval.
- `human_boundary_id`: `mailerlite_footer_compact_v2_pilot_distribution_lane_choice_no_send_inteligencia_descansar`
- `human_boundary_notification_status`: `pending`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Required no-send decision packet evidence is missing or fails validation.
  - Any requested action would resend tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Present the SIBO review packet and ask only for the
  strategy-only no-send lane choice. Do not revisit sends, draft creation,
  inbox QA or public/audience execution.
- `completion_definition`: Alejandro chooses one of the three no-send lanes and
  any resulting local checkpoint preserves all live gates closed.
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-02.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`
- `completion_note`: Alejandro selected
  `keep_null_audience_no_public_send` as the no-send strategy lane. The local
  decision intake is green with `laneDecisionReady=true`,
  `rosterRequiredNext=false`, `canAskFinalSendApprovalNow=false`,
  `liveActionAllowedNow=false`, `wouldAuthorizeSend=false` and
  `blockerCount=0`.
- `next_checkpoint_expected`: `Launch OS v0 compact footer v2 pilot distribution lane choice no-send - 2026-06-02`

## Completed Next Action

- `next_action_id`: `launch_rehearsal_protocol_no_send_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `source_checkpoint`: `Launch OS v0 compact footer v2 pilot distribution lane choice no-send - 2026-06-03`
- `objective`: Prepare a local Launch Rehearsal Protocol for
  `Inteligencia para descansar` so the miniproduct can remain a
  rehearsal/control-plane asset while Launch OS v0 becomes repeatable for future
  microproducts.
- `why_now`: The CEO/SIBO review package is green and Alejandro selected
  `keep_null_audience_no_public_send`. The next useful move is not real-person
  distribution; it is a reusable local protocol for seed-only/internal
  rehearsal, QA review, receipts and next approvals under the standing
  seed-test delegation.
- `allowed_scope`:
  - Use current SIBO review packet, decision intake receipt, standing delegation
    policy and compact-footer v2 evidence.
  - Prepare local JSON/Markdown protocol artifacts only.
  - Define rehearsal stages, allowed seed/internal actions, required evidence,
    stop conditions and next approval boundaries.
  - Keep public/audience sends and live mutations closed.
- `forbidden_scope`:
  - Do not recreate replacement drafts.
  - Do not send or resend test emails from this boundary.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - Do not assign any audience, group or segment.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, recipient lists or broad mailbox inspection.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_protocol_no_send_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_protocol_no_send_current_inteligencia_descansar_2026-06-03.md`
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
- `live_gate_status`: Routine seed/test emails remain standing-delegated only
  under `docs/crm-vnext/launch-os-standing-delegation-policy.md`. Public/
  audience sends, MailerLite publish/schedule, audience assignment, subscribers,
  workflows, Shopify and CRM remain closed until a separate exact approval.
- `human_boundary_id`: `launch_rehearsal_protocol_no_send_inteligencia_descansar`
- `human_boundary_notification_status`: `not_needed`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Required decision-intake or SIBO evidence is missing or fails validation.
  - Any requested action would resend tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Prepare the local Launch Rehearsal Protocol. Do not
  touch live systems, resend tests or ask for public/audience send approval.
- `completion_definition`: A local protocol packet defines how this
  microproduct remains useful for Launch OS v0 rehearsal while all live gates
  remain closed.
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_protocol_no_send_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_protocol_no_send_current_inteligencia_descansar_2026-06-03.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-02.json`
- `completion_note`: The local Launch Rehearsal Protocol is ready with
  `protocolReady=true`, `selectedPilotLane=keep_null_audience_no_public_send`,
  `firstRunCanSendNow=false`,
  `freshPreflightRequiredBeforeAnySeedSend=true`,
  `publicAudienceSendAuthorized=false`, `liveActionAllowedNow=false` and
  `blockerCount=0`.
- `next_checkpoint_expected`: `Launch OS v0 launch rehearsal protocol no-send - 2026-06-03`

## Completed Next Action

- `next_action_id`: `launch_rehearsal_preflight_refresh_seed_delegation_inteligencia_descansar`
- `status`: `completed`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `completed_at`: `2026-06-03`
- `source_checkpoint`: `Launch OS v0 launch rehearsal protocol no-send - 2026-06-03`
- `objective`: Prepare a fresh rehearsal preflight packet for the no-send lane
  before any future delegated seed/internal run.
- `why_now`: The Launch Rehearsal Protocol is green and explicitly says a fresh
  preflight is required before any seed send. The next useful move is to prove
  whether a delegated seed/internal rehearsal run would be safe, not to send it
  yet.
- `allowed_scope`:
  - Read the Launch Rehearsal Protocol, decision intake, SIBO review packet and
    standing delegation policy.
  - Prepare local/read-only preflight evidence for draft state, Null Audience
    exclusivity, `active_count=0`, seed allowlist, placeholder/token/raw URL
    hygiene and negative publish/schedule/workflow/audience-send checks.
  - Use MailerLite API only for read-only preflight/QA if the operator chooses
    to execute this boundary.
  - Generate local preflight receipts.
- `forbidden_scope`:
  - Do not send or resend test emails from this boundary.
  - Do not recreate replacement drafts.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - Do not assign any audience, group or segment.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, recipient lists or broad mailbox inspection.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_preflight_seed_delegation_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_preflight_seed_delegation_current_inteligencia_descansar_2026-06-03.md`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Local-only or read-only preflight commands that do not mutate live systems.
- `validation_commands`:
  - `jq empty <new JSON reports>`
  - `node --check <local report scripts used>`
  - Focused `npx vitest run <relevant specs>` when a script is used.
  - `git diff --check`
- `live_gate_status`: Routine seed/test emails remain standing-delegated only
  after this kind of fresh preflight is green. This boundary itself does not
  send. Public/audience sends, MailerLite publish/schedule, audience assignment,
  subscribers, workflows, Shopify and CRM remain closed until a separate exact
  approval.
- `human_boundary_id`: `launch_rehearsal_preflight_refresh_seed_delegation_inteligencia_descansar`
- `human_boundary_notification_status`: `not_needed`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - Required protocol/decision evidence is missing or fails validation.
  - Any requested action would send tests, publish, schedule, assign a real
    audience, mutate subscribers/workflows, or touch Shopify/CRM/ledgers/cards/
    scoring/Fact Store without a separate exact approval.
- `resume_instruction`: Prepare only the fresh preflight packet. Do not send
  seed tests, publish, schedule, assign audiences or ask for public/audience
  send approval.
- `completion_definition`: A fresh preflight packet states whether a future
  delegated seed/internal rehearsal run is safe, blocked or needs human input.
- `completion_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_preflight_seed_delegation_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_preflight_seed_delegation_current_inteligencia_descansar_2026-06-03.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/launch_os_mantis_digest_launch_rehearsal_preflight_seed_delegation_inteligencia_descansar_2026-06-03.json`
- `completion_note`: Fresh MailerLite API preflight completed in
  `read_only_preflight` mode with `ok=true`, target count `4`, QA green count
  `4`, Null Audience `active_count=0`, blocker count `0`, test emails sent
  `0`, no subscribers read, no audience send, no publish/schedule/workflow and
  no Shopify/CRM/ledger/card/scoring/Fact Store action. The preflight runner's
  legacy status says `ready_for_exact_approval`; for this lane the standing
  delegation policy is the controlling authority when every condition remains
  green.
- `next_checkpoint_expected`: `Launch OS v0 launch rehearsal preflight seed delegation - 2026-06-03`

## Blocked Next Action

- `next_action_id`: `launch_rehearsal_delegated_seed_test_execution_inteligencia_descansar`
- `status`: `blocked`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `blocked_at`: `2026-06-03`
- `source_checkpoint`: `Launch OS v0 launch rehearsal preflight seed delegation - 2026-06-03`
- `objective`: Execute the seed-only/internal rehearsal test send from the four
  compact-footer v2 Null Audience drafts only if the standing-delegation
  conditions still hold.
- `why_now`: The no-send strategy lane is selected and the fresh preflight is
  green. The next useful edge is to rehearse the routine seed-test operation
  under the standing delegation, not to move toward public/audience
  distribution.
- `allowed_scope`:
  - Use the 2026-06-03 preflight receipt as current evidence, or rerun the same
    read-only preflight if freshness becomes unclear.
  - Send only MailerLite test emails from E01-E04 compact-footer v2 Null
    Audience drafts to the approved seed recipient recorded in
    `docs/crm-vnext/launch-os-standing-delegation-policy.md`.
  - Use Computer Use semantic UI controls in Safari for the actual test-send
    operation when Codex is the native operator route.
  - After UI completion, record the result through a local execution receipt.
- `forbidden_scope`:
  - Do not send to a public audience, group, segment or subscriber list.
  - Do not recreate replacement drafts unless a later boundary explicitly says
    to do so.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - Do not assign any audience, group or segment.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No secret reads, env dumps, raw token output, raw private URLs, raw asset
    URLs, broad recipient lists or mailbox inspection.
  - Do not use screenshot/coordinate fallback routes unless Alejandro explicitly
    approves that fallback for this exact operation.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_execution_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_execution_current_inteligencia_descansar_2026-06-03.md`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Read-only MailerLite preflight/QA commands if freshness must be refreshed.
  - Computer Use semantic UI operation for MailerLite test sends, scoped to the
    four E01-E04 drafts and approved seed recipient.
  - Local receipt recording after UI completion.
- `validation_commands`:
  - `jq empty <new JSON reports>`
  - `node --check <local report scripts used>`
  - Focused `npx vitest run <relevant specs>` when a script is changed.
  - `git diff --check`
- `live_gate_status`: Seed/test emails are standing-delegated only inside the
  policy conditions and current green preflight. Public/audience sends,
  MailerLite publish/schedule, audience assignment, subscribers, workflows,
  Shopify and CRM remain closed until a separate exact approval.
- `human_boundary_id`: `launch_rehearsal_delegated_seed_test_execution_inteligencia_descansar`
- `human_boundary_notification_status`: `not_needed`
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - The 2026-06-03 preflight is stale, missing or no longer green.
  - Any draft is no longer draft/test state, no longer Null Audience exclusive,
    has unresolved placeholders/tokens/raw URLs, or is published/scheduled/
    workflow-attached.
  - The Null Audience safety group has active subscribers.
  - The operation would send to anyone outside the approved seed recipient.
  - The UI route requires an unapproved screenshot/coordinate/system fallback.
  - Any requested action would publish, schedule, assign a real audience, mutate
    subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store.
- `resume_instruction`: If freshness remains green and the operator chooses to
  proceed, execute only the delegated E01-E04 seed test via UI/Computer Use and
  record a local execution receipt. Stop on any QA or UI-route blocker.
- `completion_definition`: Four seed-only MailerLite test emails are sent to
  the approved seed recipient under the standing delegation and recorded in a
  local execution receipt, with public/audience and live mutation gates still
  closed.
- `blocked_reason`: This Codex session does not expose a Computer Use semantic
  UI tool. The only discovered browser automation route was `node_repl`/
  Playwright-style browser control, which is not the active Safari/Computer Use
  route and is not approved as a fallback for this exact operation.
- `blocked_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_ui_route_blocker_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_ui_route_blocker_current_inteligencia_descansar_2026-06-03.md`
- `blocked_note`: Fresh preflight remains green in the blocker evidence
  (`targetCount=4`, `qaGreenCount=4`, Null Audience `active_count=0`,
  `blockerCount=0`), but the send was not attempted. Test emails sent by this
  boundary: `0`.
- `next_checkpoint_expected`: `Launch OS v0 launch rehearsal delegated seed test execution - 2026-06-03`

## Active Next Action

- `next_action_id`: `launch_rehearsal_delegated_seed_test_route_unblock_inteligencia_descansar`
- `status`: `active`
- `created_at`: `2026-06-03`
- `updated_at`: `2026-06-03`
- `source_checkpoint`: `Launch OS v0 launch rehearsal delegated seed test UI route blocker - 2026-06-03`
- `objective`: Unblock the same delegated E01-E04 seed-test operation by using
  a session with Computer Use semantic UI available, or by obtaining a fresh
  scope-specific fallback approval from Alejandro.
- `why_now`: The QA/preflight gate is green and the standing delegation applies,
  but the required UI operator route is unavailable in the current session. The
  next useful move is not new infrastructure or public distribution; it is
  route availability or a clear fallback-route decision.
- `allowed_scope`:
  - Reuse or refresh the read-only MailerLite preflight if freshness is unclear.
  - If Computer Use semantic UI is available, execute only E01-E04 test sends
    to the approved seed recipient and record a local execution receipt.
  - If Computer Use is not available, request or wait for a scope-specific
    fallback route authorization instead of improvising. This is not a new
    seed-send approval; the seed-send operation remains standing-delegated when
    QA is green.
- `forbidden_scope`:
  - Do not send to a public audience, group, segment or subscriber list.
  - Do not recreate replacement drafts.
  - Do not ask for or execute public/audience-send approval from this boundary.
  - Do not assign any audience, group or segment.
  - No MailerLite publish, schedule, non-null group/segment/subscriber/workflow
    mutation or automation action.
  - No Shopify mutation, publish, theme push, live form wiring, public
    navigation or SEO promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - Do not use Browser/Playwright, DOM, AppleScript, screenshot, coordinate or
    system-click fallback routes unless Alejandro explicitly approves that
    fallback for this exact operation.
- `expected_files`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_execution_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_execution_current_inteligencia_descansar_2026-06-03.md`
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - Read-only local file/report inspection.
  - Read-only MailerLite preflight/QA commands if freshness must be refreshed.
  - Computer Use semantic UI operation for MailerLite test sends, scoped to the
    four E01-E04 drafts and approved seed recipient.
  - Local receipt recording after valid UI completion.
- `validation_commands`:
  - `jq empty <new JSON reports>`
  - `node --check <local report scripts used>`
  - Focused `npx vitest run <relevant specs>` when a script is changed.
  - `git diff --check`
- `live_gate_status`: Seed/test emails remain standing-delegated only inside the
  policy conditions and fresh green preflight. Public/audience sends,
  MailerLite publish/schedule, audience assignment, subscribers, workflows,
  Shopify and CRM remain closed until a separate exact approval.
- `human_boundary_id`: `launch_rehearsal_delegated_seed_test_route_unblock_inteligencia_descansar`
- `human_boundary_notification_status`: `sent`
- `human_boundary_notification_evidence`:
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_route_unblock_request_current_inteligencia_descansar_2026-06-03.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_launch_rehearsal_delegated_seed_test_route_unblock_request_current_inteligencia_descansar_2026-06-03.md`
- `human_boundary_notification_note`: The unblock request was prepared for the
  Codex thread, not sent via Telegram or email. It gives two choices: resume in
  a Computer Use-capable session, or authorize the scope-specific
  Browser/Playwright semantic fallback route. The fallback phrase authorizes
  only the UI-control route, not a new seed-send approval.
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected.
  - The preflight is stale, missing or no longer green.
  - Computer Use remains unavailable and no explicit fallback route
    authorization is provided.
  - The operation would send to anyone outside the approved seed recipient.
  - Any requested action would publish, schedule, assign a real audience, mutate
    subscribers/workflows, or touch Shopify/CRM/ledgers/cards/scoring/Fact
    Store.
- `resume_instruction`: Do not spend a long run rediscovering the same UI-route
  limitation. If Computer Use is available, proceed through the delegated
  seed-test route after freshness QA. If it is not available, stop and ask for
  either a Computer Use-capable session or explicit fallback route
  authorization.
- `completion_definition`: Either the E01-E04 delegated seed-test execution is
  completed and locally receipted, or Alejandro has made a clear fallback
  decision for this exact operation.
- `next_checkpoint_expected`: `Launch OS v0 launch rehearsal delegated seed test route unblock - 2026-06-03`

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
