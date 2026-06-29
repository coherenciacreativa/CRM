# Instagram Bounded Follower Source Route Design v0

Date: 2026-06-29
Status: no-run CRM Core design

## Purpose

Define a no-run bounded Instagram follower-source route for capturing private
follower anchors when notifications and official API/docs do not provide
candidate-producing new-follower evidence.

The route must be designed to support future detection and candidate queue
generation while preserving strict privacy, dedupe, and action gates.

This design does not authorize execution, Instagram UI, profile opening, DMs,
welcome audio, candidate queue generation, CRM writes, scoring, or outreach.

## Source Problem

- The notifications route is healthy but may return zero visible new-follower
  groups.
- Official docs consulted did not show new-follower or follower-delta API
  support.
- API messaging/webhook path is not setup-ready and does not solve follower
  deltas.
- A bounded UI/manual follower-source route is needed as fallback.
- The route must avoid broad scraping or full-list exhaustion.

## Candidate Source Surfaces

### Follower list surface

Possible value:

- person-level follower anchors.

Risks:

- broad private collection;
- ordering ambiguity;
- infinite scroll temptation;
- follower profiles nearby;
- accidental profile opening.

### Notifications historical surface

Possible value:

- new follower groups from historical notifications.

Risks:

- incomplete history;
- read-state ambiguity;
- identity may be visible only in notification text;
- older events may already be welcomed/seen.

### Manual evidence packet

Possible value:

- fast backfill or specific follower evidence.

Risks:

- not fully autonomous;
- requires private artifact route if handles/person-level evidence is involved.

### Future API/webhook

Possible value:

- robust if supported later.

Risks:

- not supported/setup-ready for follower deltas now.

## Route Recommendation

Recommended default v0 route:

```text
bounded_follower_surface_initial_window
```

Definition:

- use the follower list or follower/source surface only under explicit approval;
- capture only the initial visible follower window;
- no scrolling;
- no full-list traversal;
- no follower profile opening;
- no DMs;
- no source action;
- store private anchors only in private artifacts;
- use redacted aggregate receipts;
- compare against prior private follower-anchor artifacts to infer newly seen
  anchors.

Why this route:

- it has lower collection risk than full traversal;
- it can produce private anchors;
- it is compatible with dedupe;
- it is useful for repeated future runs;
- it is imperfect but sufficient for v0.

## Future Optional Route

Future optional route:

```text
bounded_follower_surface_delta_window
```

This route is allowed only after v0 proves safe.

Possible features:

- one bounded scroll or page advance;
- max follower anchors cap;
- strict time budget;
- no full exhaustion;
- no profile opening;
- stop on instability.

This design does not authorize `bounded_follower_surface_delta_window`.

## Private Anchor Model

Future private artifacts may include these private fields:

- `run_id`
- `detected_at`
- `source_surface`
- `surface_mode`
- `private_follower_anchor`
- `visible_position`
- `dedupe_status`
- `welcome_history_status`
- `candidate_status`
- `source_health_state`
- `blocker_classes`

Dedupe statuses:

- `newly_seen_private_anchor`
- `previously_seen_private_anchor`
- `duplicate_current_run`
- `ambiguous_identity`
- `already_welcomed`
- `needs_private_review`
- `not_for_outreach`

Rules:

- do not claim "new follower" solely from being visible in the follower list;
- classify as `newly_seen_private_anchor` unless the source surface proves
  newness;
- "newly seen" is not necessarily newly followed;
- candidate queue generation requires a separate approval;
- send approval remains separate.

## Baseline And Delta Logic

- The first run establishes a private baseline.
- Future runs compare current private anchors against the baseline.
- New-to-baseline anchors become `newly_seen_private_anchor`.
- Only if source evidence indicates recent follow should an anchor be classified
  as a new-follower candidate.
- If no prior baseline exists, do not generate a candidate queue automatically.
- Historical notification backfill may seed welcome history but requires
  separate approval.

## Already-Welcomed Safeguards

Reference:

```text
docs/crm-vnext/instagram-new-follower-welcome-audio-lane-design-v0.md
```

Rules:

- no send without already-welcomed check;
- unknown welcome-history status blocks send;
- identity ambiguity blocks send;
- suppression/safety blocks send;
- story views/email warmth do not imply DM permission.

