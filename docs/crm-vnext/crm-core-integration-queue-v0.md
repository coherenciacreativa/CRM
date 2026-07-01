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

## Rejected / Needs Rework

No lane outputs rejected at creation.

## CEO Decision Required

Decision required: approve, decline, or modify the first lane-specific prompts
and consultant chat setup for:

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
