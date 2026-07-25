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

## Problem Reality Gate Hydration

Before designing a new mission, proposing new engineering, or making a tracked
write in response to a blocker, hydrate:

`docs/crm-vnext/crm-core-problem-reality-gate-v1.md`

The required evidence levels are `codex_claimed`, `repo_verified`,
`reproduced_no_effect`, `runtime_empirical`, and `product_observed`. The only
diagnosis verdicts are `verified_problem`, `existing_solution_or_route`, and
`insufficient_evidence`.

If the gate is missing, incomplete, or unverified, stop before tracked writes.
`codex_claimed` is HOLD. Search canonical entrypoints and invoke an existing
component before treating it as missing. If the component exists but was not
loaded or invoked, return `existing_solution_or_route` and repair hydration or
the entrypoint before considering new architecture.

`repo_verified` may permit only one bounded repo contradiction repair. Runtime,
browser, source, and tool claims require `reproduced_no_effect` or
`runtime_empirical`. A new backend, runtime, source family, capability family,
or authority also requires `runtime_empirical`, a rejected no-build route,
causal proof, indispensability, and a Chief Architect ruling. Product readiness
requires `product_observed`.

Review diagnosis before artifact quality. A technically correct fix for an
unverified problem remains HOLD. This hydration grants no source, private-read,
browser, model-routing, build, integration, or live authority.

## Chief Architect Request Routing

Before preparing any Chief Architect packet, hydrate
`docs/crm-vnext/crm-core-chief-architect-request-routing-v1.md`. Classify the
request once, bind its exact registered target id and exact chat label, and run
the relay static and dynamic preflights. Do not route every request to `00`.
Wrong-role, unknown-class, cross-mission, or missing target metadata must stop
before Send. Existing 00 integration and registered mission packets preserve
their explicitly documented compatibility defaults only.

## Welcome-Audio Operator Hydration

For Instagram welcome-audio work, this profile is the canonical entrypoint.
Do not reconstruct the route from chat memory, historical lane branches, or a
single result document. After this profile, hydrate the following central
sources in order:

Before any browser selection or source read, run:

```text
node scripts/crm-vnext-welcome-audio-route-preflight.mjs
```

Proceed only when its aggregate result states all of:

```text
source_surface=iab_semantic_notifications
actuator_surface=safari_standard_isolated_native_picker
safari_as_source=false
route_preflight_status=green
head_matches_upstream=true
worktree_clean=true
```

This executable gate is mandatory across fresh starts, resumptions,
compactions, and lower-effort runs. A blocked or missing result stops the
operator before browser selection. It grants no source read or live authority.

1. `docs/crm-vnext/missions/crm-core-native-notification-profile-binding-no-live-v1.md`
2. `docs/crm-vnext/instagram-welcome-audio-ui-attested-follower-source-v1.md`
3. `docs/crm-vnext/crm-core-welcome-audio-ui-attested-dual-relationship-evidence-no-live-mission-v1.md`
4. `docs/crm-vnext/missions/crm-core-welcome-audio-notification-relationship-precedence-no-live-v1.md`
5. `docs/crm-vnext/instagram-welcome-audio-safari-action-adapter-v1.md`
6. `docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md`
7. `docs/crm-vnext/missions/crm-core-iab-semantic-source-to-safari-handoff-proof-v1.md`
8. `docs/crm-vnext/instagram-computer-use-quality-gate-v0.md`
9. `docs/crm-vnext/instagram-welcome-audio-first-controlled-send-result-v0.md`
10. `docs/crm-vnext/instagram-welcome-audio-one-recipient-canary-result-2026-07-24.md`

These pointers establish the mandatory boundary order:

```text
native Notifications
  -> exact notification-to-profile binding
  -> one approved exact relationship-evidence mode:
       current visible follows-owner
       OR approved bounded recent-event/no-explicit-contradiction
  -> exact Message action or the bounded Options -> Send message fallback
  -> exact owner/profile/thread binding
  -> private dedupe and prior-welcome check
  -> genuine composer, attachment, and approved-file capability
  -> durable claim and pending state
  -> native-picker upload
  -> exact approved-asset preview in the bound thread
  -> one Send at most
  -> same-thread confirmation or terminal unknown/no-retry
```

Relationship-evidence precedence is fail-closed. The UI-attested follower-source
contract and the centrally integrated dual-relationship mission are
authoritative for relationship eligibility and must be hydrated before the
Safari adapter. They admit either the stronger current-visible mode or an
explicitly approved bounded recent-event/no-explicit-contradiction mode. The
mere absence of the current follows-owner badge or the direct Message action is
not an explicit relationship contradiction. The Safari adapter may mediate
profile-to-thread UI only after one of those modes is exact; it must not narrow
eligibility back to the stronger mode.

Historical Proof hydration must distinguish event evidence from the provider's
temporal presentation. Relative `1..30` day and `1..4` coarse-week labels remain
valid under their closed grammar. If the same exact ordered notification row
instead exposes a compact calendar-date presentation, use only the
compatibility lane in the relationship-precedence mission: preserve the label
byte-for-byte; pin the exact English event phrase; capture the private
environment-owned `source_ui_timezone` from that same authenticated
observation; and derive `observation_civil_date` exactly once from the
environment's current instant under that exact timezone. Neither value may be
caller-selected, caller-supplied, drifted, substituted, or emitted in the
aggregate receipt. Accept only the closed `instagram_web_en` month-token table,
resolve the omitted year uniquely against the observation year or immediately
preceding year, and require a non-future `1..30` calendar-day distance. A
missing, unsupported, caller-originated, drifted, or mismatched timezone, or
any derivation ambiguity, blocks. This compatibility creates no bootstrap,
source, candidate, thread, timestamp, membership, campaign, message, production,
or Send claim.

The action adapter is authoritative for UI recovery, output privacy, and the
one-shot effect boundary. The admission contract remains authoritative for
claim/host ordering. The binding and handoff missions remain authoritative for
the read-only source-to-profile and profile-to-thread boundaries. The quality
gate and both controlled-send results are supporting recovery and historical
evidence; they are never current health, production readiness, or live
authority.

The historical unmerged Safari upload-hardening lane and its orphaned protocol
are non-authoritative. Do not cherry-pick or use them as a runtime dependency.
Only a novel delta that has been reviewed and copied into the central
authoritative documents may affect an operation.

This hydration section grants no browser access, source read, claim, upload,
Send, retry, MailerLite action, CRM write, campaign action, or other live
authority. A lower-effort agent that cannot state this route and its stop
conditions from the central sources must stop before source use.

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
