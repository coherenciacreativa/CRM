# CRM Core Active Next Action Contract

Purpose:

This file records the active CRM Core next action for safe parallel Goals/play
work. It keeps CRM Core resumes separate from Launch OS resumes and prevents a
future run from advancing MailerLite, Shopify, outbound, cards, ledgers, or
scoring by accident.

This contract does not authorize implementation beyond the active scope. It is a
routing and completion pointer.

## Active Next Action Schema

- `next_action_id`:
- `status`: `active | blocked | superseded | completed`
- `created_at`:
- `updated_at`:
- `objective`:
- `why_now`:
- `allowed_scope`:
- `forbidden_scope`:
- `expected_files`:
- `validation_commands`:
- `stop_conditions`:
- `resume_instruction`:
- `completion_definition`:

## Active Next Action

- `next_action_id`: `crm_core_signal_readiness_board_v0`
- `status`: `active`
- `created_at`: `2026-06-02`
- `updated_at`: `2026-06-02`
- `objective`: Build a read-only CRM Signal Readiness Board / CRM Core
  capability map that tells a future operator which CRM Core surfaces exist,
  which validations prove them, and which safe next CRM Core milestone should be
  considered after approval.
- `why_now`: CRM Core now has its own branch and needs a minimal, safe re-entry
  surface before implementation work resumes. The current repo already contains
  mature CRM Core contracts for local cards, evidence review, source-result
  memory, signals, scoring previews, dashboards, and guarded write gates. The
  next useful step is to organize those capabilities without mutating CRM state
  or advancing Launch OS.
- `allowed_scope`:
  - Read CRM Core docs, scripts, and tests related to readiness, source ledgers,
    evidence, identity stitching, card-write approvals, signal events,
    engagement previews, scoring policy, queues, dashboards, and Mantis CRM
    intelligence.
  - Create or update CRM Core-only read-only routing or capability-map docs when
    explicitly approved.
  - Run non-mutating local validation commands that do not call live APIs and do
    not read credentials.
  - Produce a local/report-only recommendation for the safest next CRM Core
    milestone.
- `forbidden_scope`:
  - Do not advance Launch OS functionality.
  - Do not edit Launch OS docs or active Launch OS next-action/control-room
    files.
  - Do not edit `AGENTS.md`, `package.json`, or
    `docs/crm-vnext/source-of-truth-map.md` unless Alejandro gives a fresh
    explicit coordination instruction.
  - Do not mutate person cards, Fact Store, Signal Event Ledger, Engagement
    Snapshot Ledger, source-result ledger, scoring, card writes, CRM writes,
    dashboard snapshots, or local CRM operational state.
  - Do not call live APIs or connectors.
  - Do not read, print, rotate, refresh, or mutate secrets or credentials.
  - Do not touch MailerLite, Shopify, workflows, subscribers, groups, audiences,
    campaigns, automations, sends, publish, schedule, or outbound channels.
- `expected_files`:
  - `docs/crm-vnext/crm-core-codex-profile.md`
  - `docs/crm-vnext/crm-core-next-action.md`
  - Future approved CRM Core read-only capability map file, if Alejandro asks
    for implementation after this routing pack.
- `validation_commands`:
  - `git status --short --branch`
  - `git diff --check`
  - `npm run crm:vnext:readiness`
  - `npm run crm:vnext:control-room`
  - `npm run crm:vnext:source-ledger`
  - `npm run crm:vnext:signal-packet-inbox`
  - `npm run crm:vnext:daily-operator-handoff`
  - `npx vitest run __tests__/person-card-vnext.spec.ts __tests__/crm-vnext-control-room.spec.ts __tests__/crm-vnext-batch-operating-loop.spec.ts __tests__/crm-vnext-card-write-approval-packet.spec.ts __tests__/crm-vnext-signal-event-pipeline.spec.ts`
- `stop_conditions`:
  - Git branch is not `codex/crm-core-reentry`.
  - Working tree contains unexpected unrelated changes.
  - The requested work would edit Launch OS docs, `AGENTS.md`, `package.json`,
    or `docs/crm-vnext/source-of-truth-map.md` without fresh approval.
  - The task requires live APIs, credentials, source-system mutation, outbound
    action, card mutation, ledger writes, score mutation, or Fact Store writes.
  - The task cannot be classified clearly as CRM Core, Launch OS, or Bridge.
  - Validation fails in a way that requires broad or cross-lane edits.
  - A Mantis/OpenClaw decision is needed but not represented in CRM docs or
    reports.
- `resume_instruction`: Start by reading
  `docs/crm-vnext/crm-core-codex-profile.md`, then this file, then
  `docs/crm-vnext/source-of-truth-map.md`,
  `docs/crm-vnext/operator-capabilities.md`, and
  `docs/crm-vnext/control-room.md`. Keep the run read-only unless Alejandro
  explicitly approves a CRM Core implementation step. If the next task is still
  the Signal Readiness Board, produce the capability map without touching live
  systems or local CRM state.
- `completion_definition`: CRM Core has a concise read-only Signal Readiness
  Board / capability map that identifies available CRM Core surfaces, validation
  commands, lane boundaries, shared-contract coordination points, and the safest
  next milestone. No Launch OS functionality, live systems, cards, ledgers,
  Fact Store, scoring, writes, or outbound channels were touched.
