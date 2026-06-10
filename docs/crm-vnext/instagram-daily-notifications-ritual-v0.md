# Instagram Daily Notifications Ritual v0

Date: 2026-06-10
Status: no-run CRM Core design

## Purpose

This design defines a daily read-only Instagram notifications ritual that gives
CRM Core and Mantis a lightweight community pulse without opening DMs,
collecting story viewer lists, sending welcome audio, taking Instagram actions,
or writing CRM state.

This design does not authorize Instagram UI execution, Computer Use execution,
API calls, connector calls, DM opening, story viewer collection, welcome audio,
follows, likes, reactions, comments, replies, archive/label/mark actions, CRM
writes, ledger writes, card writes, Fact Store writes, scoring writes, source
mutations, or outreach.

## Cadence

Default target time:

- around 5 a.m. local time;
- only when Alejandro is not actively using the computer;
- manually approved at first;
- no implied standing Instagram UI permission.

Graduation to standing daily automation requires a separate approval boundary
after the stability criteria in this document are met.

## Start-Surface Handling

`planned_safe_start_navigation` means the ritual may intentionally open a clean
browser window or navigate to the Instagram notifications surface before
observation begins.

Rules:

- planned safe start navigation must be reported separately from unplanned
  fallback;
- it must not click notification items;
- it must not open DMs, profiles, story viewers, or private threads;
- it must not perform source actions;
- after reaching notifications, observation should use stable/native Computer
  Use;
- if observation requires coordinate or screenshot fallback, stop.

Planned safe start navigation is route initialization only. It is not signal
capture, source action, private inspection, or permission to continue through
degraded interaction.

## Quality Gate

Every ritual receipt must include the Computer Use quality fields from:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Required fields:

- `computerUseMode`;
- `fallbackUsed`;
- `fallbackReason`;
- `freshWindowUsed`;
- `plannedSafeStartNavigation`;
- `plannedSafeStartSurface`;
- `plannedSafeStartReason`;
- `coordinateBasedActions`;
- `screenshotOnlyNavigation`;
- `visiblePointerObservedByUser`;
- `actionsPerformed`;
- `qualityGateStatus`;
- `qualityGateMeaning`.

Unknown quality must not be reported as green. Any quality gate degradation must
remain visible in the receipt and in the next safe operator step.

## Capture Scope

The ritual may observe only the Instagram notifications surface.

Allowed aggregate fields:

- total visible notification groups;
- visible new follower notification groups;
- visible story-related notification groups;
- visible notification time buckets;
- source-health state;
- blocker classes;
- read-state ambiguity status;
- aggregate deltas from prior captures if safe.

This ritual must not open notification items, DMs, private threads, profiles, or
story viewer surfaces.

## Trend Fields

Repeated daily captures can produce redacted pulse trends only from aggregate
notification-surface fields:

- new follower notification trend;
- story-related notification group trend;
- time-bucket trend;
- source-health trend;
- quality-gate trend;
- blocker trend.

Trends must remain viewport-level unless private dedupe is separately approved
and proven. Trend language must not imply unique people, person-level intent,
outreach readiness, scoring readiness, or CRM write readiness.

## Dedupe And Read-State Handling

The ritual must distinguish viewport-observed notification groups from unique
people or unique events.

Rules:

- do not claim unique follower count unless dedupe is proven;
- keep read-state ambiguity as a source-health field;
- do not click notification items;
- do not open profiles, DMs, story viewers, or private threads;
- if read-state appears affected, mark the route blocked or unsafe and stop.

If dedupe is not provable, counts remain `viewport_observed`. Private anchors
may be considered only under a later approved private-artifact boundary.

## Private Artifact Behavior

Future private artifacts must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include internal run metadata and redacted/private anchors
only if approved for that exact boundary. Private artifacts must never be
committed, pasted into chat, stored in tracked docs, or stored in Mantis general
memory.

Standard chat and standard receipts may reference only private artifact path
labels, never private contents.

## Redacted Receipt Behavior

Future receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate counts;
- aggregate deltas;
- source-health state;
- quality-gate status;
- blocker classes;
- closed gates;
- next safe operator step.

Receipts must not include:

- handles tied to private identities;
- full notification text;
- story viewer lists;
- DMs;
- screenshots;
- names or emails;
- message bodies;
- private URLs;
- private content;
- tokens, headers, env values, credential metadata, or secrets.

## Stability Criteria Before Standing Automation

Standing daily automation is not approved by this design.

Before CRM Core proposes a standing daily automation boundary, require at least:

- 2-3 successful quality-gated captures;
- no Instagram actions;
- no private content printed;
- no coordinate-based actions;
- no screenshot-only navigation;
- no login, checkpoint, or CAPTCHA issue;
- read-state ambiguity remains bounded;
- `qualityGateStatus` is green or explicitly acceptable yellow.

Even after these criteria are met, automation requires a separate explicit
approval boundary.

## Daily Mantis Pulse Brief

Mantis may describe only aggregate operational pulse:

- aggregate new follower pulse;
- aggregate story-related notification pulse;
- source-health and quality-gate status;
- blockers;
- next safe operator decision.

Mantis must not say:

- names or handles;
- inferred person-level intent;
- outreach recommendations;
- story viewer frequency unless separately proven;
- scoring, card, ledger, Fact Store, or CRM write recommendations.

## What Remains Separate

The following remain separate lanes and require separate approval boundaries:

- story viewer surface/frequency pilot;
- DM/email handoff boundary;
- welcome audio DM queue;
- Instagram API/webhook investigation;
- CRM writes, scoring, ledgers, and cards.

## Closed Gates

The following gates remain closed:

- no Instagram action;
- no DM sent;
- no welcome audio;
- no story viewer collection;
- no private thread opening;
- no CRM writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no card writes;
- no Fact Store writes;
- no source-result ledger writes;
- no scoring writes;
- no outreach;
- no source mutation;
- no Launch OS touch;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

This design is complete when CRM Core has a no-run daily notifications ritual
that defines cadence, start-surface handling, quality-gate fields, capture
scope, trend fields, dedupe/read-state handling, private artifact behavior,
redacted receipt behavior, stability criteria, Mantis pulse boundaries, separate
lanes, and closed gates.

The first ritual pilot must wait for a fresh explicit approval boundary.