## Browser Backend

This is design only. It does not select or execute a browser backend.

### Chrome Extension

Pros:

- proved healthy for the notifications surface;
- authenticated account context works.

Cons:

- route-specific visibility can fail, as with own-story surface;
- follower surface needs separate proof.

### Native Safari

Pros:

- proved reliable for own-story surfaces when a standard authenticated window is
  isolated.

Cons:

- shared Safari isolation can fail during concurrent human use;
- should not be used while Alejandro is actively using Safari.

Recommendation:

- design the future pilot as Chrome-primary for follower list surface if the
  Chrome route is visible and stable;
- do not invoke Safari unless a future exact route explicitly approves dedicated
  standard Safari;
- use browser orchestrator preflight and primary-green short circuit;
- no coordinates or screenshot-navigation fallback.

## Future Approval Boundaries

This design grants no execution approval.

### Detection baseline only

Suggested approval phrase:

```text
I approve one CRM Core Instagram bounded follower-source baseline run only. Use the approved browser/source route, capture only the initial visible follower window into a private artifact, write redacted aggregate receipts, do not scroll, do not open follower profiles or DMs, do not generate a candidate queue, do not send welcome audio, do not perform Instagram actions, and do not write CRM state.
```

This approval would not authorize candidate queue generation or sending.

### Delta detection run

Suggested approval phrase:

```text
I approve one CRM Core Instagram bounded follower-source delta run using the approved private baseline. Capture only the initial visible follower window, compare private anchors locally, write redacted aggregate receipts, do not scroll, do not open follower profiles or DMs, do not generate a candidate queue, do not send welcome audio, do not perform Instagram actions, and do not write CRM state.
```

This approval would not authorize candidate queue generation or sending.

## Private Artifacts

Future artifacts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

They may include:

- private follower anchors;
- visible position;
- source surface;
- run timestamps;
- dedupe status;
- welcome history status if checked under later approval;
- blocker classes.

They must never be:

- committed;
- pasted into chat;
- copied to Mantis-Reports;
- stored in tracked docs;
- stored in Mantis general memory;
- used as send approval.

## Redacted Receipts

Receipts should live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

They may include:

- run status;
- source-health state;
- source surface;
- surface mode;
- visible follower anchors captured count;
- duplicate current run count;
- previously seen count;
- newly seen count;
- ambiguous identity count;
- baseline path label only;
- private artifact path label only;
- candidate queue generated false;
- welcome audio sent false;
- DMs opened false;
- Instagram actions 0;
- CRM writes 0;
- blockers;
- recommended next step.

They must not include:

- handles;
- profile URLs;
- follower profile contents;
- private anchors;
- screenshots;
- DMs;
- message bodies;
- tokens/headers/env/credentials;
- private content.

## Stop Conditions

Stop on:

- failed browser preflight;
- wrong account;
- login/checkpoint/CAPTCHA;
- unexpected modal;
- profile surface ambiguity;
- follower profile would open;
- need to scroll for useful data;
- need to open DMs;
- need to use coordinates or screenshot fallback;
- source-action risk;
- private output exposure;
- candidate queue generation temptation;
- CRM/source mutation requirement.

## Decision Rules

After design:

- if candidate-producing follower anchors are urgent, approve a baseline run;
- if paid ads are not active and low volume is expected, repeat notifications
  later may be enough;
- if API setup becomes ready, re-evaluate API route;
- if baseline run succeeds, next route is delta run, not send;
- candidate queue comes only after a detection artifact with private anchors
  exists.

## What Remains Separate

- baseline execution;
- delta execution;
- candidate queue generation;
- already-welcomed history check;
- welcome audio send;
- DM opening;
- MailerLite onboarding;
- CRM writes;
- source mutation;
- Launch OS.

## Closed Gates

- no execution;
- no UI, Computer Use, or `@Chrome`;
- no follower profile opening;
- no DMs;
- no welcome audio;
- no candidate queue;
- no Instagram actions;
- no CRM/source writes;
- no scoring, ledgers, cards, Fact Store, outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Completion Boundary

Complete when CRM Core has a no-run design for a bounded follower-source route
that can later capture private follower anchors into private artifacts, produce
redacted receipts, establish or compare a private baseline, and preserve all
candidate/send/write gates.
