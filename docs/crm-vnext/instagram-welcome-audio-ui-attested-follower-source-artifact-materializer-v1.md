# Instagram Welcome Audio UI-Attested Follower Source Artifact Materializer v1

Date: 2026-07-17

Status: repo-only implementation; no live or source authority

## Purpose

This contract closes one missing local edge in the existing UI-attested welcome
audio rail. It converts one already observed, exact private Safari/Computer Use
observation into the existing `ui_attested_follower_source_v1` input, validates
that input with the integrated adapter, and publishes one immutable owner-only
source artifact.

It does not parse a screenshot, accessibility tree, OCR payload, or raw browser
state. The Computer Use operator keeps those values private and supplies only
the closed facts required by this contract in the same private process. The
module performs no browser or network action.

Exact schema labels:

- contract:
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_materializer_v1`;
- private observation:
  `crm_core_instagram_welcome_audio_ui_attested_private_observation_v1`;
- artifact:
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_v1`;
- redacted receipt:
  `crm_core_instagram_welcome_audio_ui_attested_follower_source_artifact_receipt_v1`.

## Closed Private Observation

The materializer accepts exactly one closed plain-data record containing:

- one mission identifier and ordinal in the inclusive range `1..8`;
- one exact target identity preserved byte-for-byte;
- one visible relative-time bucket preserved byte-for-byte;
- ordered observation times for notification, profile, thread, owner, and
  dedupe, all no later than the module-owned validation time and no older than
  five minutes;
- one exact thread reference and one exact owner-account reference;
- one of the two already integrated relationship modes;
- explicit true facts for notification-row observation, exact notification to
  profile binding, exact profile identity, exact relationship evidence, exact
  profile to thread binding, exact owner binding, absence of contradictory
  relationship evidence, absence of a prior welcome, and absence of a prior
  send attempt.

The accepted relationship modes are:

- `current_visible_follows_owner`; or
- `recent_follow_event_no_explicit_contradiction_3_to_7_day_bucket`.

The second mode remains valid only for the closed catch-up bucket grammar in
the integrated follower-source adapter. The materializer does not widen or
reinterpret that grammar.

Accessors, proxies, extra fields, false evidence flags, out-of-order times,
future or stale times, unsupported relationship modes, ambiguous identities,
and invalid buckets block before publication.

## Exact Translation

The materializer constructs the existing adapter input internally. It does not
accept a caller-created projection. It fixes the existing exact evidence labels
for notification, profile, thread, owner, and dedupe, preserves identity and
references without normalization, and fixes these three non-claims false:

- `exact_follow_timestamp_claimed=false`;
- `provider_event_id_claimed=false`;
- `campaign_membership_claimed=false`.

The integrated `adaptWelcomeAudioUiAttestedFollowerSource` function must return
`ui_attested_source_ready`. The resulting projection must validate, and its
source-evidence digest is bound into the private artifact. A blocked adapter
result cannot be published.

## Owner-Only Artifact

The fixed private root is a dedicated sibling beneath the approved Instagram
private-source hierarchy. It is distinct from every live-authority, claim,
PENDING, terminal, and audio root. The fixed publisher owns its path and clock;
the caller supplies neither.

The root is canonical, owner-controlled, non-symlink, and mode `0700`. The one
artifact is a regular owner-owned file with mode `0600` and `nlink=1`. The
publisher uses an exclusive `O_NOFOLLOW` temporary file, file `fsync`, an
exclusive same-filesystem hard-link publication barrier, directory `fsync`,
and stable byte-for-byte reread. It never overwrites a different artifact.

Non-regular targets are rejected before a blocking open, and the final read
uses `O_NOFOLLOW|O_NONBLOCK` plus path/handle identity checks. If two identical
publishers race, exactly one publishes and the other may reuse only the stable,
byte-identical winner after a bounded link settle, directory `fsync`, and root
identity revalidation. A conflicting winner remains a target conflict.
Root preflight recognizes only bounded, strictly named, owner-only module
temporaries on the unchanged root and waits only for the capped settle window;
arbitrary, malformed, excessive, or stale entries fail closed.
Directory durability reopens the root with `O_NOFOLLOW|O_NONBLOCK`, verifies
the opened directory identity before `fsync`, and then rechecks the path. A
losing concurrent publisher removes its own temporary link before that durable
reuse check, so a successful receipt leaves exactly the final artifact entry.

