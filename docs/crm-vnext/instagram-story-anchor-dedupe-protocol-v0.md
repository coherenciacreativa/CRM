# Instagram Story Anchor Dedupe Protocol v0

Date: 2026-06-11
Status: no-run CRM Core protocol

## Purpose

Define how CRM Core should identify distinct Instagram stories privately and
deduplicate viewer observations so repeated captures of the same story do not
inflate story-view frequency.

This protocol does not authorize Instagram UI execution, Computer Use
execution, API calls, connector calls, DM opening, story viewer collection,
viewer list opening, story screenshot or fingerprint capture, welcome audio,
Instagram actions, CRM writes, scoring writes, ledger writes, card writes, Fact
Store writes, source-result ledger writes, source mutation, or outreach.

Core rule:

```text
story_private_anchor + viewer_private_anchor = one deduplicated story-view edge
```

Frequency means appearing across distinct story anchors or story lifecycles,
not being reobserved across multiple captures of the same story.

## Why This Is Needed

Stories remain live for about 24 hours, and Alejandro may publish multiple
stories at different times in the same 24-hour window. CRM Core must
distinguish:

- same viewer reobserved on the same story;
- same viewer appearing across different stories;
- viewer count on one story;
- true cross-story frequency.

The existing initial-window private-anchor lane can capture private viewer
anchors into private artifacts and summarize aggregate frequency classes in
redacted receipts. It still needs autonomous private story identity before it
can make stronger cross-story frequency claims.

## Core Data Model

Private concepts:

| Concept | Meaning |
| --- | --- |
| `capture_window` | A bounded approved observation window with timestamp, route, quality gate fields, and closed gates. |
| `story_private_anchor` | Private story identity inferred from timing, stack context, lifecycle, and optionally approved private fingerprint evidence. |
| `viewer_private_anchor` | Private viewer identity anchor stored only in private artifacts. |
| `story_view_edge` | One deduplicated relationship between one `story_private_anchor` and one `viewer_private_anchor`. |
| `same_story_reobservation` | The same viewer anchor observed again on the same story anchor across multiple captures. |
| `cross_story_repeat` | The same viewer anchor observed across different story anchors. |
| `active_story_stack` | The current set of active stories visible in the Instagram story stack during a capture window. |
| `story_lifecycle` | The approximate lifetime evidence for a story, including first seen, latest seen, likely expiry, and stack/order changes. |
| `story_anchor_confidence` | Confidence that the inferred `story_private_anchor` represents a distinct story. |

Rule:

- `story_private_anchor + viewer_private_anchor` equals one deduplicated
  `story_view_edge`.
- Multiple observations of that same pair are consistency evidence, not
  additional views.

## Autonomous Story Identity

CRM Core should infer `story_private_anchor` without requiring Alejandro to
manually label every story.

Potential private story anchor ingredients:

- `first_seen_at`;
- capture timestamp;
- story stack position;
- active story stack size;
- story duration class;
- story capture friendliness;
- story lifecycle window;
- private visual/content fingerprint if approved;
- private UI route/context;
- story order/sequence context;
- approximate expiry/lifecycle;
- optional operator-supplied label as support or debugging evidence.

`operatorSuppliedStoryLabel` is optional. Alejandro should not be required to
label stories as normal workflow. Manual labels can help tests and debugging,
but they must not become a production-style dependency.

## Private Visual/Content Fingerprint

This section is design only and does not authorize execution.

CRM Core may later use approved private visual observations to distinguish
stories when timing and stack context are insufficient.

Rules:

- private fingerprints may be stored only in private artifacts;
- standard receipts may report only `story_anchor_confidence` and
  `story_anchor_method`;
- no story screenshots in chat;
- no story screenshots in Mantis-Reports standard receipts;
- no full story text or content in chat;
- no sensitive visual content printed;
- no private visual artifacts committed to the repo;
- no Mantis general memory storage of private story fingerprints.

Possible safe receipt fields:

- `storyAnchorMethod`;
- `storyAnchorConfidence`;
- `privateVisualFingerprintUsed`: `true | false`;
- `operatorSuppliedStoryLabelUsed`: `true | false`;
- `storyStackPositionUsed`: `true | false`.

## Multiple Active Stories

CRM Core should model multiple active stories with an `active_story_stack_map`.

The map should support:

- `activeStoryStackSize`;
- `storyStackPosition`;
- `storyPrivateAnchor` per story;
- `storyAnchorConfidence` per story;
- `storyDurationClass` per story;
- `storyCaptureFriendliness` per story;
- which stories were checked;
- which stories were not checked;
- why skipped.

