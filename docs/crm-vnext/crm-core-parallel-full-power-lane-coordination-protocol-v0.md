# CRM Core Parallel Full-Power Lane Coordination Protocol v0

Date: 2026-07-05
Status: no-run central coordination protocol

## Purpose

Define how CRM Core may run multiple Codex lane workers in parallel while
preserving consultant relay safety, central integration single-threading, Chief
Architect oversight, source/action gates, and active-next-action coherence.

This protocol is designed to reduce Alejandro relay load while preventing
parallel lanes from producing stale, conflicting, or semantically inconsistent
central integrations.

This protocol does not authorize source actions, APIs, Instagram UI/source
execution, DM opening, welcome audio send, reply monitoring execution,
MailerLite/Gmail access, MailerLite mutation, private artifact inspection,
candidate queue generation, CRM/source writes, Launch OS work, Mantis memory
writes, OpenClaw/Mantis workspace use, or `/Users/alejandrogomez/CRM` use.

## Evidence From First Parallel Test

### MailerLite Full Self-Integration Worker

- `final_state`: `completed_and_integrated`
- `lane_branch`: `codex/crm-core-mailerlite-onboarding`
- `lane_commit_sha`: `a243b3c55d5062842970c775495970e281bbdba1`
- `central_final_commit_sha`: `ee6569a436ad9ee4de8bc02fdc503f95f8d72b31`
- `active_next_action_after_integration`:
  `crm_core_controlled_welcome_flow_after_mailerlite_payload_preview_next_step_selection_v0`
- `consultant_relay_lock_used`: `true`
- `central_integration_lock_used`: `true`
- `mailerlite_api_called`: `false`
- `mailerlite_ui_used`: `false`
- `mailerlite_mutation`: `false`
- `real_private_payload_prepared`: `false`
- `source_actions_executed`: `false`

### Welcome Audio Parallel Lane-Local-Only Worker

- `final_state`: `blocked_needs_task_packet_fix`
- `worktree`:
  `/Users/alejandrogomez/CRM-core-welcome-audio-assistant-reply-parallel`
- `branch`:
  `codex/crm-core-welcome-audio-assistant-reply-policy-parallel`
- `base_commit_sha`: `704c888270e5216dd0f2547c9925e40e6d3bdc89`
- `lane_commit_sha`: `none`
- `target_handshake`: `target_confirmed`
- `task_packet_review`: `needs_task_packet_fix`
- `repo_files_changed`: `none`
- `central_integration_attempted`: `false`
- `central_lock_acquired`: `false`
- `consultant_relay_lock_used`: `true`
- `lock_acquired_count`: `5`
- `lock_released_count`: `5`
- `stale_lock_detected`: `false`
- `canonical_lane_worktrees_edited`: `false`
- `blocker`: Welcome Audio consultant required task-packet fixes before
  execution.

## Interpretation

- This was not a failure of parallelism.
- The Consultant Relay Lock successfully serialized Chrome/clipboard critical
  sections.
- The Central Integration Lock successfully protected central integration.
- The Welcome Audio lane correctly stopped before repo edits when its task
  packet was insufficient.
- The parallel branch became stale because central advanced while it was
  running.
- Full-power parallel mode requires freshness and conflict rules beyond locks.

## Parallelism Levels

### Level P0 - Single Lane

One lane active.

### Level P1 - One Full Loop Plus One Lane-Local-Only Parallel Worker

Allowed now.

Rules:

- one lane may run full self-integration;
- one or more other lanes may prepare lane-local docs only;
- non-full lanes may commit/push to dedicated parallel branches only;
- non-full lanes must not ask Chief Architect or acquire Central Integration
  Lock unless separately approved.

### Level P2 - Multiple Full Loops, Serialized Central Integration

Allowed only after this protocol is committed and after Alejandro approves a
specific multi-lane full-power pilot.

Rules:

- multiple lanes may talk to consultants and produce lane-local artifacts in
  parallel;
- Consultant Relay Lock serializes UI relay critical sections;
- Central Integration Lock serializes central integration runs;
- every lane must revalidate latest central before Chief Architect review and
  after acquiring Central Integration Lock;
- if central changed after Chief Architect green, fresh Chief Architect review
  is required unless the Chief Architect response explicitly pre-authorized
  integration across that specific central change window.

### Level P3 - Source/Live Parallelism

Not allowed.

Source/live/private/action/write steps remain separately approval-gated and
should remain single-threaded unless a future explicit source-operation
protocol says otherwise.

## Canonical Branch Modes

