# Instagram Story Anchor Confidence Hardening Protocol v0

Date: 2026-06-19
Status: no-run CRM Core protocol

## Purpose

Define how CRM Core can autonomously raise `storyAnchorConfidence` from medium
toward high without requiring Alejandro to label each story manually, without
exposing story content, and without inflating cross-story frequency.

This protocol does not authorize Instagram execution, Computer Use execution,
Instagram UI opening, API calls, connector calls, DM opening, viewer-list
access, story screenshot capture, visual fingerprint capture, welcome audio,
Instagram actions, CRM writes, scoring writes, ledger writes, card writes, Fact
Store writes, source-result ledger writes, source mutation, or outreach.

## Current Boundary

Redacted facts:

- Autonomous metadata-only story anchors are working.
- Four distinct story anchors were compared.
- One private anchor appeared across three-plus story anchors.
- Current story-anchor confidence is medium.
- No visual fingerprint has been used.
- Frequency remains review-only.

Current meaning:

- The first cross-story signal is useful early sustained-attention evidence.
- It is not a scoring signal, outreach permission, CRM write trigger, or
  person-level output surface.
- Confidence hardening should happen before accumulating many more frequency
  claims.

## Autonomous Identity Signal Hierarchy

Private story-identity evidence, ordered from strongest to weakest:

1. Stable Instagram UI identifier, story URL token, media identifier, or other
   source-provided identifier, if safely exposed by the UI.
2. Private visual/content fingerprint derived under a separately approved
   route.
3. Story lifecycle continuity:
   - `first_seen_at`;
   - `last_seen_at`;
   - approximate publication/expiry window;
   - disappearance from active stack.
4. Story stack context:
   - active story stack size;
   - story position;
   - story order/sequence;
   - predecessor/successor context.
5. Media metadata:
   - video/static type;
   - duration class;
   - capture friendliness;
   - approximate dimensions or presentation class.
6. Capture timing and private UI route context.

Rules:

- Stack position alone is never a stable story identity.
- Timestamps alone are not enough for high confidence.
- Manual labels are optional debugging aids only.
- Alejandro is not expected to label normal stories.

## Story-Anchor Methods

Allowed method labels:

- `source_provided_stable_identifier`
- `private_visual_fingerprint_plus_lifecycle`
- `lifecycle_plus_stack_context`
- `timing_stack_duration_composite`
- `stack_position_only`
- `insufficient_identity_evidence`

Method labels are private classification metadata. Standard receipts may report
method counts or the selected method label, but must not expose story anchors,
raw identifiers, screenshots, fingerprints, or story contents.

## Confidence Rubric

### `high`

Examples:

- A stable source/UI identifier is safely available.
- Private visual fingerprint, lifecycle, and stack context agree.
- Two independent strong identity signals agree with no conflict.

### `medium`

Examples:

- Lifecycle, timing, duration, and stack context agree.
- No stable source ID or visual fingerprint is available.
- Identity is useful for review but not authoritative.

### `low`

Examples:

- Stack position plus weak timing only.
- Active stack changed and lifecycle continuity is uncertain.

### `unknown`

- Insufficient or contradictory identity evidence.

Rules:

- Only medium/high anchors may contribute to early cross-story summaries.
- High confidence is preferred before standing frequency operation.
- Low/unknown anchors must not contribute to cross-story frequency.
- Conflicting signals must lower confidence or block the edge.

## Stable UI Identifier Discovery Route

Design only; do not execute.

A future approved pilot may determine whether Instagram safely exposes:

- story/media ID;
- stable story URL token;
- internal accessible label;
- stable timestamp or publication marker;
- another non-secret UI identity attribute.

Rules:

- No API assumptions.
- No DOM scraping unless separately approved and supported.
- No secrets, cookies, auth headers, or raw page dumps.
- Only private identifier/digest storage.
- Receipt reports availability and confidence only.

## Metadata-Only Discovery Result

The native dedicated-Safari metadata-only discovery run reached Alejandro's
own-story surface through a safe isolated window. The profile story entry was
visible and actionable, and `native_accessibility_press` opened the own active
story surface.

Findings:

- Same-story consistency was confirmed for the first reachable story.
- The identifier source was `lifecycle_stack_timing_composite` only.
- No stable source/UI identifier was found.
- Story-anchor confidence remained `low`.
- The second active story could not be reached through a safe accessibility
  control.
- Viewer lists were not opened.
- No story content, screenshots, visual fingerprints, Instagram actions,
  CRM/source writes, Launch OS docs, or `/Users/alejandrogomez/CRM` were
  touched.

Interpretation:

- Metadata-only discovery should not be repeated as the primary confidence
  hardening route.
