# Instagram Daily Notifications Standing Ritual v0

Date: 2026-06-11
Status: no-run CRM Core design

## Purpose

This design defines the standing daily 5 a.m. Instagram notifications pulse
ritual for CRM Core and Mantis. The ritual remains read-only, no-action,
aggregate/redacted, and separate from story viewers, DMs, welcome audio,
scoring, cards, ledgers, Fact Store, CRM writes, source mutations, outreach, and
Launch OS.

This document does not authorize Instagram UI execution, Computer Use execution,
API calls, connector calls, DM opening, story viewer collection, welcome audio,
Instagram actions, CRM writes, scoring writes, or outbound action.

## Cadence

Default cadence:

- run around 5 a.m. local time;
- run only when Alejandro is not actively using the computer;
- one daily capture by default;
- twice-daily cadence requires separate future approval;
- skip rather than force if quality or Computer Use conditions are not safe.

The ritual should be treated as a quiet source-health and community-pulse check,
not a person-level intent engine and not a CRM write path.

## Start Conditions

Before any future approved run:

- root must be `/Users/alejandrogomez/CRM-core`;
- branch must be `codex/crm-core-reentry`;
- working tree must be clean;
- expected source surface is Instagram notifications only;
- planned safe start navigation is allowed only to reach Instagram
  notifications;
- no existing browser state should be trusted unless it is safe, bounded, and
  matches the approved source surface.

If any start condition fails, skip or stop and produce a redacted blocked
receipt if useful.

## Planned Safe Start Behavior

The standing ritual may use `planned_safe_start_navigation` to open a clean
browser window or navigate to Instagram notifications.

Rules:

- report planned safe start as planned safe start, not fallback;
- do not click notification items;
- do not open DMs, profiles, story viewers, private threads, or message content;
- do not perform source actions;
- after reaching notifications, use stable/native Computer Use for observation;
- if observation requires coordinate or screenshot fallback, stop.

Planned safe start navigation is route initialization only. It is not signal
capture by clicking, private inspection, or permission to continue through a
degraded UI route.

## Computer Use Quality Gate

Every standing ritual receipt must include:

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

`qualityGateStatus` may be `green`, explicitly acceptable `yellow`, or
`blocked`. Unknown quality must not be reported as green.

## Capture Scope

The standing ritual may capture only aggregate notification-surface fields:

- total visible notification groups;
- visible new follower notification groups;
- visible story-related notification groups;
- visible notification time buckets;
- source-health state;
- blocker classes;
- read-state ambiguity status;
- aggregate deltas from prior receipts if safe.

Counts remain viewport-level unless dedupe is separately approved and proven.
The ritual must not claim unique people, unique follower count, person-level
intent, outreach readiness, score readiness, or CRM write readiness.

## Receipts

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate counts;
- aggregate deltas;
- quality gate fields;
- blocker classes;
- source-health state;
- read-state ambiguity;
- closed gates;
- Mantis pulse summary;
- next safe operator step.

Receipts must not include:

- handles tied to private identities;
- full notification text;
- story viewer lists;
- DMs;
- screenshots;
- names or emails;
- private URLs;
- message bodies;
- private content;
- tokens, headers, env values, credential metadata, or secrets.

## Private Artifact Behavior

If a private artifact is needed, it must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may contain only the private run metadata or dedupe anchors
approved for that exact boundary. They must never be committed, pasted into
chat, stored in tracked docs, or stored in Mantis general memory.

Standard chat and standard receipts may reference only private artifact path
labels, never private contents or private identity values.

## Skip And Stop Conditions

Skip or stop immediately if:

- Alejandro appears to be using the computer;
- login, checkpoint, CAPTCHA, or auth ambiguity appears;
- an unexpected modal appears;
- native Computer Use is unavailable and the next step requires interaction;
- any click would be required;
- any notification item click would be required;
- any visible action risk appears;
- any need to print private content appears;
- coordinate or screenshot fallback is needed for signal capture;
- read-state ambiguity becomes unsafe;
- root is not `/Users/alejandrogomez/CRM-core`;
- branch is not `codex/crm-core-reentry`;
- working tree is unexpectedly dirty.

If a run is skipped or blocked, the redacted receipt may say only the blocker
classes, source-health state, quality gate state, and next safe operator step.

## Mantis Daily Pulse Brief

Mantis may say:

- aggregate new follower pulse;
- aggregate story-related notification pulse;
- source-health status;
- quality-gate status;
- blockers;
- whether the ritual ran, skipped, or blocked;
- next safe operator decision.

Mantis must not say:

- names;
- handles;
- inferred person-level intent;
- outreach recommendations;
- story viewer frequency unless separately proven;
- scoring, card, ledger, Fact Store, or CRM write recommendations.

## Stability And Promotion

Standing daily operation becomes acceptable to propose only when all of the
following are true:

- at least 2-3 successful quality-gated captures exist;
- no Instagram actions occurred;
- no coordinate-based actions occurred;
- no screenshot-only navigation occurred;
- no private content was printed;
- no login, checkpoint, or CAPTCHA issue occurred;
- read-state ambiguity remains bounded;
- `qualityGateStatus` is green or explicitly acceptable yellow;
- Alejandro explicitly approves standing operation.

Even after standing operation is approved, story viewer frequency, DM/email
handoff, welcome audio, CRM writes, scoring, and outreach remain separate lanes.

## What Remains Separate

The following require separate approval boundaries:

- story viewer surface/frequency pilot;
- DM/email handoff boundary;
- welcome audio DM queue;
- Instagram API/webhook investigation;
- CRM writes, scoring, ledgers, cards, and Fact Store;
- Launch OS.

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

This design is complete when CRM Core has a no-run standing daily notifications
ritual design that explains schedule, start-surface handling, Computer Use
quality gates, receipts, private artifact behavior, daily pulse brief, skip/stop
conditions, stability and promotion criteria, and explicit separation from story
viewers, DMs/email handoff, welcome audio, CRM writes, outreach, and Launch OS.

Any standing execution must wait for fresh Alejandro approval.
