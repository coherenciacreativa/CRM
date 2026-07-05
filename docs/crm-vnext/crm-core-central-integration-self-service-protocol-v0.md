# CRM Core Central Integration Self-Service Protocol v0

Date: 2026-07-05
Status: no-run central protocol

## Purpose

Define how a CRM Core lane Codex worker may, in the future, temporarily assume
the Central Integration Worker role for guarded docs-only central integration
after lane-local work is complete and reviewed.

This protocol is designed to reduce Alejandro relay load while preserving
central safety, single-threaded integration, source/action gates, storage
boundaries, and Chief Architect oversight.

This protocol does not authorize any live source action, API, UI/source
browsing, Instagram action, DM opening, welcome audio send, MailerLite/Gmail
access, private artifact inspection, candidate queue generation, CRM/source
write, Launch OS work, Mantis memory write, or `/Users/alejandrogomez/CRM` use.

## Roles

### Lane Codex Worker

Owns lane-local docs-only work inside a lane worktree.

May:

- execute lane-local docs-only tasks approved by lane consultant;
- commit/push lane-local docs-only artifacts when lane consultant returns
  `green_to_commit_later` and `safe_to_commit_later=true`;
- prepare a central integration packet after lane commit/push;
- ask Chief Architect Integration Consultant for integration review;
- temporarily assume Central Integration Worker role only after this
  protocol's gates pass.

May not:

- edit central coordination files during lane sprint;
- self-integrate without Chief Architect Integration Consultant green;
- integrate source/live actions;
- integrate private artifacts;
- touch `/Users/alejandrogomez/CRM`;
- touch Launch OS docs.

### Lane Consultant

Owns lane-specific scope review.

May:

- approve lane-local docs-only task execution;
- approve one mechanical docs-only fix;
- approve lane-local commit/push.

May not:

- authorize central integration;
- authorize source actions;
- authorize APIs;
- authorize private artifact inspection;
- authorize CRM/source writes.

### Chief Architect Integration Consultant

Target id:

```text
chief-architect-integration
```

Target registry path label:

```text
/Users/alejandrogomez/Documents/CRM-Core-Private-Artifacts/consultant-relay/consultant-target-registry-v0.json
```

Role:

- reviews integration packets;
- decides whether a lane Codex may self-integrate centrally;
- identifies required central files and active-next-action recommendation;
- returns one of:
  - `green_to_self_integrate`
  - `central_decision_needed`
  - `ceo_decision_needed`
  - `needs_integration_packet_fix`
  - `hold`

May not:

- authorize source actions;
- authorize live API/UI execution;
- authorize private artifact inspection;
- authorize candidate queue generation;
- authorize welcome audio send;
- authorize MailerLite/Gmail mutation;
- authorize CRM/source writes;
- authorize `/Users/alejandrogomez/CRM` use.

### Central Integration Worker

A role, not necessarily a separate Codex window.

May be temporarily assumed by a lane Codex only after:

- lane work is committed and pushed;
- lane consultant verdict is green;
- Chief Architect Integration Consultant returns `green_to_self_integrate`;
- central integration lock exists and is acquired, once implemented;
- central worktree is clean;
- branch/file-scope checks pass.

Owns:

- merging approved lane branch into `codex/crm-core-reentry`;
- updating workstream board;
- updating integration queue;
- updating `crm-core-next-action`;
- updating integration workstream status;
- updating proof/protocol docs only when Chief Architect explicitly recommends
  it;
- pushing central branch;
- fast-forwarding lanes after central push.

### Alejandro / CEO

Required for:

- source actions;
- APIs;
- Instagram UI/source execution;
- DMs;
- welcome audio send;
- candidate queue generation;
- private artifact inspection;
- MailerLite mutation;
- Gmail access beyond approved metadata boundaries;
- CRM/source writes;
- new storage/memory policy changes;
- ambiguous conflicts;
- any source/live/private-data boundary.

## Central Integration Eligibility Levels

### Level 0 - No Self-Integration

Use when:

- source/live action occurred;
- private artifact inspection occurred;
- candidate queue generation occurred;
- CRM/source write occurred;
- lane modified central files;
- lane changed scripts/tests/package files;
- artifact affects multiple lanes ambiguously;
- approval phrase changed;
- next action recommendation is unclear;
- merge conflict expected;
- branch or worktree dirty;
- private artifacts or reports appear in diff;
- raw target URL or lock owner token appears in output;
- Chief Architect says `hold`, `central_decision_needed`,
  `ceo_decision_needed`, or `needs_integration_packet_fix`.

