# Instagram Notifications Repeated Capture Protocol v0

Date: 2026-06-10
Status: no-run CRM Core protocol

## Purpose

This protocol defines how CRM Core can turn single viewport-level Instagram
notification captures into useful redacted trend signals over time without
opening private threads, collecting story viewer lists, taking Instagram actions,
or writing CRM state.

The protocol is design-only. It does not authorize Instagram UI execution,
Computer Use, API calls, DM opening, story viewer collection, welcome audio,
follows, likes, reactions, comments, replies, archive/label/mark actions, CRM
writes, ledger writes, card writes, Fact Store writes, scoring writes, or
outreach.

## Baseline Capture

The first Instagram Daily Notifications Capture v0 completed partially with:

- source health state: `partial`;
- total visible notification groups: 11;
- visible new follower notification groups: 4;
- visible story-related notification groups: 0;
- visible notification time buckets: 2;
- actions performed: 0.

Known blockers:

- `viewport_only_capture`;
- `read_state_ambiguity_not_visibly_triggered_but_not_fully_provable`;
- `story_viewer_frequency_not_available_from_notifications_surface`;
- `dm_email_handoff_not_in_scope`.

This baseline is useful as a first source-health proof and pulse sample. It is
not person-level evidence, not a complete source of truth, and not permission to
contact.

## Cadence

Initial pilot cadence:

- manual Alejandro approval per run;
- one capture per approval;
- no implied standing Instagram UI permission.

Later daily cadence:

- target around 5 a.m.;
- only after repeated successful no-action captures;
- only when the computer is not in active use by Alejandro.

Later twice-daily cadence:

- only after the daily cadence is stable;
- only if the additional run provides useful trend data;
- requires a separate approval boundary.

Any capture must stop if Alejandro is using the computer or if there is any
ambiguity about read-only behavior.

## Capture Unit

Each future run should be represented by a compact capture unit:

| Field | Meaning |
| --- | --- |
| `run_id` | Unique identifier for the capture run. |
| `capture_date` | Local date of the run. |
| `capture_time` | Local time of the run. |
| `source_surface` | Always `instagram_notifications_only` for this protocol. |
| `source_health_state` | `healthy`, `partial`, `blocked`, or `unknown`. |
| `viewport_scope` | Compact description of the observed viewport. |
| `time_buckets_visible` | Count or labels of visible time buckets, redacted. |
| `blocker_classes` | Any blocker classes encountered. |
| `actions_performed` | Must remain `0`. |
| `read_state_ambiguity` | Whether read-state risk remains unresolved. |

The capture unit should describe the route and aggregate observations, not
private identities.

## Trend Fields

Future repeated captures may compare only redacted aggregate fields:

- total visible notification groups;
- visible new follower notification groups;
- visible story-related notification groups;
- visible notification time buckets;
- source health state;
- blocker classes;
- capture success or failure;
- actions performed, which must remain `0`.

Receipts may include deltas from previous captures only when the comparison does
not require exposing handles, exact notification text, story viewer lists, DMs,
screenshots, or private content.

## Dedupe Strategy

Repeated notification captures can produce false trends if viewport-level
observations are treated as unique people or unique events. CRM Core must keep
those meanings separate.

Rules:

- distinguish `viewport_observed` groups from unique people/events;
- use capture timestamp and notification time bucket for trend context;
- use private anchors or hashes only inside a private artifact if later
  approved;
- never print private anchors, handles, story viewers, DMs, exact notification
  text, screenshots, names, emails, private URLs, or private content in chat or
  standard receipts;
- if dedupe is not provable, label counts as `viewport_observed` rather than
  `unique`.

Recommended dedupe classifications:

| Classification | Meaning |
| --- | --- |
| `viewport_observed` | Visible group count only; uniqueness not proven. |
| `dedupe_pending_private_anchor` | A private anchor strategy is needed. |
| `dedupe_possible_private_only` | Private artifact can compare anchors, but standard receipts remain aggregate. |
| `dedupe_blocked` | Dedupe would require unsafe/private output or source actions. |

## Read-State Ambiguity

Read-state ambiguity remains an explicit source-health field until proven safe.

Policy:

- do not click notification items;
- do not open profiles;
- do not open threads;
- do not mark, archive, label, react, like, follow, comment, reply, send, or
  mutate anything;
- if opening notifications appears to alter read state, mark
  `source_health_state` as `blocked` or `unsafe`;
- maintain `read_state_ambiguity` in receipts until the route is proven safe;
- do not treat notification capture as a complete source of truth.

If a capture cannot proceed without clicking or visible source action, stop and
record the blocker.

## Private Artifact Behavior

Future private artifacts must live outside the repo:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include internal redacted anchors or hashes for dedupe
only if Alejandro approves that boundary. Private artifacts must never be
committed, pasted into chat, stored in tracked docs, or stored in Mantis general
memory.

Standard chat and standard receipts may use only path labels and aggregate
counts.

## Redacted Receipt Behavior

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate trend counts;
- deltas from previous captures if computable without private disclosure;
- blocker classes;
- source health state;
- read-state ambiguity state;
- closed gates;
- next safe step.

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
- private anchors or hashes;
- tokens, headers, env values, credential metadata, or secrets.

## Daily Mantis Brief Threshold

Notifications capture is useful enough for a daily Mantis pulse brief only after
the route has evidence of stability.

Minimum threshold:

- at least 2-3 successful captures;
- stable no-action behavior;
- no login, checkpoint, or CAPTCHA issues;
- no read-state blockers;
- meaningful nonzero notification trend or useful source-health proof;
- clear statement that the result is community pulse, not person-level scoring.

The brief should stay aggregate and operational:

- "new follower signal is up/down";
- "story-related notification groups appeared/did not appear";
- "source health is healthy/partial/blocked";
- "next safe operator decision".

It must not contain identities, exact notification text, story viewer lists, DMs,
or outreach recommendations.

## What Remains Separate

These areas remain outside this repeated notifications protocol:

- full story viewer frequency, which requires a story viewer surface pilot or
  repeated private artifact route;
- DM/email handoff, which requires a private-thread boundary;
- welcome audio, which requires outbound approval and dedupe/welcome-history;
- CRM writes, scoring, ledgers, cards, Fact Store, and source-result ledgers.

Notification-surface trends can support a daily pulse brief, but they do not
authorize person-level interpretation, outreach, scoring, or CRM mutation.

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
- no `/Users/alejandrogomez/CRM` use.

## Completion Boundary

This protocol is complete when CRM Core has a no-run repeated capture protocol
for Instagram notifications that explains how multiple notifications captures
can produce redacted trend signals, how dedupe/read-state ambiguity is handled,
what remains blocked, and when to graduate to a daily ritual.

Any additional capture execution must wait for separate explicit approval.
