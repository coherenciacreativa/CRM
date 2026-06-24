# Instagram Story Visual Fingerprint Consistency Protocol v0

Date: 2026-06-23
Status: no-run CRM Core protocol

## Purpose

Define how CRM Core can validate whether private visual story fingerprints are:

- repeatable for the same story;
- distinguishable across different stories;
- robust enough for autonomous story dedupe;
- safe without retaining raw story imagery.

This protocol does not authorize execution, UI use, Computer Use, `@Chrome`,
Instagram access, screenshot or fingerprint capture, viewer-list opening, DMs,
Instagram actions, CRM/source writes, Launch OS work, or use of
`/Users/alejandrogomez/CRM`.

## Current Baseline

Redacted facts:

- One story was fingerprinted.
- `dHash` was derived locally.
- Raw and derived images were deleted and deletion was confirmed.
- No raw imagery was retained.
- Story anchor confidence increased from `low` to `medium`.
- Same-story fingerprint consistency is not yet proven.
- Distinct-story separation is not yet proven.

## Media-Class Handling

Supported media classes:

- `storyMediaClass=static_image`
- `storyMediaClass=video`
- `storyMediaClass=unknown`

### Static Image

A single bounded frame may be sufficient for a candidate fingerprint, but
repeatability must still be tested.

### Video

A single arbitrary-frame `dHash` must not support high confidence.

For video stories, a future approved consistency route should use either:

- a controlled relative capture point after story opening; or
- a small temporal fingerprint composed of multiple bounded frames.

Do not assume one video frame identifies the whole story.

## Fingerprint Modes

Defined modes:

- `single_frame_dhash`
- `single_frame_phash`
- `multi_frame_temporal_digest`
- `insufficient_fingerprint_method`

Recommended future video mode:

```text
multi_frame_temporal_digest
```

Design characteristics:

- small fixed frame count, for example 3;
- frames sampled during one bounded story opening;
- no pausing/holding required;
- deterministic ordering;
- one aggregate private digest;
- every raw/derived frame deleted immediately;
- deletion verified for every temporary file.

This is design only and does not authorize execution.

## Same-Story Consistency

A future approved pilot should:

1. Fingerprint one reachable own story.
2. Leave and reopen the same story.
3. Re-fingerprint using the same algorithm/version and media-class strategy.
4. Compare fingerprints privately.
5. Report only consistency classification.

Suggested result fields:

- `sameStoryFingerprintConsistency`
- `sameStorySimilarityClass`
- `sameStorySimilarityThresholdUsed`
- `fingerprintAlgorithmVersion`
- `mediaClass`
- `captureStrategyMatched`

Suggested classifications:

- `confirmed`
- `probable`
- `not_confirmed`
- `not_tested`

The raw digest and similarity value must remain private.

## Distinct-Story Separation

Distinct-story separation may be tested in either of two ways.

### Same-Run Route

Only if a separately approved and safe second-story traversal route exists.

### Cross-Lifecycle Route

Preferred when second-story traversal is unavailable:

- fingerprint Story A in one approved run;
- later fingerprint a newly published/distinct Story B;
- compare the private artifacts locally;
- use lifecycle evidence to prove they are different story lifecycles;
- do not require Alejandro to label them manually.

Result fields:

- `differentStoryFingerprintSeparation`
- `distinctStoryLifecycleConfirmed`
- `fingerprintCollisionDetected`
- `differentStorySimilarityClass`

Do not claim separation if distinct lifecycle identity is uncertain.

## Confidence Rubric

### `medium`

- one private fingerprint exists;
- lifecycle evidence agrees;
- deletion controls passed;
- same-story repeatability or distinct-story separation remains incomplete.

### `high`

Require all:

- same-story fingerprint consistency confirmed;
- distinct-story separation confirmed, or an independent stable source/UI
  identifier agrees;
- no fingerprint/lifecycle conflict;
- all transient images deleted and verified;
- no low-confidence story edges included.

### Blocked

- fingerprint collision;
- inconsistent same-story result;
- lifecycle conflict;
- raw-image deletion not confirmed;
- media strategy unsuitable for video;
- private content exposure risk.

## Dedupe Invariants

- one viewer counts once per distinct high/medium-confidence story anchor;
- same-story recapture never creates another story-view edge;
- visual similarity alone must not merge two story lifecycles;
- fingerprint similarity cannot override contradictory lifecycle evidence;
- exact buckets and inclusive `2plus`/`3plus` metrics remain distinct;
- low/unknown confidence anchors must not support cross-story frequency.

## Private Artifact Behavior

Artifacts remain under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

They may privately include:

- fingerprint algorithm/version;
- media class;
- capture strategy;
- private digest;
- temporal component digests if required;
- lifecycle evidence;
- similarity comparison;
- collision/conflict flags;
- confidence result;
- image deletion state.

They must not contain raw story images after execution.

They must never be committed, copied to Mantis-Reports, pasted into chat, stored
in tracked docs, or stored in Mantis general memory.

## Transient-Image Controls

For every future image or frame:

- create under `/tmp/` only;
- never print its path;
- never upload or attach it;
- never copy it to Mantis-Reports or the private artifact folder;
- delete immediately after digest derivation;
- delete crops, normalized images, previews, thumbnails, and duplicates;
- verify every temporary image no longer exists;
- block if deletion cannot be confirmed.

## Redacted Receipt Behavior

Receipts may include only:

- fingerprints generated count;
- algorithm class/version;
- media class;
- same-story consistency status;
- different-story separation status;
- collision/conflict status;
- confidence before/after;
- transient deletion confirmations;
- OCR/viewer/action counts;
- browser quality;
- blockers;
- closed gates;
- next safe step.

Receipts must not include:

- story images;
- story content;
- digests/checksums;
- similarity values;
- story anchors;
- profile routes/handles;
- viewer identities;
- private browser content.

## Computer Use Route

Future fingerprint execution should use:

- native Computer Use;
- a dedicated standard authenticated Safari window;
- neutral native click/keyboard preflight first;
- Safari Private Browsing forbidden;
- own-story access through native accessibility press;
- dedicated window returned to neutral after execution.

Chrome own-story visibility remains degraded for this route.

## Stop Conditions

Stop on:

- failed neutral preflight;
- Private Browsing;
- auth wall/account mismatch;
- no reachable own story;
- inability to bound image capture to the story surface;
- coordinates or screenshot-navigation fallback needed;
- OCR/content interpretation needed;
- unapproved next-story traversal;
- fingerprint method unsuitable for media class;
- inconsistent lifecycle evidence;
- transient deletion not confirmed;
- viewer-list/DM/source-action/CRM-write requirement.

## What Remains Separate

- execution of same-story consistency;
- execution of distinct-story separation;
- second-story traversal;
- viewer-list capture;
- story frequency computation;
- DMs/email bridge;
- welcome audio;
- API/webhook investigation;
- CRM writes, ledgers, cards, Fact Store, scoring, outreach;
- Launch OS.

## Closed Gates

- no execution in this task;
- no screenshots/fingerprints;
- no viewers or DMs;
- no next-story traversal;
- no OCR or story interpretation;
- no Instagram action;
- no CRM/source writes;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.
