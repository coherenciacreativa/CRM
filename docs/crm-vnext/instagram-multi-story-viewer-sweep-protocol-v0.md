# Instagram Multi-Story Viewer Sweep Protocol v0

Date: 2026-06-24
Status: no-run CRM Core protocol

## Purpose

Define an operational v0 for zero, one, or multiple naturally active own
Instagram stories.

The sweep should autonomously discover active own stories, infer a private
identity for each, capture a bounded initial viewer window for each reachable
story, and create deduplicated private story-view edges without requiring
Alejandro to:

- publish at fixed times;
- label stories;
- delete stories;
- order stories for the system;
- indicate how many stories are active.

This protocol does not authorize execution, UI use, Computer Use, `@Chrome`,
Instagram access, screenshot or fingerprint capture, viewer-list opening, DMs,
Instagram actions, CRM/source writes, Launch OS work, or use of
`/Users/alejandrogomez/CRM`.

## Core Unit

Use:

```text
story_private_anchor + viewer_private_anchor = one deduplicated story_view_edge
```

Rules:

- same viewer plus same story across repeated sweeps is one edge;
- same viewer across distinct stories is cross-story frequency;
- repeated capture of the same story must not inflate frequency;
- high/medium story identity may be used;
- low/unknown story identity must not contribute to cross-story frequency;
- same-story reobservation supports consistency and completeness only;
- story views never imply outreach permission;
- no story-view edge may produce an Instagram action, CRM write, scoring write,
  or outbound action in this v0.

## Natural Lifecycle Handling

Infer lifecycle privately from:

- `first_seen_at`;
- `last_seen_at`;
- disappearance from the active stack;
- current stack context;
- private fingerprint;
- prior private artifacts;
- approximate publication/expiry window;
- prior/current route and media-class context.

Manual labels, deletions, and operator-supplied story counts are optional test
evidence only and must not become operating dependencies.

The normal operating flow must tolerate:

- zero stories;
- one story;
- multiple stories;
- stories entering while prior stories remain active;
- stories expiring between runs;
- stories expiring during a run;
- several days with no stories;
- random publication times.

## Zero-Story Behavior

If no active stories exist:

- produce a redacted no-op receipt;
- set `activeStoryCount=0`;
- set `storiesDiscovered=0`;
- set `storiesProcessed=0`;
- set `viewerWindowsCaptured=0`;
- perform no viewer work;
- do not classify the run as an error;
- return the dedicated browser window to neutral;
- stop cleanly.

Suggested result:

```text
completed_no_active_stories
```

## Multi-Story Scope

Initial v0 limits:

- maximum stories per run: `5`;
- one bounded viewer-list opening per reachable story;
- initial visible viewer window only;
- no full-list traversal;
- no deep scrolling;
- no story pausing or holding;
- no DMs;
- no Instagram social actions;
- no CRM writes;
- no repeated retries on one inaccessible story.

One inaccessible story must not abort the whole sweep.

Per-story processing status values:

- `processed`
- `skipped_identity_low`
- `skipped_story_entry_inaccessible`
- `skipped_viewer_list_inaccessible`
- `skipped_timing_unsafe`
- `blocked_auth_or_ui`
- `expired_during_run`
- `skipped_run_budget_exhausted`

## Browser Backend Route

For own-story surfaces, use:

- native Computer Use;
- a dedicated standard authenticated Safari window;
- neutral click/keyboard preflight before Instagram;
- Safari Private Browsing forbidden;
- native accessibility actions only;
- no coordinate or screenshot-coordinate navigation;
- no Chrome/`@Chrome` audit when the proven native route passes green;
- cleanup returns the dedicated Safari window to the neutral local page.

Required browser fields:

- `nativePreflightStatus`
- `nativeClickAvailable`
- `nativeKeyboardAvailable`
- `dedicatedBrowserContextUsed`
- `dedicatedBrowserContextType`
- `safariPrivateBrowsingUsed`
- `authenticatedSessionAvailable`
- `intendedInstagramAccountConfirmed`
- `cleanupSafetyStatus`

If the browser route is blocked before story discovery:

