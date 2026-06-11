# Instagram Story Viewer Private Artifact Repeat Capture Protocol v0

Date: 2026-06-11
Status: no-run CRM Core protocol

## Purpose

Define how CRM Core can move from one partial private viewer-anchor capture to
safe repeated story viewer frequency capture, without printing viewer
identities, taking Instagram actions, or writing CRM state.

This protocol does not authorize Instagram UI execution, Computer Use execution,
API calls, connector calls, story viewer collection, viewer list opening,
bounded traversal, DM opening, welcome audio, Instagram actions, CRM writes,
scoring writes, ledger writes, card writes, Fact Store writes, source-result
ledger writes, source mutation, or outreach.

## Baseline Result

The first private artifact pilot produced this redacted baseline:

- story surface reached;
- viewer list opened;
- aggregate viewer count 17;
- private anchors captured 8;
- full list not exhausted;
- modal close not confirmed;
- frequency requires repeated private artifact captures.

This baseline proves partial private viewer-anchor capture. It does not prove
full-list capture, repeat frequency, recent/archive availability, or clean modal
recovery.

## Capture Modes

| Mode | Meaning | Boundary |
| --- | --- | --- |
| `initial_visible_view_only` | Captures only the first visible viewer window. | Safest mode, but incomplete and cannot prove full-list exhaustion. |
| `bounded_full_list_traversal` | Attempts limited safe traversal/scroll after explicit approval while native Computer Use remains stable. | Requires max scrolls, max time, no coordinate fallback, and redacted receipts only. |
| `repeated_private_anchor_capture` | Compares private anchors across runs to infer frequency. | Requires private artifacts only, no person-level output in chat, and no CRM writes. |

`initial_visible_view_only` is the only mode proven by the first pilot. The
other modes require a fresh approval boundary.

## Modal Close / Recovery Protocol

The viewer modal must be closed or left in a known safe state before a run is
considered clean.

Rules:

- if native close is attempted but not confirmed, classify
  `source_health_state` as `partial`;
- do not continue to other Instagram surfaces if modal close is not confirmed;
- do not use coordinate fallback to close private viewer modals;
- if modal cannot be closed safely, stop and ask Alejandro for manual recovery
  or approval for a fresh-window reset;
- future receipts must include `viewerModalCloseStatus`.

Suggested `viewerModalCloseStatus` values:

- `not_opened`;
- `closed_confirmed`;
- `close_attempted_not_confirmed`;
- `left_open_blocked`;
- `manual_recovery_required`.

## Full-List Traversal Rules

Full-list traversal is design-only here and must not run without explicit
approval.

Rules for any future approved traversal:

- traversal must be bounded by max scrolls, max time, and no coordinate
  fallback;
- no viewer handles may appear in chat or standard receipts;
- private anchors may go only to the private artifact;
- stop if scrolling risks visible action, unstable UI, coordinate fallback,
  screenshot capture, or private content exposure;
- if list exhaustion cannot be proven, receipt must say
  `full_list_exhaustion: not_proven`.

Future approvals should name the traversal mode, max scroll count, max elapsed
time, modal close requirement, and output paths.

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

- repeated views are attention/presence signals;
- story views are not outreach permission;
- story views are not scoring writes;
- no person-level output belongs in chat;
- no CRM writes are allowed here.

## Private Artifact Behavior

Future artifacts must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may include:

- `run_id`;
- capture timestamp;
- story surface label;
- story private anchor;
- viewer handle/private anchor;
- viewer order/position if needed;
- visible-window marker;
- traversal mode;
- full-list exhaustion status;
- `viewerModalCloseStatus`;
- quality gate fields;
- blocker classes.

Private artifacts must never be committed, pasted into chat, stored in tracked
docs, copied to Mantis-Reports, or stored in Mantis general memory.

## Redacted Receipt Behavior

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts may include:

- aggregate viewer count;
- private anchor count;
- stories checked;
- repeated viewer count if computable;
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

## Computer Use Quality Gate

Future execution must follow:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Required boundaries:

- no screenshot-coordinate fallback for viewer collection;
- no blind coordinate clicking;
- stop if native/stable Computer Use is unavailable and interaction is
  required;
- quality `green` or explicitly acceptable `yellow` is required for any
  repeated capture;
- no visible Instagram actions.

Unknown quality must not be reported as green. If the route degrades into
coordinate or screenshot-only behavior, stop before viewer collection or
traversal.

## Stop Conditions

Stop immediately if any of the following occur:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- active computer use by Alejandro;
- visible action risk;
- any need to click, react, reply, follow, like, comment, archive, label, mark,
  or mutate;
- any need to open DMs;
- any need to print viewer handles or viewer lists;
- any need to export screenshots;
- coordinate or screenshot fallback required;
- modal close cannot be confirmed and the route would continue;
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

This protocol is complete when CRM Core has a no-run repeat-capture protocol
that defines baseline evidence, capture modes, modal close recovery,
full-list traversal rules, frequency model, private artifact behavior, redacted
receipt behavior, Computer Use quality gates, stop conditions, separate lanes,
and closed gates.

Any repeated story viewer private artifact capture or bounded full-list
traversal must wait for fresh Alejandro approval.