### Level 1 - Self-Integration Eligible Docs-Only Lane Artifact

Allowed only for:

- lane-owned docs-only artifacts;
- no-run designs;
- lane status file updates;
- no scripts/tests/package changes;
- no central files modified by lane;
- lane consultant `green_to_commit_later`;
- source branch pushed;
- no private artifacts integrated;
- no source actions;
- no private artifact inspection except explicit target registry for relay;
- no CRM/source writes.

Requires Chief Architect Integration Consultant verdict:

```text
green_to_self_integrate
```

### Level 2 - Chief Architect Required, Self-Integration Possible After Review

Use when:

- artifact updates proof plan;
- artifact changes cross-lane interface;
- artifact affects active next action;
- artifact affects storage/operator boundary;
- artifact affects relay protocol;
- artifact changes approval phrase templates;
- artifact changes workstream state in a non-routine way.

Chief Architect may still return `green_to_self_integrate` with exact central
update instructions.

### Level 3 - Alejandro Required

Use when:

- execution is proposed;
- source/private data is involved;
- real-world send/write/mutation could happen;
- approval phrase or CEO fact is needed;
- operational risk is unclear.

## Required Integration Packet To Chief Architect

Required packet fields:

- `packet_id`
- `expected_consultant_id: chief-architect-integration`
- `source_workstream`
- `source_branch`
- `source_worktree`
- `source_commit_sha`
- `lane_consultant_verdict`
- `lane_consultant_safe_to_commit`
- `files_changed`
- `central_files_modified_in_lane: true/false`
- `source_execution: true/false`
- `private_artifacts_touched: true/false`
- `private_artifacts_integrated: true/false`
- `used_crm_core_reports: true/false`
- `used_mantis_reports: true/false`
- `used_mantis_memory: true/false`
- `raw_target_url_printed: true/false`
- `owner_token_recorded_in_receipt: true/false`
- `git_diff_check_result`
- `artifact_summary`
- `integration_note`
- `proposed_central_updates`
- `proposed_active_next_action`
- `blockers`
- `recommended_next_step`
- `required_response_format`
- `sentinel`

Required sentinel:

```text
CHIEF_ARCHITECT_INTEGRATION_REVIEW_COMPLETE
```

## Chief Architect Response Schema

Required response format:

```text
packet_id:
consultant_id: chief-architect-integration
chief_architect_verdict: green_to_self_integrate | central_decision_needed | ceo_decision_needed | needs_integration_packet_fix | hold
reason:
required_integration_fix:
safe_to_self_integrate_now: true | false
central_files_allowed:
active_next_action_recommendation:
proof_or_workstream_update_recommendation:
risk_notes:
forbidden_scope_concerns:
ceo_decision_needed: true | false
recommended_next_step:
CHIEF_ARCHITECT_INTEGRATION_REVIEW_COMPLETE
```

No self-integration may proceed unless:

- `consultant_id` is `chief-architect-integration`;
- verdict is `green_to_self_integrate`;
- `safe_to_self_integrate_now=true`;
- `ceo_decision_needed=false`;
- sentinel is present.

## Central Integration Lock Requirement

Central integration is single-threaded.

Future self-integration requires a Central Integration Lock v0 before any lane
Codex may:

- enter `/Users/alejandrogomez/CRM-core` for central integration role;
- fetch/merge lane branch into `codex/crm-core-reentry`;
- edit central coordination files;
- commit central integration;
- push central branch;
- fast-forward lane branches.

Preferred future lock path:

```text
/Users/alejandrogomez/Documents/CRM-Core-Reports/central-integration/.central-integration-lock
```

This protocol does not create the lock utility.

Until Central Integration Lock v0 exists, self-integration remains
protocol-designed but not fully enabled.

Interim rule:

- A lane may ask Chief Architect for a self-integration verdict.
- A lane must not perform autonomous central self-integration until the central
  integration lock utility/protocol is committed or Alejandro explicitly
  approves a one-off central integration without lock.

Central lock metadata must never include:

- raw target URLs;
- private artifacts;
- private identities;
- lock owner token;
- secrets;
- source data;
- Mantis memory content.

## Self-Integration Runbook

These steps are future/conditional until Central Integration Lock v0 exists.

