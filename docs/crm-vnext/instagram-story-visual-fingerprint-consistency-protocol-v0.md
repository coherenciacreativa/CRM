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

## Same-Story Consistency Pilot Result

The same-story private visual fingerprint consistency pilot completed green on
2026-06-24.

Redacted result:

- `storyMediaClass=video`.
- `captureStrategy=matched_multi_frame_temporal_digest`.
- Two fingerprints were generated.
- Each fingerprint used three bounded frames.
- The same `dHash` algorithm/version was used for both fingerprints.
- The capture strategy was matched.
- Same-story fingerprint consistency was confirmed.
- The similarity classification was `strong_match`.
- No fingerprint conflict was detected.
- All transient and derived images were deleted and deletion was verified.
- No raw image was retained.
- OCR was not used.
- Viewer access was not opened.
- Next-story traversal was not used.
- Instagram actions performed: `0`.
- CRM/source writes performed: `0`.
- Story anchor confidence is now `medium_consistency_confirmed`.

Interpretation:

- Same-story fingerprint repeatability is proven.
- Video temporal fingerprinting is proven when the capture strategy is matched.
- Privacy and transient-image deletion controls are proven.
- Uniqueness is not yet proven.
- Distinct-story separation remains required for `high` confidence unless an
  independent strong stable source/UI identifier agrees.

Next route:

- Do not repeat same-story consistency as the next route.
- Prefer cross-lifecycle distinct-story separation using a future/new own story.
- Do not make manual story labels an operating dependency.
- Distinct-story separation should compare privately against the existing
  same-story consistency artifact.

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

- `priorStoryMediaClass`
- `currentStoryMediaClass`
- `comparisonMediaClassRelation`
- `comparisonStrategyRelation`
- `distinctStoryLifecycleConfirmed`
- `differentStoryFingerprintSeparation`
- `differentStorySimilarityClass`
- `fingerprintCollisionDetected`
- `overallStoryAnchorConfidenceAfter`

Do not claim separation if distinct lifecycle identity is uncertain.

Same-media, compatible-strategy separation is the preferred visual evidence for
high confidence. Cross-media separation is useful evidence that two artifacts
may belong to different story lifecycles, but it is weaker because it does not
prove robust same-method story discrimination.

Rules:

- lifecycle evidence remains mandatory;
- visual difference alone cannot override lifecycle ambiguity;
- cross-media separation alone cannot produce `high` confidence;
- comparisons between incompatible fingerprint strategies must be classified as
  `differentStoryFingerprintSeparation=not_comparable`;
- cross-media separation alone may produce at most
  `overallStoryAnchorConfidenceAfter=medium_consistency_confirmed_cross_media_separation`.

## Cross-Lifecycle Separation Pilot Result

The cross-lifecycle private visual fingerprint separation pilot completed green
on 2026-06-24.

Redacted result:

- Distinct lifecycle was confirmed.
- Prior and current stories were both `video`.
- `comparisonMediaClassRelation=same_media_class`.
- `comparisonStrategyRelation=matched_compatible_strategy`.
- The fingerprint algorithm class was `dHash_temporal_digest`.
- The fingerprint algorithm version was
  `dhash64_v1_sips_bmp_luma_temporal_sha256_v1`.
- Different-story fingerprint separation was confirmed.
- The similarity class was `clear_difference`.
- No fingerprint collision was detected.
- No lifecycle conflict was detected.
- Three transient images were created and all three were deleted and verified.
- Three derived images were created and all three were deleted and verified.
- No raw image was retained.
- OCR was not used.
- Viewer access was not opened.
- Next-story traversal was not used.
- Instagram actions performed: `0`.
- CRM/source writes performed: `0`.
- Story anchor confidence is now `high`.

Interpretation:

- Same-story fingerprint repeatability is proven.
- Same-media distinct-story separation is proven.
- Autonomous visual story identity is technically proven for v0.
- Manual deletion was validation evidence only, not an operating dependency.
- Routine lifecycle handling must come from private timestamps, first/last seen
  state, disappearance, current stack context, and fingerprints.

Next route:

- Visual story identity R&D is complete for v0.
- Do not continue fingerprint algorithm research as the next route.
- Move to operational multi-story sweeping: discover zero, one, or multiple
  naturally active stories and associate bounded viewer windows with each
  distinct story.

## Confidence Rubric

### `medium`

- one private fingerprint exists;
- lifecycle evidence agrees;
- deletion controls passed;
- same-story repeatability or distinct-story separation remains incomplete.

### `high`

High confidence may be reached through one of two routes.

Same-media visual separation route requires all:

- same-story fingerprint consistency confirmed;
- distinct-story separation confirmed;
- same media class and compatible or matched fingerprint strategy;
- no fingerprint/lifecycle conflict;
- all transient images deleted and verified;
- no low-confidence story edges included.

Independent identifier route requires:

- an independent strong stable source/UI identifier agrees with fingerprint and
  lifecycle evidence;
- no fingerprint/lifecycle conflict;
- all transient images deleted and verified.

Cross-media separation alone remains medium-confidence review evidence and must
not promote overall story-anchor confidence to `high`.

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