An existing artifact may be reused only when it is stable and its canonical
bytes are identical to the newly validated artifact. A different, malformed,
hard-linked, unstable, or stale artifact blocks.

Synthetic tests use only owner-only temporary roots directly beneath the
operating-system temporary root. Importing the module performs no I/O.

## Downstream Boundary

The artifact contains the exact `ui_attested_input` accepted by the existing
canary packet materializer. A private caller may pass that input unchanged to
`materializeWelcomeAudioUiAttestedCanaryPacketDraft`; the downstream result
remains `prepared_no_live_unapproved` until every separate live gate is
revalidated.

The source artifact is evidence, not execution authority. It cannot be renamed,
promoted, or interpreted as a live approval, claim, PENDING record, upload
permit, or Send token.

## Redacted Receipt

The public receipt contains only schema labels, decision, count/cap, booleans,
fixed false live/effect flags, and one stable blocker code. It never contains
identity, bucket text, time, path, digest, anchor, OCR, screenshot, accessibility
text, message, credential, token, or raw payload.

Exact decisions:

- `published_owner_only_source_artifact`;
- `reused_exact_owner_only_source_artifact`;
- `blocked_owner_only_source_artifact`.

Decision flags form an exact truth table: published means only
`artifact_published=true`; reused means only
`existing_artifact_reused=true`; blocked means count zero, both publication
flags false, and `artifact_stability_verified=false`.
For blocked decisions, the five aggregate progress milestones are additionally
bound to the exact blocker code's reachable states; an early input or
observation blocker cannot claim later adapter, evidence, or root progress.

## Non-Effects

This materializer grants no authority for Safari, Instagram, Computer Use,
source acquisition, profile or thread opening, a real candidate, live
authority, claim, PENDING, attachment, upload, Send, text, follow-back,
MailerLite, CRM, campaign, Ads, API, proxy, browser, network, or any external
effect.

Every receipt fixes `live_authority=false`, `claim_issued=false`,
`pending_effect_recorded=false`, `send_allowed=false`, `browser_used=false`,
`network_used=false`, and `external_effect_invoked=false` for the materializer
invocation itself.

## Controlling IAB Semantic Artifact v3 Extension — 2026-07-19

The productive provenance route is now the separately versioned IAB semantic
artifact v3. The v1/v2 observation route above remains compatibility-only and
cannot issue the capability admitted by the v3 canary chain.

Exact v3 labels are:

- contract:
  `crm_core_instagram_welcome_audio_iab_semantic_follower_source_artifact_materializer_v3`;
- artifact:
  `crm_core_instagram_welcome_audio_iab_semantic_follower_source_artifact_v3`;
- receipt:
  `crm_core_instagram_welcome_audio_iab_semantic_follower_source_artifact_receipt_v3`;
- fixed filename: `iab-semantic-follower-source-v3.json`; and
- a dedicated fixed root ending in
  `crm-core-welcome-audio-iab-semantic-follower-source-artifact-v3`.

### Capability-Only Productive Input

`publishFixedWelcomeAudioIabSemanticFollowerSourceArtifactV3` accepts exactly
`private_complete_source_capability`. It calls only
`consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnce` and never accepts
caller-provided identity, notification, profile, thread, owner, UI bucket,
dedupe, time, reference, selector, URL, driver, or truth boolean.

The host capability is burned before v3 validation or filesystem publication.
Replay, clone, foreign-module capability, stale source, malformed payload, or a
later publication failure cannot restore it. The accepted host payload must
preserve all 25 exact source fields, including exact notification/profile,
profile/thread and owner bindings; `preopen_unread_inbound=explicit_none`;
`seen_transition=absent`; no prior audio or attempt; clear dedupe; visible
composer; usable attachment control; no challenge; and exactly-once isolated
tab finalization.

The materializer derives the existing immutable UI-attested adapter input
itself and stores both the complete source and that derived input. It does not
accept a caller-created adapter input or projection. The artifact keeps the
host's exact `source_expires_at`. The expiry must remain exactly five minutes
after `source_observed_at`; publication, reuse, open, and downstream
materialization never renew it.