### Canonical Lane Branch Mode

Use when lane is expected to self-integrate soon.

Requirements:

- lane starts from latest `origin/codex/crm-core-reentry`;
- lane worktree is clean;
- lane branch is canonical:
  - `codex/crm-core-welcome-audio`
  - `codex/crm-core-instagram-api`
  - `codex/crm-core-mailerlite-onboarding`
- branch must be fast-forward aligned before task starts;
- if central advances before Chief Architect review, lane must refresh context
  and ask Chief Architect with current central HEAD.

### Temporary Parallel Branch Mode

Use when another lane may be doing full self-integration.

Requirements:

- create dedicated worktree and branch;
- branch name must include source lane and purpose;
- do not edit canonical lane worktree;
- do not fast-forward canonical lane branches;
- stop after lane-local commit/push unless separately approved;
- if later integrating, rebase/merge/refresh from current central and request
  fresh Chief Architect review.

## Freshness Tokens

Every parallel lane packet must include:

- `central_head_at_lane_start`
- `central_head_at_task_packet`
- `central_head_at_artifact_review`
- `central_head_at_lane_commit`
- `central_head_at_chief_architect_packet`
- `central_head_at_central_lock_acquire`, if central integration is attempted
- `active_next_action_at_lane_start`
- `active_next_action_at_chief_architect_packet`
- `active_next_action_at_central_lock_acquire`, if central integration is
  attempted

Rules:

- If `central_head_at_lane_start` differs from latest
  `origin/codex/crm-core-reentry` before artifact authoring, refresh context.
- If central changed between task packet approval and artifact review, include
  a `central_changed_during_lane` flag in the artifact review packet.
- If central changed after Chief Architect green and before Central Integration
  Lock acquisition, request fresh Chief Architect review.
- If active next action changed in a way that affects the artifact's
  integration recommendation, request fresh Chief Architect review.
- If unsure, stop and report `central_freshness_decision_needed`.

## Task Packet Minimum For Parallel Lanes

Every parallel-lane task packet must include:

- controlling artifacts list;
- latest central commit observed;
- active next action observed;
- storage policy statement;
- no-real-state creation statement;
- source/action closed gates;
- identity disclosure guardrails where assistant/Mantis/Mati behavior is
  involved;
- business eligibility carry-forward where follower eligibility is mentioned:
  every confirmed new Instagram follower may be business-eligible, but
  eligibility is not candidate queue permission, send permission, reply
  permission, MailerLite permission, or CRM write permission;
- separate approval boundaries;
- parallel-lane conflict guardrail;
- no commit/push until artifact-review green;
- validation and closeout requirements.

## Controlling Artifacts

For Controlled Welcome Flow proof work, task packets should explicitly
reference relevant controlling artifacts, if present:

- `docs/crm-vnext/crm-core-controlled-welcome-flow-proof-plan-v0.md`
- `docs/crm-vnext/crm-core-storage-and-mantis-operator-boundary-policy-v0.md`
- `docs/crm-vnext/crm-core-consultant-ui-relay-autonomous-sprint-protocol-v0.md`
- `docs/crm-vnext/crm-core-central-integration-self-service-protocol-v0.md`
- `docs/crm-vnext/instagram-controlled-new-follower-evidence-packet-design-v0.md`
- `docs/crm-vnext/instagram-welcome-audio-controlled-candidate-queue-and-sandbox-send-approval-packet-design-v0.md`
- `docs/crm-vnext/instagram-reply-monitoring-email-handoff-boundary-design-v0.md`
- `docs/crm-vnext/mailerlite-onboarding-no-write-payload-preview-alignment-v0.md`
- lane-specific workstream status file.

## Parallel Conflict Guardrail

A parallel lane must stop or request review if:

- its base commit is behind latest central and it has not refreshed context;
- central active next action changed after lane start;
- another lane integrated a proof step that affects the artifact;
- controlling artifacts changed after task packet approval;
- the lane wants to use canonical branch while another worker may fast-forward
  it;
- the lane wants central integration from a temporary branch without fresh
  Chief Architect review;
- any source/action/private/write boundary appears.

## Chief Architect Fresh Verdict Rule

Chief Architect integration packet must include:

- `central_head_at_chief_architect_packet`
- `active_next_action_at_chief_architect_packet`
- whether central changed during lane work;
- whether controlling artifacts changed;
- whether temporary parallel branch or canonical lane branch was used;
- proposed integration order if multiple branches are ready;
- whether a fresh review is needed because central changed.

If central changes before the lane acquires Central Integration Lock, the lane
must either:

