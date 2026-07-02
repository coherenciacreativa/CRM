# CRM Core Integration Queue v0

Date: 2026-06-29
Status: central integration queue

This queue tracks lane outputs that may enter the central integration branch.
It does not authorize execution, source access, private artifact inspection,
CRM writes, source mutations, or Launch OS work.

## Pending Integration

No lane outputs pending at creation.

## In Review

No lane outputs in review at creation.

## Merged / Closed

### parallel_lane_bootstrap_2026-06-29

- `source_workstream`: `integration`
- `source_branch`: `codex/crm-core-reentry`
- `commits`: pending
- `files_changed`: board, integration queue, first three workstream files,
  next-action
- `summary`: bootstrapped first three parallel workstream branches/worktrees
- `tests_or_checks`: `git diff --check`, `git worktree list`
- `private_artifacts_touched`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: first lane task prompts / consultant chat setup
- `integration_recommendation`: commit bootstrap docs, then create first three
  consultant chats and issue lane-specific prompts

### first_parallel_lane_artifact_batch_2026-07-01

- `source_workstream`: `integration`
- `source_branch`: `codex/crm-core-reentry`
- `merged_source_branches`:
  - `codex/crm-core-mailerlite-onboarding`
  - `codex/crm-core-instagram-api`
  - `codex/crm-core-welcome-audio`
- `commits`:
  - `69f84fadc321065b2e16ecc3295627ca12514154`
  - `4183dc6942c4c5dad0a211a86b00b9c2388d0cc4`
  - `c99fb3ce3eab0bbf828eabf399af3a030a4ee93d`
  - `dc75ef680117a960a9cc9c259176046c6f5fb5eb`
  - `e4cf1f4968a3522de70987b15b414ce1bfeb55e6`
  - `b3a72bf2b75f76910f062f90d9092f9a7e44d4da`
- `files_changed`:
  - `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md`
  - `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`
  - `docs/crm-vnext/workstreams/mailerlite-onboarding.md`
  - `docs/crm-vnext/instagram-crm-prior-art-inventory-v0.md`
  - `docs/crm-vnext/instagram-meta-api-setup-decision-packet-v0.md`
  - `docs/crm-vnext/workstreams/instagram-api-readiness.md`
  - `docs/crm-vnext/instagram-welcome-audio-send-boundary-v0.md`
  - `docs/crm-vnext/workstreams/welcome-audio-send-boundary.md`
  - `docs/crm-vnext/crm-core-workstream-board-v0.md`
  - `docs/crm-vnext/crm-core-integration-queue-v0.md`
  - `docs/crm-vnext/crm-core-next-action.md`
- `summary`: integrated first parallel lane artifact batch: MailerLite
  onboarding setup inventory packet/questionnaire, Instagram API setup
  decision/prior-art inventory, and Welcome Audio send boundary.
- `tests_or_checks`: `git diff --check`
- `private_artifacts_touched`: false
- `source_actions_executed`: false
- `central_files_requested`: true
- `conflicts_expected`: none
- `decision_needed`: choose next lane approvals after first parallel artifacts
- `integration_recommendation`: central review of next lane approvals; no
  execution

## Rejected / Needs Rework

No lane outputs rejected at creation.

## CEO Decision Required

Decision required: review integrated first lane artifacts and choose next safe
lane approvals for:

- `mailerlite-onboarding`
- `instagram-api-readiness`
- `welcome-audio-send-boundary`

## Queue Item Template

```md
## <item_id>

- `source_workstream`:
- `source_branch`:
- `commits`:
- `files_changed`:
- `summary`:
- `tests_or_checks`:
- `private_artifacts_touched`:
- `source_actions_executed`:
- `central_files_requested`:
- `conflicts_expected`:
- `decision_needed`:
- `integration_recommendation`:
```

## Intake Rules

- Do not accept lane output unless branch, changed files, and scope match the
  lane status file.
- Reject any output that commits private artifacts or redacted report files.
- Reject any output that executed a source action without exact approval.
- Escalate central-file changes to the Chief Architect / Integration Chat.
