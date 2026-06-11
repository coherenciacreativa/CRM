# Instagram Story Viewer Surface Frequency Pilot Design v0

Date: 2026-06-11
Status: no-run CRM Core design

## Purpose

This design defines a no-run pilot for determining whether Instagram story
viewer surfaces can be accessed safely and whether repeated story viewer
frequency can be captured as private CRM evidence without printing viewer lists,
taking Instagram actions, or writing CRM state.

This document does not authorize Instagram UI execution, Computer Use execution,
API calls, connector calls, story viewer collection, DM opening, welcome audio,
Instagram actions, CRM writes, scoring writes, ledger writes, card writes, Fact
Store writes, source-result ledger writes, source mutation, or outreach.

## Why Now

Notifications provide a useful public/community pulse, but they do not provide
full story viewer frequency. Story viewers are strategically important because
they can reveal sustained passive attention when observed repeatedly over time.

A single story view is weak. Repeated views over 7 or 30 days, or a streak
across capture windows, can become a stronger relationship-proximity signal,
especially when paired with DMs, story replies, email handoff, MailerLite
relationship depth, or repeated notification presence.

This is the next highest-leverage Instagram signal lane after notifications.

## Source Surfaces To Test Later

Future approved pilots may test these source surfaces:

- current active story viewer list, if visible;
- recent story viewer surface, if available;
- archived story insights/viewer surface, if available;
- notification-derived story-related signals, already known but insufficient for
  full viewer frequency;
- manual evidence route if UI capture is blocked.

Each surface must be treated as a separate source-health question. This design
does not assume any story viewer surface is currently available or safe.

## Frequency Model

Story viewer evidence should be interpreted by frequency and combinations, not
by single isolated views.

| Signal | Meaning | Allowed v0 effect |
| --- | --- | --- |
| `story_view_single` | One passive story view. | Weak review context only. |
| `story_view_repeated_7d` | Repeated story views inside seven days. | Attention/presence pattern, still no outreach permission. |
| `story_view_repeated_30d` | Sustained story viewing across a month. | Relationship-proximity clue, still review-only. |
| `story_view_streak` | Habitual viewing across consecutive capture windows. | Stronger presence signal, not a score. |
| `story_view_plus_dm` | Story viewing paired with direct message or story reply context. | Strong review candidate, no write in v0. |
| `story_view_plus_email_handoff` | Viewer context paired with approved email handoff evidence. | Strong identity bridge candidate, no write in v0. |

Interpretation rules:

- one view is weak;
- repeated views are attention/presence;
- story views are not outreach permission;
- story views are not scoring writes;
- no CRM writes are allowed in this v0.

## Private Artifact Behavior

Future story viewer artifacts must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may contain viewer handles or private anchors only if
specifically approved for the pilot. They must never be committed, pasted into
chat, stored in tracked docs, or stored in Mantis general memory.

Standard chat and standard receipts may reference only path labels and aggregate
counts. They must never expose viewer handles, viewer lists, screenshots,
private URLs, DMs, names, emails, or private content.

## Redacted Receipt Behavior

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- story viewer surface health;
- number of stories checked;
- aggregate visible viewer count, if safe;
- whether viewer list access is possible;
- whether repeated capture is required;
- frequency model feasibility;
- blocker classes;
- quality gate fields;
- closed gates;
- next safe operator step.

Receipts must not include:

- viewer handles;
- viewer lists;
- screenshots;
- names or emails;
- DMs;
- private URLs;
- message bodies;
- private content;
- tokens, headers, env values, credential metadata, or secrets.

## Computer Use Quality Gate

Future story viewer pilots must follow:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Required quality rules:

- prefer native/stable Computer Use;
- planned safe start is allowed only to reach a known safe story surface;
- no screenshot-coordinate fallback for viewer collection;
- stop if viewer access requires fragile coordinate clicking;
- stop if private content would need to be printed.

Unknown quality must not be reported as green. If the route degrades into
coordinate or screenshot-only behavior, the pilot must stop before viewer
collection.

## Pilot Route Options

The following options are design-only and require future approval before any
execution:

| Option | Route | Use case | Boundary |
| --- | --- | --- | --- |
| A | UI / Computer Use read-only surface access pilot | Test whether story viewer surfaces are reachable safely. | Approval required before any UI work. |
| B | Manual evidence packet supplied by Alejandro | Alejandro supplies compact observations without Codex opening Instagram. | Receipt must remain aggregate/redacted. |
| C | Private artifact route if a story viewer export/snapshot exists | Process supplied private artifact locally. | Artifact must remain outside repo; no chat exposure. |
| D | Future API/webhook investigation lane | Investigate official Meta/Instagram availability. | Separate source-health and permissions lane. |

## Stop Conditions

Stop any future pilot immediately if:

- login, checkpoint, CAPTCHA, or auth ambiguity appears;
- an unexpected modal appears;
- Alejandro appears to be actively using the computer;
- any visible action risk appears;
- any need to click, react, reply, follow, like, comment, archive, label, mark,
  or mutate appears;
- any need to open DMs appears;
- any need to print viewer handles or viewer lists appears;
- any need to capture screenshots containing private identities appears;
- coordinate or screenshot fallback is required;
- read-state or view-state ambiguity becomes unsafe.

If a stop condition appears, produce a redacted blocker receipt only if it can be
done without exposing private content.

## Instagram-To-Email Bridge Relationship

Story views become more valuable when paired with:

- DM;
- story reply;
- email handoff;
- MailerLite relationship depth;
- repeated notification presence.

These combinations can become strong review candidates or identity bridge
candidates, but this design does not authorize identity merge, card write,
Signal Event Ledger write, Engagement Snapshot Ledger write, Fact Store write,
source-result ledger write, scoring write, or outreach.

## What Remains Separate

The following remain separate lanes:

- Daily notifications standing operation;
- DM/email handoff private-thread boundary;
- welcome audio DM queue;
- Instagram API/webhook investigation;
- CRM writes, ledgers, scoring, cards, and Fact Store;
- Launch OS.

## Closed Gates

The following gates remain closed:

- no Instagram action;
- no DM sent;
- no welcome audio;
- no story viewer collection in this design task;
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

This design is complete when CRM Core has a no-run pilot design for testing
story viewer surface access and frequency feasibility, with private artifact
rules, redacted receipt rules, quality gate requirements, route options, stop
conditions, Instagram-to-email bridge context, separate lanes, and closed gates.

Any story viewer surface/frequency pilot execution must wait for fresh Alejandro
approval.
