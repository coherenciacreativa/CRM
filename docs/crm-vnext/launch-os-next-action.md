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

## Active Next Action

- `next_action_id`: `asset_destination_readiness_inteligencia_descansar`
- `status`: `active`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `source_checkpoint`: `Launch OS v0 mini-launch footer reason canon checkpoint - 2026-06-02`
- `objective`: Review and repair the preview destination experience for
  `Inteligencia para descansar` before creating any new MailerLite replacement
  drafts.
- `why_now`: Email rendering is now locally green, but Alejandro observed that
  earlier CTA destinations still contained visible placeholders. The next
  useful pilot milestone is a complete CEO-review package: emails plus
  destination assets that deliver real value.
- `allowed_scope`:
  - Read the current Control Room, this contract, git status and directly
    related local reports.
  - Inspect local-only/no-live Shopify preview route evidence and local Shopify
    repo files for the three mini-launch destinations: result/resource page,
    practice section and editorial note section.
  - Prepare local-only repairs for placeholder text, incomplete copy, broken
    internal links, SEO noindex/unlisted posture, mobile/desktop readability and
    value clarity, when those repairs stay local/no-live and do not require API
    calls or publication.
  - Generate or refresh local-only QA evidence and reports when scripts declare
    no live APIs, no sends and no mutations.
  - Update this contract and the Control Room with the resulting checkpoint.
- `forbidden_scope`:
  - No MailerLite draft creation, edit, send, publish, schedule or audience
    action.
  - No Shopify publish, theme push, live form wiring, Shopify API mutation or
    navigation/SEO public promotion.
  - No CRM live API calls, ledgers, cards, scoring or Fact Store writes.
  - No subscriber, group, segment, workflow or automation mutation.
  - No secret reads, env dumps, raw token output, raw private URLs or recipient
    lists.
  - No broad architecture rewrite and no autonomous weekly proposal engine build
    in this next action.
- `expected_files`:
  - `docs/crm-vnext/launch-os-next-action.md`
  - `docs/crm-vnext/mailerlite-launch-os-v0-control-room.md`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json`
  - `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_footer_reason_canon_inteligencia_descansar_2026-06-02.json`
  - Local Shopify preview route files identified from the preview-route receipt
    or Shopify repo inspection.
- `allowed_commands`:
  - `git status --short`
  - `git diff --stat`
  - `rg`, `sed`, `ls`, `find` and read-only local file inspection.
  - `node --check` for touched scripts, if any.
  - Focused local tests for touched scripts, if any.
  - Local-only report generators after confirming their help/source declares no
    live APIs, no sends and no mutations.
- `validation_commands`:
  - `git diff --check`
  - Focused checks/tests for any touched local asset or QA script.
  - Browser/preview QA for local or preview URLs only when it does not publish,
    submit forms, send emails or mutate live systems.
- `live_gate_status`: closed. This action does not authorize any live
  MailerLite, Shopify, CRM, subscriber, group, workflow, campaign, send, ledger,
  card, scoring or Fact Store mutation.
- `stop_conditions`:
  - Newer user instruction supersedes this contract.
  - Git state is unexpected or includes unrelated dirty files that affect the
    target files.
  - Required preview-route evidence is missing, stale or contradicts the Control
    Room.
  - Any repair requires live Shopify/MailerLite/CRM access, publication, live
    forms, real subscribers or real sends.
  - Local QA cannot prove that destination placeholders are gone.
  - The Control Room or current-state refresh says the phase changed.
  - The active `next_action_id` is already completed.
- `resume_instruction`: Continue with Asset Destination Readiness for
  `Inteligencia para descansar`: inspect the three preview destinations, repair
  visible placeholders and incomplete local asset copy if safely local-only, then
  generate local QA evidence. Do not create or edit MailerLite drafts until this
  next action is completed and Alejandro gives a separate exact approval.
- `completion_definition`: The three preview destinations have no visible
  placeholders, no raw internal tokens, coherent final-ish copy, working CTA
  paths, noindex/unlisted posture preserved, and local QA evidence is recorded.
- `next_checkpoint_expected`: `Launch OS v0 asset destination readiness checkpoint - 2026-06-02`

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