Persisted v3 bytes are revalidated against the exact host provenance grammar,
not merely the weaker fields projected into the compatibility adapter. The
target must remain an exact Instagram handle, the visible relative-time bucket
must remain inside the approved 3-to-7-day forms, each notification, profile,
thread, and owner reference must remain a bounded private reference, and all
four references must be globally distinct. This validation applies equally at
initial materialization, stable reopen, and capability consumption. No new
digest or caller-provided provenance field is introduced; the v3 payload shape
remains unchanged.

### Owner-Only v3 Publication and Open

The v3 fixed root is separate from the v2 artifact, live authority, claim,
PENDING, terminal, and audio roots. Its directory must be canonical,
owner-controlled, non-symlink `0700`. The artifact must be an owner-owned,
single-link regular `0600` file. Publication uses an exclusive
`O_NOFOLLOW` temporary file, file `fsync`, same-filesystem hard-link
no-overwrite barrier, directory `fsync`, stable path/handle identity checks,
bounded concurrent-winner settling, and exact byte reread. A different winner,
malformed target, unsafe temporary, extra entry, link, FIFO, directory, stale
artifact, or changed root fails closed.

`openFixedWelcomeAudioIabSemanticFollowerSourceArtifactV3` owns root and clock.
It may open only the exact stable v3 artifact while the inherited source expiry
is still live. Fixed publish/open issue an opaque WeakMap-backed private source
artifact capability. Synthetic roots and clocks are available only through
the exact `...ForTest` exports.

`consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnce` accepts
exactly `{ private_source_artifact_capability }`. It burns authority before
expiry and artifact validation and returns the private artifact only once.
Serialization, cloning, replay, foreign capability, stale expiry, or cross
module use yields no artifact.

Synthetic and productive capability modes are intentionally disjoint. The
productive consumer burns and rejects a synthetic capability. Only
`consumeWelcomeAudioIabSemanticFollowerSourceArtifactCapabilityOnceForTest`
may consume a synthetic v3 capability, and it burns and rejects productive
capabilities. A capability rejected at the wrong mode cannot later be retried
through the other consumer.

The same split begins at host ingestion. The synthetic publisher calls only
`consumeWelcomeAudioIabSemanticCompleteSourceCapabilityOnceForTest`; the fixed
publisher calls only the productive host consumer. Neither path may consume a
complete-source capability issued in the other mode. Artifact capabilities
also contain only a payload-free clone guard: `structuredClone` and JSON
serialization fail without revealing the private artifact.

### v3 Aggregate Receipt

The v3 receipt reports only closed decisions and progress booleans. It never
contains identity, references, source time or expiry, bucket text, paths,
digests, screenshots, DOM, messages, credentials, or payloads. Successful
publish, exact reuse, and exact open each issue one capability; blocked results
issue none. Every result keeps all live, claim, pending, send, browser, network,
and external-effect flags false.

Every receipt also carries the mandatory aggregate operation
`materialize|open`. A successful publish or reuse is valid only for
`operation=materialize`; a successful reopen is valid only for
`operation=open`. Blocked receipts are checked against separate operation-aware
milestone matrices in the fixed order: complete-source capability consumed,
complete source validated, source expiry inherited, owner-only root verified,
and stable artifact bytes verified. A blocker cannot claim a milestone that its
operation could not have reached, and a later blocker cannot erase a milestone
already completed.

The open path accumulates those milestones before each fallible step and returns
the accumulated state from its catch boundary. In particular, invalid persisted
bytes found after a stable owner-only read preserve root and stability progress
while keeping complete-source validation, inherited-expiry confirmation, and
capability issuance false. Root failures before and after root verification are
distinguished by their truthful reachable milestone signature without exposing
any private path or reference.

## Later Live Gate

A later exact mission must separately authorize the live Safari observation,
private fixed-root publication, fresh downstream packet and authority creation,
claim-before-effect boundary, exact audio attachment, one Send, strong
same-thread confirmation, and terminal no-retry ambiguity handling. This
contract alone authorizes none of those actions.