1. ask Chief Architect for fresh integration review, or
2. stop with `chief_architect_fresh_review_needed`.

## Central Lock Revalidation Rule

After acquiring Central Integration Lock, before merge:

1. fetch `origin/codex/crm-core-reentry`;
2. verify current central HEAD;
3. verify active next action;
4. compare to Chief Architect packet values;
5. if changed in a material way, release lock and request fresh Chief Architect
   review;
6. if unchanged or explicitly pre-authorized, proceed.

## Integration Queue Fan-In

Multiple lanes may produce ready branches.

Central integrations must be processed one at a time.

If multiple ready branches exist, Chief Architect should recommend order based
on:

- active next action;
- proof sequence;
- dependency order;
- stale base risk;
- scope risk;
- whether branch is canonical or temporary;
- whether central updates are routine or non-routine.

## Temporary Branch Integration Rule

A temporary parallel branch may be integrated only if:

- it is docs-only;
- it has lane consultant green;
- it has been refreshed against latest central or its diff is verified safe;
- Chief Architect returns `green_to_self_integrate` specifically for that
  temporary branch;
- Central Integration Lock is acquired;
- file scope is exact;
- active next action compatibility is verified.

After temporary branch integration, canonical lane branches may be
fast-forwarded to central if clean.

## Closeout Schema For Parallel Lanes

Every parallel lane closeout must report:

- `final_state`
- `worktree_path`
- `branch`
- `branch_mode`: `canonical` | `temporary_parallel`
- `base_commit_sha`
- `latest_central_sha_observed`
- `active_next_action_observed`
- `lane_commit_sha`
- `consultant_verdicts_by_cycle`
- `central_changed_during_lane`: `true` | `false`
- `controlling_artifacts_changed`: `true` | `false` | `unknown`
- `mechanical_fix_cycles_used`
- `files_changed`
- `git_diff_check_result`
- `pushed_branch`
- `used_consultant_relay_lock`
- `capture_method`
- `copy_button_used`
- `copied_latest_assistant_message`
- `generation_complete_before_copy`
- `field_presence_map`
- `sentinel_presence_map`
- `parser_error_code`
- `reformat_request_used`
- `copied_message_relative_position`
- `lock_acquired_count`
- `lock_released_count`
- `stale_lock_detected`
- `owner_token_recorded_in_receipt`: `false`
- `used_crm_core_reports`
- `used_mantis_reports`: `false`
- `used_mantis_memory`: `false`
- `private_artifacts_integrated`: `false`
- `source_actions_executed`: `false`
- `central_integration_attempted`: `true` | `false`
- `central_lock_acquired`: `true` | `false`
- `chief_architect_verdict`, if any
- `active_next_action_after_integration`, if any
- `blockers`
- `recommended_next_step`
- `receipt_paths`
- confirmation canonical lane worktrees were or were not edited;
- confirmation no forbidden scope occurred.

Parallel lanes that use consultant relay must include capture reliability
telemetry in receipts before any future central integration review. If
telemetry is missing for an already-completed lane, central integration may
still proceed only when a separate capture audit or redacted closeout
establishes that the final actionable verdict had valid `packet_id`, valid
`consultant_id`, green verdict, safe flags, `ceo_decision_needed=false`, and
required sentinels.

Consultants may return `needs_evidence_packet`. A lane must treat that verdict
as non-actionable until the requested evidence is provided and a green verdict
is returned. Evidence packets must remain docs-only and redacted.

## Stop Conditions

Stop if:

- lock stale or unavailable;
- branch/worktree dirty unexpectedly;
- central changed and no fresh review exists;
- active next action changed materially;
- controlling artifacts changed materially;
- source/live/private/action/write boundary appears;
- raw target URL appears;
- lock owner token appears;
- private artifact/report appears in repo;
- consultant says `needs_task_packet_fix`, `hold`, `central_decision_needed`, or
  `ceo_decision_needed`;
- Chief Architect says `needs_integration_packet_fix`, `hold`,
  `central_decision_needed`, or `ceo_decision_needed`;
- merge conflict appears;
- canonical branch would be dirtied by a temporary parallel lane;
- `/Users/alejandrogomez/CRM` would be used.

## Completion Boundary

Complete when CRM Core has a central protocol for full-power parallel lane
development that defines branch modes, freshness tokens, conflict guardrails,
Chief Architect fresh-verdict rules, central-lock revalidation, integration
queue fan-in, temporary branch integration, closeout schema, and stop
conditions without authorizing source/live/private/action/write work.
