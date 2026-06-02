# CRM Core Codex Profile

Purpose:

This profile routes Codex context for CRM Core work. It keeps the CRM Core lane
separate from the active Launch OS lane while preserving the shared contracts
that both lanes may need to coordinate on.

This file does not authorize live API calls, CRM writes, card writes, ledger
writes, scoring changes, MailerLite actions, Shopify actions, outbound sends, or
credential work. It is a context filter for safe parallel Goals/play resumes.

## Default Resume Sources

For normal CRM Core resumes, read in this order:

1. `docs/crm-vnext/crm-core-codex-profile.md`
2. `docs/crm-vnext/crm-core-next-action.md`
3. `docs/crm-vnext/source-of-truth-map.md`
4. `docs/crm-vnext/operator-capabilities.md`
5. `docs/crm-vnext/control-room.md`
6. `git status --short --branch`
7. Files named by the active CRM Core `next_action_id`

Use these sources before broad hydration. If the active task only needs a
specific CRM Core contract, read that contract and its matching tests instead of
rehydrating the whole repository.

## CRM Core Lane

CRM Core owns the local CRM vNext operating brain:

- person-card contracts, read models, dashboards, queues, and operator handoffs;
- source health, source-result memory, and Mantis batch import/audit contracts;
- Fact Intake, Fact Store routing, context/fact proposal and application
  contracts;
- identity stitching, evidence review, evidence decisions, approval workbench,
  and approval application;
- card write approval, guarded local card apply, and merge-review resolver
  contracts;
- Signal Event Ledger, Signal Event Projection, engagement preview,
  Engagement Snapshot Ledger, movement queues, scoring policy, and next-best
  action policy;
- read-only source evidence adapters for Gmail, Contacts, Google Drive,
  MailerLite evidence, Instagram DM UI observations, ClassBot, Bhakti WhatsApp,
  WhatsApp rosters, ManyChat/source-recovery evidence, and local reports.

CRM Core work should improve the safety, clarity, capability map, validation, or
operator usefulness of those surfaces without creating a parallel CRM.

## Launch OS Lane

Launch OS remains active in its own branch/thread. In this CRM Core lane, treat
Launch OS files and reports as read-only context unless Alejandro explicitly
opens a coordinated bridge task.

Launch OS includes:

- MailerLite mini-launch, Null Audience replacement drafts, seed tests, public
  send readiness, MailerLite approval queues, and current-state refresh;
- Shopify/Web preview, publish, public URL, asset, and destination readiness;
- product-value, integrated-experience, CEO proposal, pilot distribution, and
  department-review packets;
- Launch OS profile, next-action, control-room, continuation guard, validation
  receipt, missing-input, taxonomy, and operator-runbook docs/scripts.

Do not advance Launch OS functionality, consume Launch OS approvals, create or
edit MailerLite drafts, send tests, publish, schedule, assign audiences, mutate
subscribers/groups/workflows, or update Launch OS docs from CRM Core unless a
fresh user instruction explicitly moves that exact work into scope.

## Bridge Lane

Bridge work is coordination between Launch OS/product/source activity and CRM
Core contracts. It belongs in CRM Core only when the task is about the contract,
not the live Launch OS execution.

Examples:

- mapping Launch OS or Shopify events into Signal Event Ledger event kinds;
- deciding which launch events are store-only versus projectable into scoring;
- CRM signal projection packets and CRM write policy packets for launch
  learning;
- shared source adapters that convert selected read-only evidence into CRM
  packets;
- validation that Bridge outputs do not mutate cards, ledgers, scores, live
  systems, or outbound channels.

Bridge changes require extra care because they can affect both CRM Core and
Launch OS operating assumptions.

## Shared Contracts Requiring Coordination

Coordinate before editing shared files that can affect both lanes:

- `package.json`
- `docs/crm-vnext/source-of-truth-map.md`
- `docs/crm-vnext/operator-capabilities.md`
- `docs/crm-vnext/control-room.md`
- `docs/crm-vnext/signal-event-ledger.md`
- `docs/crm-vnext/signal-event-projection.md`
- `docs/crm-vnext/signal-event-pipeline.md`
- `docs/crm-vnext/scoring-policy-v0.md`
- `docs/crm-vnext/next-best-action-policy-v0.md`
- `docs/crm-vnext/mantis-natural-batch-protocol.md`
- shared `lib/crm/community-*` scoring, queue, dashboard, and action policy
  contracts;
- source adapters or tests that Launch OS and CRM Core both consume.

When in doubt, classify the change first as CRM Core, Launch OS, or Bridge, then
keep the patch scoped to that lane.

## Light Hydration Policy

Use light hydration by default:

- active CRM Core next-action file;
- this profile;
- source-of-truth and operator-capability contracts;
- the specific docs, scripts, and tests named by the active task;
- current git status.

Avoid deep-reading OpenClaw/Mantis soul, identity, persona, broad memory, long
Launch OS checkpoints, unrelated repos, or historical reports unless a stop or
escalation condition requires it.

## Deep Hydration Escalation

Escalate beyond light hydration only when one or more conditions apply:

- the active CRM Core next action is missing, stale, or contradictory;
- the task crosses CRM Core and Launch OS boundaries;
- a shared contract file must be edited;
- a validation failure points outside the active files;
- source evidence is blocked, stale, or contradicted;
- git state contains unexpected changes from another lane;
- the task asks for architecture, routing, memory, or operating-process review;
- implementation would touch card writes, ledgers, scoring, live sources, or
  outbound approvals.

State the escalation reason before broad reads.

## No-Live / No-Mutation Rules

Unless Alejandro gives a fresh exact approval for a specific later step, CRM Core
Goals/play work must not:

- call live Gmail, Google Drive, Contacts, MailerLite, Instagram, ManyChat,
  Shopify, WhatsApp, Telegram, payment, or other source APIs;
- read, print, rotate, refresh, or mutate credentials;
- mutate person cards, Fact Store, Signal Event Ledger, Engagement Snapshot
  Ledger, source-result ledgers, scoring, card writes, CRM writes, or dashboard
  snapshots;
- send, schedule, publish, reply, DM, WhatsApp, email, Telegram, test-send, or
  trigger outbound communication;
- mutate MailerLite subscribers, groups, segments, campaigns, workflows,
  audiences, automations, or sends;
- treat score movement, queue status, next action, evidence candidates, or
  approval packets as permission to contact someone.

Read-only local reports and previews are allowed only when the active task names
them or they are necessary validation for the current CRM Core work.

## Mantis / OpenClaw Digest Rule

The CRM repo contains enough context for normal CRM Core work. Request a
Mantis/OpenClaw digest only when a specific missing decision is not represented
in CRM docs, local reports, or the active next-action file.

Use a digest for:

- current source-health state not present in CRM reports;
- a strategic operator decision that affects CRM Core routing;
- a Mantis batch result needed for import/audit;
- a cross-lane handoff from Launch OS into CRM Core.

Do not deep-read broad OpenClaw/Mantis memory by default. Ask for a compact
digest with the exact missing decision, current blocker, authoritative report
paths, and the next safe operator implication.