- Low-confidence anchors must not contribute to cross-story frequency.
- The next identity-hardening candidate is a separately approved transient
  private visual fingerprint route.
- Visual fingerprinting solves story identity, not multi-story traversal.
- Next-story traversal remains a separate approval/design boundary.
- Manual story labels should remain optional debugging aids and must not become
  an operating dependency.

## Private Visual Fingerprint Route

Design only; do not execute.

A future approved route may create a private fingerprint from a transient local
story image solely for story dedupe.

Required safeguards:

- Raw image may exist only transiently outside the repo.
- Raw screenshot must never enter chat, Mantis-Reports, tracked docs, commits,
  or Mantis general memory.
- Derive a private perceptual/content digest locally.
- Store only the digest and safe fingerprint metadata in the private artifact.
- Delete the transient raw image immediately after digest generation.
- Verify deletion.
- If deletion cannot be confirmed, block.
- Do not perform OCR or save full story text unless separately approved.
- Do not expose private visual content.

Required future receipt fields:

- `privateVisualFingerprintUsed`
- `transientImageCreated`
- `transientImageDeletedConfirmed`
- `storyAnchorMethod`
- `storyAnchorConfidence`
- `fingerprintConflictDetected`

## Multiple Active Stories

Autonomous handling when several stories are active:

- Create a private `active_story_stack_map`.
- Infer one candidate story anchor per story.
- Preserve stack position and lifecycle context.
- Never treat position alone as identity.
- Map checked and skipped stories.
- Assign confidence separately to each anchor.
- Stop frequency processing for any story whose identity remains low/unknown.

## Dedupe Invariants

Rules:

- One viewer counts once per distinct story anchor.
- Same story plus same viewer across multiple captures is
  `same_story_reobservation`.
- Same viewer across distinct medium/high story anchors is
  `cross_story_repeat`.
- Confidence hardening must never merge two distinct stories merely because
  their visual layouts are similar.
- Fingerprint similarity alone cannot override conflicting lifecycle evidence.
- Inclusive metrics such as `2plus` must be clearly distinguished from exact
  buckets such as `exactly_2`.

## Private Artifact Behavior

Future artifacts remain under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

They may privately contain:

- story anchor candidates;
- method and confidence;
- stable source/UI identifier if safely available;
- private fingerprint digest;
- lifecycle evidence;
- stack map;
- confidence evidence;
- conflicts;
- viewer edges;
- same-story and cross-story markers.

They must never be committed, pasted into chat, copied to Mantis-Reports,
stored in tracked docs, or stored in Mantis general memory.

## Redacted Receipt Behavior

Receipts may include only:

- number of story anchors evaluated;
- confidence counts;
- method counts;
- stable UI identifier availability;
- private fingerprint route used/not used;
- transient deletion confirmation;
- conflicts/blockers;
- same-story and cross-story aggregate counts;
- quality gate state;
- closed gates;
- next safe step.

Receipts must not include story screenshots, story contents, private
fingerprints, story anchors, viewer anchors, handles, names, emails, private
URLs, tokens, headers, env values, credentials, or private content.

## Computer Use Quality Gate

Follow:

```text
docs/crm-vnext/instagram-computer-use-quality-gate-v0.md
```

Future UI execution must begin with a neutral native Computer Use preflight.

Rules:

- Native click and keyboard must be green before Instagram.
- No coordinate or screenshot-coordinate fallback.
- One fresh-window recovery may be allowed only if explicitly approved.
- Unknown/degraded quality cannot produce high-confidence story identity.

## Stop Conditions

Stop on:

- failed neutral native preflight;
- login/checkpoint/CAPTCHA;
- unexpected modal;
- active computer use by Alejandro;
- any visible Instagram action risk;
- need for coordinates or screenshot-navigation fallback;
- inability to distinguish two stories above low confidence;
- conflicting lifecycle/fingerprint/source-ID evidence;
- need to expose story content or private identities;
- transient image deletion not confirmed;
- modal close not confirmed and route would continue;
- need to open DMs;
- source or CRM mutation.

## What Remains Separate

- actual stable-ID discovery execution;
- private visual fingerprint execution;
- initial-window viewer capture;
- bounded full-list traversal;
- recent/archive viewer surfaces;
- DM/email identity bridge;
- welcome audio;
- notifications standing operation;
- Instagram API/webhook investigation;
- CRM writes, ledgers, scoring, cards, Fact Store;
- outreach;
- Launch OS.

## Closed Gates

- no Instagram execution in this task;
- no story screenshots or fingerprint capture;
- no viewer collection;
- no DMs;
- no welcome audio;
- no CRM writes;
- no ledgers, cards, Fact Store, scoring, or outreach;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.
