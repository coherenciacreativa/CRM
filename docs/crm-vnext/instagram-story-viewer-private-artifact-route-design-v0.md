# Instagram Story Viewer Private Artifact Route Design v0

Date: 2026-06-11
Status: no-run CRM Core design

## Purpose

Design a future private artifact route that can capture story viewer handles or
anchors privately for frequency analysis, without printing viewer identities in
chat, writing CRM state, or taking Instagram actions.

This design does not authorize Instagram UI execution, Computer Use execution,
API calls, connector calls, story viewer collection, viewer list opening, DM
opening, welcome audio, Instagram actions, CRM writes, scoring writes, ledger
writes, card writes, Fact Store writes, source-result ledger writes, source
mutation, or outreach.

## Why This Is Needed

The first story viewer surface pilot showed that an active story surface is
reachable and that an aggregate viewer count can be visible. That is useful
source-health evidence, but it is insufficient for frequent-viewer CRM
intelligence.

To know whether someone viewed many stories in a month, CRM Core needs private
repeated-capture artifacts with viewer anchors. Those anchors must remain
private and outside the repo. Standard chat and standard receipts may only show
aggregate counts, blocker classes, and closed gates.

## Inputs

Future execution may use:

- approved story viewer surface access route;
- current story viewer list if visible and explicitly approved;
- future repeated capture runs;
- optional manual evidence supplied by Alejandro;
- no DM or private-thread content.

Each input must be bounded by the standing read-only source policy and the
Instagram Computer Use Quality Gate.

## Private Artifact Behavior

Future artifacts must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include:

- `run_id`;
- capture timestamp;
- story surface label;
- story identifier or private anchor if safe;
- viewer handle or private anchor;
- viewer position/order if needed;
- aggregate viewer count;
- quality gate fields;
- source-health blockers.

Private artifacts must never be committed, pasted into chat, stored in tracked
docs, or stored in Mantis general memory.

## Redacted Receipt Behavior

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- number of stories checked;
- aggregate viewer counts;
- number of private viewer anchors captured;
- count of repeated viewers if computable;
- frequency model feasibility;
- blocker classes;
- quality gate status;
- closed gates;
- next safe step.

Receipts must not include:

- viewer handles;
- viewer lists;
- screenshots;
- names or emails;
- DMs;
- private URLs;
- message bodies;
- private content;
- private anchors or hashes;
- tokens, headers, env values, credential metadata, or secrets.

## Frequency Model

Future private artifacts could compute these signals:

| Signal | Meaning | v0 effect |
| --- | --- | --- |
| `story_view_single` | One passive story view. | Weak review context only. |
| `story_view_repeated_7d` | Repeated story views inside seven days. | Attention/presence signal, still review-only. |
| `story_view_repeated_30d` | Sustained story viewing across a month. | Relationship-proximity signal, still review-only. |
| `story_view_streak` | Habitual viewing across consecutive capture windows. | Stronger private review candidate, not a score. |
| `story_view_plus_dm` | Story viewing paired with approved DM or story-reply context. | Strong review candidate, still no write. |
| `story_view_plus_email_handoff` | Viewer context paired with approved email handoff evidence. | Strong identity bridge candidate, still no write. |

Interpretation rules:

- story views are not outreach permission;
- story views are not scoring writes;
- repeated views are attention/presence signals;
- no person-level output belongs in chat;
- suppression, safety, and consent gates must remain separate from warmth.

## Computer Use Quality Gate

Future execution must follow:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Required boundaries:

- prefer native/stable Computer Use;
- planned safe start may only reach a known safe story surface;
- no screenshot-coordinate fallback for viewer collection;
- stop if viewer access requires fragile coordinate clicking;
- stop if private content would need to be printed;
- take no visible Instagram actions.

Unknown quality must not be reported as green. If the route degrades into
coordinate or screenshot-only behavior, stop before viewer collection.

## Pilot Execution Boundary

The first private viewer-list artifact pilot requires a fresh explicit approval
phrase before execution.

Suggested future approval phrase:

```text
I approve the CRM Core Instagram story viewer private artifact pilot using UI / Computer Use read-only only. Capture viewer handles/anchors only into a private artifact outside the repo. Do not print viewer handles, viewer lists, screenshots, private content, or write CRM state.
```

That approval would authorize only the bounded private artifact pilot described
here. It would not authorize DMs, welcome audio, outreach, CRM writes, scoring,
cards, ledgers, Fact Store writes, source-result ledger writes, source mutation,
or Launch OS work.

## Stop Conditions

Stop immediately if any of the following occur:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- active computer use by Alejandro;
- any visible action risk;
- any need to click, react, reply, follow, like, comment, archive, label, mark,
  or mutate;
- any need to open DMs;
- any need to print viewer handles or viewer lists;
- any need to capture screenshots containing private identities;
- coordinate or screenshot fallback required;
- view-state ambiguity becomes unsafe.

If a stop condition appears, produce only a redacted blocker receipt if that can
be done without exposing private content.

## What Remains Separate

The following remain separate lanes:

- notifications standing operation;
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

This design is complete when CRM Core has a no-run private artifact route for a
future story viewer identity/frequency capture pilot, including private artifact
rules, redacted receipt rules, frequency model, Computer Use quality gates,
pilot approval phrase, stop conditions, separate lanes, and closed gates.

Any story viewer private artifact pilot execution must wait for fresh Alejandro
approval.
