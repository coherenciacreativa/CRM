# Instagram Story Viewer Initial-Window Frequency Protocol v0

Date: 2026-06-11
Status: no-run CRM Core protocol

## Purpose

Define how CRM Core can use repeated `initial_visible_view_only` private
artifacts to detect story viewer frequency patterns without full-list traversal,
without printing identities, without Instagram actions, and without CRM writes.

This protocol does not authorize Instagram UI execution, Computer Use execution,
API calls, connector calls, story viewer collection, viewer list opening,
bounded traversal, DM opening, welcome audio, Instagram actions, CRM writes,
scoring writes, ledger writes, card writes, Fact Store writes, source-result
ledger writes, source mutation, or outreach.

## Why This Path First

The latest run captured 8 private anchors and all 8 repeated against the prior
private artifact, with `qualityGateStatus=green` and
`viewerModalCloseStatus=closed_confirmed`.

This proves a useful early frequency signal without full-list traversal.
Therefore repeated initial-window capture is safer than bounded full-list
traversal as the next step.

## Baseline Evidence

The latest repeated private-anchor capture produced this redacted baseline:

- viewer surface reached;
- viewer list opened;
- aggregate viewer count 17;
- private anchors captured 8;
- repeated private anchors 8;
- modal close confirmed;
- full-list exhaustion not attempted;
- frequency feasibility available with more repeated private captures.

This baseline proves repeated private anchors across two captures. It does not
prove full-list frequency, 7d frequency, 30d frequency, recent/archive story
viewer access, or outreach readiness.

## Operator-Supplied Long Story Best Practice

Future initial-window captures should prefer operator-supplied,
capture-friendly stories when Alejandro can provide them safely.

Best practice:

- capture-friendly stories should ideally be 15+ seconds, with 30 seconds
  preferred for pilots;
- use a simple visual layout;
- avoid stickers, polls, links, or interactive elements where possible;
- use a single active test story when practical;
- record story duration in receipts as `storyDurationClass`;
- treat `operatorSuppliedLongStory=true` as a source-health support condition,
  not as permission to widen scope;
- long-story support does not authorize full-list traversal, screenshots, DMs,
  CRM writes, scoring, outreach, source mutation, or Launch OS touch.

## Capture Cadence

Recommended cadence:

- start with manually approved captures only;
- capture at similar times when possible;
- do not run more than once per day unless separately approved;
- consider 3-5 capture windows before claiming a pattern;
- 7d and 30d labels require enough dated capture windows.

Any standing or recurring story-viewer capture boundary must be defined
separately and explicitly approved.

## Frequency Classifications

These classifications are private-only review signals:

| Classification | Meaning | Minimum evidence |
| --- | --- | --- |
| `story_view_single_private_anchor` | One private anchor appears in one capture window. | One dated private artifact. |
| `story_view_repeated_2_windows` | A private anchor repeats across two capture windows. | Two dated private artifacts. |
| `story_view_repeated_3plus_windows` | A private anchor repeats across at least three capture windows. | Three or more dated private artifacts. |
| `story_view_repeated_7d_candidate` | A private anchor repeats enough inside a seven-day span to review. | Multiple dated windows inside seven days. |
| `story_view_repeated_30d_candidate` | A private anchor repeats across a longer month-scale span. | Multiple dated windows across roughly 30 days. |
| `story_view_streak_candidate` | A private anchor appears in consecutive approved capture windows. | Consecutive dated private artifacts. |

Rules:

- these are private review signals;
- no person-level output belongs in chat;
- no CRM writes are allowed here;
- no scoring is allowed here;
- no outreach is allowed here.

## Private Artifact Behavior

Private artifacts must stay outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include:

- `run_id`;
- capture timestamp;
- story surface label/private anchor;
- viewer private anchor;
- visible-window marker;
- traversal mode;
- window index;
- `viewerModalCloseStatus`;
- quality gate fields;
- blocker classes;
- repeated-window comparison metadata.

Private artifacts must never be committed, pasted into chat, copied to
Mantis-Reports, stored in tracked docs, or stored in Mantis general memory.

## Redacted Receipt Behavior

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate viewer count;
- private anchor count;
- repeated private anchor count;
- number of capture windows compared;
- repeated-window class counts if computable;
- traversal mode;
- full-list exhaustion status;
- `viewerModalCloseStatus`;
- quality gate fields;
- blocker classes;
- closed gates;
- next safe step.

Receipts must not include:

- viewer handles;
- viewer lists;
- private anchors or hashes;
- screenshots;
- names or emails;
- DMs;
- private URLs;
- message bodies;
- private content;
- tokens, headers, env values, credential metadata, or secrets.

## Modal And Recovery Requirements

Clean capture windows require `viewerModalCloseStatus=closed_confirmed`.

Rules:

- if modal close is not confirmed, the window may count only as partial
  source-health evidence;
- do not continue to other surfaces if modal close is not confirmed;
- do not use coordinate fallback to close the modal;
- if manual recovery is required, report the blocker and stop.

## Computer Use Quality Gate

Future execution must follow:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Required boundaries:

- quality `green` or explicitly acceptable `yellow` is required;
- no screenshot-coordinate fallback;
- no blind coordinate clicking;
- no visible Instagram actions.

Unknown quality must not be reported as green. If the route degrades into
coordinate or screenshot-only behavior, stop before viewer collection.

## Stop Conditions

Stop immediately if any of the following occur:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- active computer use by Alejandro;
- visible action risk;
- any need to click, react, reply, follow, like, comment, archive, label, mark,
  or mutate;
- any need to open DMs;
- any need to print viewer handles, viewer lists, or private anchors;
- screenshot or coordinate fallback required;
- modal close cannot be confirmed and the route would continue;
- view-state ambiguity becomes unsafe.

If a stop condition appears, produce only a redacted blocker receipt if that can
be done without exposing private content.

## What Remains Separate

The following remain separate lanes:

- bounded full-list traversal;
- recent/archive story viewer surfaces;
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
- no full-list traversal in this protocol;
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

This protocol is complete when CRM Core has a no-run initial-window frequency
protocol that defines why repeated initial-window capture is the next safer
path, baseline evidence, capture cadence, private-only frequency
classifications, private artifact rules, redacted receipt rules, modal recovery
requirements, Computer Use quality gates, stop conditions, separate lanes, and
closed gates.

Any further initial-visible-window story viewer private-anchor capture must
wait for fresh Alejandro approval until a standing story-viewer capture boundary
is defined.
