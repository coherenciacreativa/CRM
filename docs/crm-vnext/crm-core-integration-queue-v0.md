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

No parallel-lane outputs merged at creation.

## Rejected / Needs Rework

No lane outputs rejected at creation.

## CEO Decision Required

Initial decision required: approve, decline, or modify the first parallel
workstream bootstrap for:

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