Story stack position alone is not a stable story identity. Stack position can
change as stories expire or new stories are posted. Position should be combined
with timing, fingerprint, and lifecycle evidence before supporting frequency
claims.

## Dedupe Rules

Rules:

- same viewer plus same story plus multiple captures equals
  `same_story_reobservation`, not multiple story views;
- same viewer plus different stories equals `cross_story_repeat`;
- a viewer counts once per story;
- same-story reobservation supports capture consistency, not frequency;
- cross-story repeats support private attention/presence frequency;
- low story-anchor confidence must not support strong frequency claims.

The protocol should keep these counts separate so a repeated observation of one
live story cannot be mistaken for a viewer appearing across multiple stories.

## Frequency Summary Language

Future redacted summaries must distinguish:

- `capture_windows_compared`;
- `distinct_story_anchors_compared`;
- `story_anchor_confidence_high`;
- `story_anchor_confidence_medium`;
- `story_anchor_confidence_low`;
- `same_story_reobserved_anchors`;
- `cross_story_repeated_anchors_2plus`;
- `cross_story_repeated_anchors_3plus`;
- `private_viewers_seen_1_story`;
- `private_viewers_seen_2_stories`;
- `private_viewers_seen_3plus_stories`;
- `story_view_streak_candidates`.

The summary must not say "frequent viewers" if the evidence is only same-story
reobservation.

## Story Anchor Confidence

Confidence values:

| Confidence | Guidance |
| --- | --- |
| `high` | Private fingerprint, lifecycle, and stack context agree. |
| `medium` | Timing and stack context agree, but fingerprint evidence is partial or absent. |
| `low` | Only stack position or weak timing evidence supports the story identity. |
| `unknown` | Insufficient story identity evidence. |

Only medium/high story anchors may contribute to early cross-story frequency
summaries. Low/unknown anchors remain source-health or review-only.

## Private Artifact Behavior

Future private artifacts must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include:

- `run_id`;
- capture timestamp;
- capture window id;
- active story stack map;
- story private anchors;
- story anchor method;
- story anchor confidence;
- private visual/content fingerprint if approved;
- viewer private anchors;
- story_view_edges;
- same-story reobservation markers;
- cross-story repeat markers;
- quality gate fields;
- timing fields;
- blocker classes.

Private artifacts must never be committed, pasted into chat, copied to
Mantis-Reports, stored in tracked docs, or stored in Mantis general memory.

## Redacted Receipt Behavior

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate story count;
- active story stack size;
- number of story anchors inferred;
- story anchor confidence counts;
- number of story_view_edges;
- same-story reobservation counts;
- cross-story repeated anchor counts;
- frequency class counts;
- quality gate status;
- blocker classes;
- closed gates;
- next safe step.

Receipts must not include:

- viewer handles;
- viewer lists;
- story screenshots;
- private visual fingerprints;
- story private anchors;
- viewer private anchors;
- private hashes;
- names or emails;
- DMs;
- private URLs;
- message bodies;
- private content;
- tokens, headers, env values, credential metadata, or secrets.

## Computer Use Quality Gate

Future execution must follow:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Required boundaries:

- no screenshot-coordinate fallback;
- no blind coordinate clicking;
- no visible Instagram actions;
- unknown quality must not be reported as green.

If the route degrades into coordinate or screenshot-only behavior, stop before
viewer collection or story identity capture.

## Stop Conditions

Stop immediately if any of the following occur:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- active computer use by Alejandro;
- visible action risk;
- story identity cannot be inferred above low confidence but would be used for
  frequency;
- any need to print story screenshots or private visual content;
- any need to print viewer handles, viewer lists, or private anchors;
- any need for coordinate or screenshot fallback;
- any need to open DMs;
- modal close cannot be confirmed and the route would continue;
- view-state ambiguity becomes unsafe.

If a stop condition appears, produce only a redacted blocker receipt if that can
be done without exposing private content.

## What Remains Separate

The following remain separate lanes:

- initial-window story viewer captures;
- bounded full-list traversal;
- story stabilization or pausing route;
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
- no full-list traversal;
- no story stabilization or pausing unless separately approved;
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

This protocol is complete when CRM Core has a no-run design for autonomous
story identity, story-anchor confidence, and viewer-edge dedupe that prevents
same-story reobservations from inflating cross-story frequency claims.

Any execution that uses story anchor dedupe requires a fresh explicit approval
boundary.