- write a redacted blocked receipt;
- do not attempt viewer work;
- do not invoke coordinates, screenshots, Chrome, or manual intervention as
  silent fallbacks.

## Intended Account Context

Use the existing private account-context artifact:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/crm_core_instagram_intended_account_context_v0.json
```

Rules:

- navigate directly to the intended own profile;
- confirm the intended account privately;
- never print the profile URL or handle;
- do not log out;
- do not switch accounts;
- do not enter credentials;
- stop on login/checkpoint/CAPTCHA or account mismatch.

## Story Discovery

The sweep must autonomously determine the active story stack.

It must not require Alejandro to state how many stories exist.

Suggested private fields:

- `active_story_stack_size`
- `story_stack_position`
- `first_seen_at`
- `last_seen_at`
- `story_media_class`
- `story_lifecycle_state`
- `story_private_anchor`
- `story_anchor_confidence`
- `fingerprint_method`
- `prior_artifact_match_status`

Discovery rules:

- start from the first active own story;
- identify each current story privately;
- process at most five;
- never use position alone as story identity;
- combine lifecycle evidence with the proven visual fingerprint route;
- if identity remains low/unknown, skip that story rather than creating a weak
  cross-story frequency edge;
- do not ask Alejandro to label, reorder, delete, or curate stories.

## Story Fingerprint Route

For every newly discovered story:

- use the proven private visual fingerprint strategy;
- select strategy by media class;
- videos use a bounded multi-frame temporal digest;
- static stories may use a matched single-frame fingerprint;
- media class may be `video`, `static_image`, or `unknown`;
- if media class is unknown or the strategy cannot be executed safely, skip the
  story with an explicit status.

For a previously known story:

- reuse the existing private anchor when fingerprint consistency and lifecycle
  evidence agree;
- do not create a new story identity merely because the same story was observed
  in another run;
- classify additional observations as same-story reobservations.

Temporary-image rules:

- raw and derived images remain under `/tmp/` only;
- do not print paths;
- never upload, attach, export, commit, or copy images into Mantis-Reports or the
  private artifact folder;
- delete every raw frame, crop, normalized image, preview, thumbnail, and
  duplicate immediately after digest derivation;
- verify deletion for every temporary file;
- block or skip the affected story if deletion cannot be confirmed;
- never use images for navigation;
- no OCR, story-text extraction, captioning, face/person/object recognition, or
  semantic interpretation.

## Story Traversal

Design a bounded accessibility-only traversal:

- begin with the first active own story;
- identify the current story position privately;
- process the current story;
- use only a safely identifiable native next-story accessibility control;
- maximum one transition attempt per next story;
- no blind keyboard navigation;
- no coordinates;
- no screenshot-coordinate navigation;
- no repeated click loops;
- no pausing or holding;
- if the next-story control is unavailable, record partial success and stop
  traversal;
- do not mark the whole sweep failed when one or more earlier stories succeeded;
- do not ask Alejandro to advance or reorder stories.

Traversal statuses may include:

- `next_story_opened`
- `next_story_control_unavailable`
- `next_story_timing_unsafe`
- `story_expired_before_transition`
- `traversal_budget_exhausted`

## Viewer Capture

For each safely identified story:

- open its viewer list through native accessibility only;
- capture only the initial visible viewer window;
- store viewer handles/anchors only in the private artifact;
- do not print or summarize the viewer list;
- do not scroll or attempt full-list exhaustion;
- do not open profiles or DMs;
- do not react, reply, follow, like, comment, share, archive, label, or mutate;
- close the viewer modal;
- confirm closure before continuing;
- if modal closure cannot be confirmed, stop traversal and keep prior successful
  story results.

Required per-story viewer fields:

- `viewerListOpened`
- `aggregateViewerCount`
- `privateViewerAnchorsCapturedCount`
- `viewerModalCloseStatus`
- `storyViewEdgesCreatedCount`
- `storyViewEdgesUpdatedCount`
- `sameStoryReobservationsCount`
- `crossStoryRepeatClassCounts`

Allowed `viewerModalCloseStatus` values:

- `not_opened`
- `closed_confirmed`
- `close_attempted_not_confirmed`
- `left_open_blocked`
- `manual_recovery_required`

## Story-View Dedupe

Create or update:

```text
story_private_anchor + viewer_private_anchor = one story_view_edge
```

Rules:

- if the edge already exists, update private observation metadata without
  creating another edge;
- repeated captures of the same story do not increase distinct-story frequency;
- the same viewer on distinct story anchors may increase cross-story frequency;
- only medium/high story anchors may contribute;
- low/unknown story anchors remain source-health or private-review evidence
  only;
- inclusive counts such as `2plus` must be distinguished from exact buckets;
- suppression, consent, and outreach gates remain separate from attention.

Suggested private classifications:

- `same_story_reobservation`
- `cross_story_seen_2plus`
- `cross_story_seen_3plus`
- `story_view_streak_candidate`
- `identity_bridge_pending`
- `not_for_outreach`

## Private Artifacts

Store only under:

```text
/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/instagram/
```

Private artifacts may contain:

- sweep run id;
- capture timestamps;
- active story stack map;
- story private anchors;
- lifecycle evidence;
- fingerprint method and confidence;
- private visual digests;
- viewer private anchors;
- deduplicated story-view edges;
- same-story reobservation markers;
- cross-story frequency classes;
- per-story processing status;
- modal close status;
- quality fields;
- blocker classes.

Private artifacts must never be:

- committed;
- pasted into chat;
- copied to Mantis-Reports;
- stored in tracked docs;
- stored in Mantis general memory;
- treated as outreach permission;
- treated as a CRM write.

## Redacted Receipt Fields

Receipts may include only:

- `activeStoryCount`
- `storiesDiscovered`
- `storiesProcessed`
- `storiesSkipped`
- `countsByStoryStatus`
- `storyAnchorConfidenceCounts`
- `viewerWindowsCaptured`
- `privateViewerAnchorsObservedCount`
- `storyViewEdgesCreatedCount`
- `storyViewEdgesUpdatedCount`
- `sameStoryReobservationsCount`
- `crossStoryRepeatedAnchors2plus`
- `crossStoryRepeatedAnchors3plus`
- `storyViewStreakCandidatesCount`
- `fingerprintImagesCreatedCount`
- `fingerprintImagesDeletedConfirmedCount`
- `fingerprintDerivedImagesCreatedCount`
- `fingerprintDerivedImagesDeletedConfirmedCount`
- `viewerModalOpenedCount`
- `viewerModalClosedConfirmedCount`
- `sourceHealthState`
- `qualityGateStatus`
- `partialSuccess`
- `blockers`
- `closedGates`
- `recommendedNextStep`
- private artifact path label only.

Receipts must not include:

- story identities or story anchors;
- viewer identities or viewer lists;
- fingerprints, digests, checksums, or numeric similarity;
- story images or content;
- profile URLs or handles;
- DMs;
- private URLs;
- private browser content;
- tokens, headers, credentials, env values, or secrets.

Redacted receipts must live under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

## Partial-Success Policy

A sweep may be `completed_partial` when:

- at least one story was safely processed;
- another story was skipped, expired, or inaccessible;
- no unsafe fallback or source action occurred;
- all transient images created were deleted and verified;
- every opened viewer modal was either closed confirmed or caused a clean stop.

A partial run is still useful.

A partial run must not:

- trigger immediate repeated retries;
- loop on inaccessible stories;
- ask Alejandro to manually repair the stack;
- inflate viewer frequency;
- become outreach permission.

## Recovery And Time Budget

Initial pilot limits:

- one neutral native preflight;
- one bounded fresh standard-window recovery;
- maximum five stories;
- one story-entry attempt per story;
- one next-story transition attempt per transition;
- one viewer-list open attempt per story;
- one native re-resolve retry only when explicitly safe;
- no infinite refresh or traversal loops;
- maximum UI budget: `5 minutes`;
- stop cleanly after budget exhaustion.

If the budget is exhausted:

- preserve prior successful story results;
- mark remaining stories `skipped_run_budget_exhausted`;
- write a redacted partial receipt;
- return Safari to neutral;
- stop.

## Quality States

### `healthy`

- native preflight green;
- intended account confirmed;
- at least one story safely processed or zero-story no-op completed;
- no unsafe fallback;
- all temporary images deleted and verified;
- all opened viewer modals closed confirmed;
- no Instagram actions.

### `partial`

- at least one story processed;
- one or more stories skipped, inaccessible, expired, or left unprocessed;
- no privacy, deletion, or source-action violation.

### `blocked`

- preflight/auth/account route blocked;
- no safely processable story and not a valid zero-story no-op;
- deletion cannot be confirmed;
- coordinate/screenshot fallback required;
- viewer modal remains in an unsafe state;
- private output would be exposed;
- source or CRM mutation would be required.

## Closed Gates

Remain closed:

- no full viewer-list traversal;
- no deep viewer-list scrolling;
- no DMs;
- no welcome audio;
- no reactions, replies, follows, likes, comments, shares, archives, labels, or
  source settings changes;
- no CRM writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no card writes;
- no Fact Store writes;
- no scoring writes;
- no outreach;
- no source mutation;
- no Launch OS touch;
- no `/Users/alejandrogomez/CRM`.

## Validation Pilot 1 Result

Pilot 1 of 2 completed as `completed_partial` with `qualityGateStatus=green`.
The single-story operational path was proven:

- one story was safely observed and processed;
- one initial visible viewer window was captured;
- eight private viewer anchors were observed;
- eight deduplicated story-view edges were created;
- the viewer modal was opened and close-confirmed;
- one fingerprint image and one derived image were created, deleted, and
  deletion-verified;
- no raw image was retained;
- no Instagram action, DM, CRM/source write, Launch OS touch, private identity
  output, or `/Users/alejandrogomez/CRM` use occurred.

Pilot 1 did not prove complete multi-story traversal. No next-story transition
was attempted because no safe native accessibility next-story control was
available. The observed story count is therefore a lower bound, not a complete
active-story count.

Required story-count result fields:

- `activeStoryCountObserved`
- `activeStoryCountCompleteness`
- `storyStackExhaustionStatus`
- `nextStoryControlAvailability`
- `storyStackTraversalStopReason`

Allowed `activeStoryCountCompleteness` values:

- `complete`
- `lower_bound_only`
- `unknown`

Allowed `storyStackExhaustionStatus` values:

- `proven`
- `not_proven`
- `not_applicable_zero_story`

Allowed `nextStoryControlAvailability` values:

- `available`
- `unavailable`
- `not_needed`
- `unknown`

Story-count completeness rules:

- An observed count must not be presented as the complete active-story count
  unless stack exhaustion or another reliable complete-count signal is proven.
- If one story is observed and no transition is attempted or possible:
  - `activeStoryCountObserved=1`
  - `activeStoryCountCompleteness=lower_bound_only`
  - `storyStackExhaustionStatus=not_proven`
- A zero-story result may be complete only when the own-profile and home-tray
  routes both safely confirm no active story.
- If the next-story control is unavailable, preserve completed story results,
  classify the run partial, and do not infer that the stack contains only one
  story.
- Redacted receipts may report an observed lower bound, never an unsupported
  exact total.

Final-pilot rule:

- Validation pilot 2 of 2 is the final UI validation run for this protocol.
- Pilot 2 may test one bounded accessibility-only next-story transition route.
- If pilot 2 cannot traverse multiple stories safely, record the limitation,
  park multi-story completeness, retain the proven single-story workflow, and
  move CRM Core focus to new-follower detection and welcome-audio automation.
- Do not start a third open-ended UI validation pilot.

## Graduation Criteria

The story-viewer lane is ready for standing ritual design after:

- two successful or acceptable-partial natural runs;
- no manual story labels, deletions, ordering, or active-story-count input
  required;
- zero-story no-op proven;
- multi-story traversal or safe partial traversal proven;
- no coordinates or screenshot-navigation fallback;
- no raw images retained;
- all temporary image deletion verified;
- no Instagram actions;
- story-view dedupe proven;
- private output remains outside chat and tracked docs.

Limit this validation phase to two pilots.

After two pilots:

- close or park remaining imperfections;
- do not continue open-ended UI research;
- move CRM Core focus to new-follower detection and welcome-audio automation.
