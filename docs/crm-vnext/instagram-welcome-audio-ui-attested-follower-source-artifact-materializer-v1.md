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

## Later Live Gate

A later exact mission must separately authorize the live Safari observation,
private fixed-root publication, fresh downstream packet and authority creation,
claim-before-effect boundary, exact audio attachment, one Send, strong
same-thread confirmation, and terminal no-retry ambiguity handling. This
contract alone authorizes none of those actions.