1. Lane Codex verifies lane branch/worktree clean.
2. Lane Codex verifies lane commit pushed.
3. Lane Codex prepares integration packet.
4. Lane Codex uses Consultant Relay Lock v0 to ask Chief Architect Integration
   Consultant.
5. Lane Codex validates Chief Architect response.
6. If `green_to_self_integrate` and central lock exists:
   - acquire Central Integration Lock v0;
   - switch/operate in `/Users/alejandrogomez/CRM-core` only;
   - verify branch `codex/crm-core-reentry`;
   - verify central clean;
   - fetch only source branch;
   - verify source commit/file scope;
   - merge source branch;
   - update only allowed central files;
   - run `git diff --check`;
   - run raw target URL and owner token grep checks;
   - commit central integration;
   - push central branch;
   - fast-forward clean lane branches;
   - release central lock;
   - report.
7. If any check fails:
   - release central lock if held;
   - stop and report.

## Standard Central Files

Routine central integration may update:

- `docs/crm-vnext/crm-core-next-action.md`
- `docs/crm-vnext/crm-core-workstream-board-v0.md`
- `docs/crm-vnext/crm-core-integration-queue-v0.md`
- `docs/crm-vnext/workstreams/integration.md`

Proof-specific central integration may update only when relevant and
recommended:

- `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`

Protocol-specific integration may update only when relevant and approved:

- `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
- `docs/crm-vnext/crm-core-storage-and-mantis-operator-boundary-policy-v0.md`
- `docs/crm-vnext/crm-core-central-integration-self-service-protocol-v0.md`

## Mandatory Checks

Before central commit:

- pwd is `/Users/alejandrogomez/CRM-core`
- branch is `codex/crm-core-reentry`
- git status clean before merge
- source branch and commit explicit
- source branch diff contains only expected files
- no private artifacts/reports in diff
- no CRM-Core-Reports files in repo
- no CRM-Core-Private-Artifacts files in repo
- no Mantis-Reports files in repo
- no Mantis-Private-Source-Artifacts files in repo
- no raw ChatGPT target URL in staged diff
- no lock owner token in staged diff
- `git diff --check` passes
- central commit message matches integration
- no source/live execution

## Forbidden Scope

Self-service central integration may never authorize or perform:

- APIs;
- UI source browsing;
- Instagram actions;
- Meta Business Suite;
- app configuration;
- webhook setup;
- DMs;
- welcome audio;
- candidate queue generation;
- MailerLite/Gmail access or mutation;
- private artifact inspection;
- CRM/source writes;
- Launch OS docs;
- Mantis memory writes;
- OpenClaw/Mantis workspace use;
- `/Users/alejandrogomez/CRM`.

## Conflict Handling

Stop and report if:

- merge conflict occurs;
- central worktree dirty;
- lane branch dirty;
- unexpected files changed;
- central files modified in lane;
- raw target URL found;
- owner token found;
- private artifacts/reports staged;
- active next action ambiguous;
- Chief Architect response missing sentinel;
- Chief Architect says `central_decision_needed`, `ceo_decision_needed`,
  `needs_integration_packet_fix`, or `hold`;
- central lock unavailable or stale;
- any execution/source boundary appears.

## Final Report Schema

Self-service central integration closeout must return:

- central branch
- central commit SHA
- source branch
- source commit SHA
- Chief Architect verdict
- central lock acquired/released
- files integrated
- central files updated
- raw target URL check result
- owner token check result
- `git diff --check` result
- lane branch head SHAs after fast-forward
- active next action
- used_crm_core_reports
- used_mantis_reports
- used_mantis_memory
- private_artifacts_integrated
- source_actions_executed
- CRM/source writes
- Launch OS touched
- `/Users/alejandrogomez/CRM` used
- next recommended step

## Initial Use Cases

Allowed after central lock exists:

- docs-only lane artifacts;
- no-run designs;
- lane-owned workstream status updates;
- proof-plan result integration;
- integration queue/board/next-action updates.

Not allowed initially:

- source/live action results;
- private artifact queue results;
- actual candidate queue generation;
- actual welcome audio send;
- MailerLite mutations;
- CRM writes;
- script/test/package changes from lane work unless separately approved.

## Completion Boundary

Complete when CRM Core has a documented self-service central integration
protocol that defines roles, eligibility, Chief Architect relay, central lock
requirement, integration packet schema, green criteria, runbook, mandatory
checks, stop conditions, and final closeout format without enabling
uncontrolled central writes.
